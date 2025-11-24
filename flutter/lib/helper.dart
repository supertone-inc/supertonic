import 'dart:io';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_onnxruntime/flutter_onnxruntime.dart';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

final logger = Logger(
  printer: PrettyPrinter(methodCount: 0, errorMethodCount: 5, lineLength: 80),
);

class UnicodeProcessor {
  final Map<int, int> indexer;

  UnicodeProcessor._(this.indexer);

  static Future<UnicodeProcessor> load(String path) async {
    final json = jsonDecode(await rootBundle.loadString(path));

    final indexer = json is List
        ? {
            for (var i = 0; i < json.length; i++)
              if (json[i] is int && json[i] >= 0) i: json[i] as int
          }
        : (json as Map<String, dynamic>)
            .map((k, v) => MapEntry(int.parse(k), v as int));

    return UnicodeProcessor._(indexer);
  }

  // This function takes a list of input strings (sentences) and converts
  // them into numeric tensors required by the ONNX TTS model.
  // It returns a map containing 'textIds' and 'textMask'.
  // 'textIds' is a 2D list where each row corresponds to a sentence
  // represented as a sequence of integer IDs based on the Unicode indexer.
  // 'textMask' is a 3D list that indicates the valid lengths of each
  // sentence for masking purposes during model inference.
  Map<String, dynamic> call(List<String> textList) {
    final lengths = textList.map((t) => t.length).toList();
    final maxLen = lengths.reduce(math.max);

    final textIds = textList.map((text) {
      final row = List<int>.filled(maxLen, 0);
      final runes = text.runes.toList();
      for (var i = 0; i < runes.length; i++) {
        row[i] = indexer[runes[i]] ?? 0;
      }
      return row;
    }).toList();

    return {'textIds': textIds, 'textMask': _lengthToMask(lengths)};
  }

  List<List<List<double>>> _lengthToMask(List<int> lengths, [int? maxLen]) {
    maxLen ??= lengths.reduce(math.max);
    return lengths
        .map((len) => [List.generate(maxLen!, (i) => i < len ? 1.0 : 0.0)])
        .toList();
  }
}

class Style {
  final OrtValue ttl, dp;
  final List<int> ttlShape, dpShape;
  Style(this.ttl, this.dp, this.ttlShape, this.dpShape);
}

class TextToSpeech {
  final Map<String, dynamic> cfgs;
  final UnicodeProcessor textProcessor;
  final OrtSession dpOrt, textEncOrt, vectorEstOrt, vocoderOrt;
  final int sampleRate, baseChunkSize, chunkCompressFactor, ldim;

  TextToSpeech(this.cfgs, this.textProcessor, this.dpOrt, this.textEncOrt,
      this.vectorEstOrt, this.vocoderOrt)
      : sampleRate = cfgs['ae']['sample_rate'],
        baseChunkSize = cfgs['ae']['base_chunk_size'],
        chunkCompressFactor = cfgs['ttl']['chunk_compress_factor'],
        ldim = cfgs['ttl']['latent_dim'];

  Future<Map<String, dynamic>> call(String text, Style style, int totalStep,
      {double speed = 1.05, double silenceDuration = 0.3}) async {
    final chunks = _chunkText(text);
    List<double>? wavCat;
    double durCat = 0;

    for (final chunk in chunks) {
      final result = await _infer([chunk], style, totalStep, speed: speed);
      final wav = List<double>.from(result['wav']);
      final duration = List<double>.from(result['duration']);

      if (wavCat == null) {
        wavCat = wav;
        durCat = duration[0];
      } else {
        wavCat = [
          ...wavCat,
          ...List<double>.filled((silenceDuration * sampleRate).floor(), 0.0),
          ...wav
        ];
        durCat += duration[0] + silenceDuration;
      }
    }

    return {
      'wav': wavCat,
      'duration': [durCat]
    };
  }

  Future<Map<String, dynamic>> _infer(
      List<String> textList, Style style, int totalStep,
      {double speed = 1.05}) async {
    final bsz = textList.length;
    final result = textProcessor.call(textList);

    final List<List<int>> textIds = result['textIds'];
    final List<List<List<double>>> textMask = result['textMask'];

    final textIdsShape = [bsz, textIds[0].length];
    final textMaskShape = [bsz, 1, textMask[0][0].length];
    final textMaskTensor = await _toTensor(textMask, textMaskShape);

    final dpResult = await dpOrt.run({
      'text_ids': await _intToTensor(textIds, textIdsShape),
      'style_dp': style.dp,
      'text_mask': textMaskTensor,
    });
    final durOnnx = List<double>.from(await dpResult.values.first.asList());
    final scaledDur = durOnnx.map((d) => d / speed).toList();

    final textEncResult = await textEncOrt.run({
      'text_ids': await _intToTensor(textIds, textIdsShape),
      'style_ttl': style.ttl,
      'text_mask': textMaskTensor,
    });

    final latentData = _sampleNoisyLatent(scaledDur);
    final List<List<List<double>>> noisyLatent = latentData['noisyLatent'];
    final List<List<List<double>>> latentMask = latentData['latentMask'];

    final latentShape = [bsz, noisyLatent[0].length, noisyLatent[0][0].length];
    final latentMaskTensor =
        await _toTensor(latentMask, [bsz, 1, latentMask[0][0].length]);

    final totalStepTensor =
        await _scalarToTensor(List.filled(bsz, totalStep.toDouble()), [bsz]);

    // Denoising loop
    for (var step = 0; step < totalStep; step++) {
      final result = await vectorEstOrt.run({
        'noisy_latent': await _toTensor(noisyLatent, latentShape),
        'text_emb': textEncResult.values.first,
        'style_ttl': style.ttl,
        'text_mask': textMaskTensor,
        'latent_mask': latentMaskTensor,
        'total_step': totalStepTensor,
        'current_step':
            await _scalarToTensor(List.filled(bsz, step.toDouble()), [bsz]),
      });

      final denoised = _safeCast<double>(await result.values.first.asList());
      var idx = 0;
      for (var b = 0; b < noisyLatent.length; b++) {
        for (var d = 0; d < noisyLatent[b].length; d++) {
          for (var t = 0; t < noisyLatent[b][d].length; t++) {
            noisyLatent[b][d][t] = denoised[idx++];
          }
        }
      }
    }

    final vocoderResult = await vocoderOrt
        .run({'latent': await _toTensor(noisyLatent, latentShape)});
    final wav = _safeCast<double>(await vocoderResult.values.first.asList());

    return {'wav': wav, 'duration': scaledDur};
  }

  Map<String, dynamic> _sampleNoisyLatent(List<double> duration) {
    final wavLenMax = duration.reduce(math.max) * sampleRate;
    final wavLengths = duration.map((d) => (d * sampleRate).floor()).toList();
    final chunkSize = baseChunkSize * chunkCompressFactor;
    final latentLen = ((wavLenMax + chunkSize - 1) / chunkSize).floor();
    final latentDim = ldim * chunkCompressFactor;

    final random = math.Random();
    final noisyLatent = List.generate(
      duration.length,
      (_) => List.generate(
        latentDim,
        (_) => List.generate(latentLen, (_) {
          final u1 = math.max(1e-10, random.nextDouble());
          final u2 = random.nextDouble();
          return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2);
        }),
      ),
    );

    final latentMask = _getLatentMask(wavLengths);

    for (var b = 0; b < noisyLatent.length; b++) {
      for (var d = 0; d < noisyLatent[b].length; d++) {
        for (var t = 0; t < noisyLatent[b][d].length; t++) {
          noisyLatent[b][d][t] *= latentMask[b][0][t];
        }
      }
    }

    return {'noisyLatent': noisyLatent, 'latentMask': latentMask};
  }

  List<List<List<double>>> _getLatentMask(List<int> wavLengths) {
    final latentSize = baseChunkSize * chunkCompressFactor;
    final latentLengths = wavLengths
        .map((len) => ((len + latentSize - 1) / latentSize).floor())
        .toList();
    final maxLen = latentLengths.reduce(math.max);
    return latentLengths
        .map((len) => [List.generate(maxLen, (i) => i < len ? 1.0 : 0.0)])
        .toList();
  }

  List<String> _chunkText(String text, {int maxLen = 300}) {
    final paragraphs = text
        .trim()
        .split(RegExp(r'\n\s*\n+'))
        .where((p) => p.trim().isNotEmpty)
        .toList();

    final chunks = <String>[];
    for (var paragraph in paragraphs) {
      paragraph = paragraph.trim();
      if (paragraph.isEmpty) continue;

      final sentences = paragraph.split(RegExp(
          r'(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+'));

      var currentChunk = '';
      for (final sentence in sentences) {
        if (currentChunk.length + sentence.length + 1 <= maxLen) {
          currentChunk += (currentChunk.isNotEmpty ? ' ' : '') + sentence;
        } else {
          if (currentChunk.isNotEmpty) chunks.add(currentChunk.trim());
          currentChunk = sentence;
        }
      }
      if (currentChunk.isNotEmpty) chunks.add(currentChunk.trim());
    }

    return chunks;
  }

  List<T> _safeCast<T>(dynamic raw) {
    if (raw is List<T>) return raw;
    if (raw is List) {
      if (raw.isNotEmpty && raw.first is List) {
        return _flattenList<T>(raw);
      }
      if (T == double) {
        return raw
            .map((e) => e is num ? e.toDouble() : double.parse(e.toString()))
            .toList() as List<T>;
      }
      return raw.cast<T>();
    }
    throw Exception('Cannot convert $raw to List<$T>');
  }

  List<T> _flattenList<T>(dynamic list) {
    if (list is List) {
      return list.expand((e) => _flattenList<T>(e)).toList();
    }
    if (T == double && list is num) {
      return [list.toDouble()] as List<T>;
    }
    return [list as T];
  }

  Future<OrtValue> _toTensor(dynamic array, List<int> dims) async {
    final flat = _flattenList<double>(array);
    return await OrtValue.fromList(Float32List.fromList(flat), dims);
  }

  Future<OrtValue> _scalarToTensor(List<double> array, List<int> dims) async {
    return await OrtValue.fromList(Float32List.fromList(array), dims);
  }

  Future<OrtValue> _intToTensor(List<List<int>> array, List<int> dims) async {
    final flat = array.expand((row) => row).toList();
    return await OrtValue.fromList(Int64List.fromList(flat), dims);
  }
}

List<double> _flattenToDouble(dynamic list) {
  if (list is List) return list.expand((e) => _flattenToDouble(e)).toList();
  return [list is num ? list.toDouble() : double.parse(list.toString())];
}

Future<Map<String, dynamic>> _loadCfgs(String onnxDir) async {
  final path = p.join(onnxDir, 'tts.json');
  final json = jsonDecode(await rootBundle.loadString(path));
  return json as Map<String, dynamic>;
}

Future<String> copyModelToFile(String path) async {
  final byteData = await rootBundle.load(path);
  final tempDir = await getApplicationCacheDirectory();
  final modelPath = p.join(tempDir.path, path.split(p.separator).last);

  final file = File(modelPath);
  await file.writeAsBytes(byteData.buffer.asUint8List());
  return modelPath;
}

Future<Map<String, OrtSession>> _loadOnnxAll(String dir) async {
  final ort = OnnxRuntime();
  final models = [
    'duration_predictor',
    'text_encoder',
    'vector_estimator',
    'vocoder'
  ];

  final sessions = await Future.wait(models.map((name) async {
    final modelPath = p.join(dir, '$name.onnx');
    final path = await copyModelToFile(modelPath);
    logger.d('Loading $name.onnx');
    return ort.createSessionFromAsset(path);
  }));

  return {
    'dpOrt': sessions[0],
    'textEncOrt': sessions[1],
    'vectorEstOrt': sessions[2],
    'vocoderOrt': sessions[3],
  };
}

void writeWavFile(String filename, List<double> audioData, int sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  final dataSize = audioData.length * 2;

  final buffer = ByteData(44 + dataSize);
  var offset = 0;

  // RIFF header
  for (var byte in [0x52, 0x49, 0x46, 0x46]) {
    buffer.setUint8(offset++, byte);
  }
  buffer.setUint32(offset, 36 + dataSize, Endian.little);
  offset += 4;

  // WAVE
  for (var byte in [0x57, 0x41, 0x56, 0x45]) {
    buffer.setUint8(offset++, byte);
  }

  // fmt chunk
  for (var byte in [0x66, 0x6D, 0x74, 0x20]) {
    buffer.setUint8(offset++, byte);
  }
  buffer.setUint32(offset, 16, Endian.little);
  offset += 4;
  buffer.setUint16(offset, 1, Endian.little);
  offset += 2;
  buffer.setUint16(offset, numChannels, Endian.little);
  offset += 2;
  buffer.setUint32(offset, sampleRate, Endian.little);
  offset += 4;
  buffer.setUint32(offset, sampleRate * numChannels * 2, Endian.little);
  offset += 4;
  buffer.setUint16(offset, numChannels * 2, Endian.little);
  offset += 2;
  buffer.setUint16(offset, bitsPerSample, Endian.little);
  offset += 2;

  // data chunk
  for (var byte in [0x64, 0x61, 0x74, 0x61]) {
    buffer.setUint8(offset++, byte);
  }
  buffer.setUint32(offset, dataSize, Endian.little);
  offset += 4;

  // Write audio samples
  for (var i = 0; i < audioData.length; i++) {
    final sample = (audioData[i].clamp(-1.0, 1.0) * 32767).round();
    buffer.setInt16(offset + i * 2, sample, Endian.little);
  }

  File(filename).writeAsBytesSync(buffer.buffer.asUint8List());
}

Future<TextToSpeech> loadTextToSpeech(String onnxDir,
    {bool useGpu = false}) async {
  if (useGpu) throw Exception('GPU mode not supported yet');

  logger.i('Loading TTS models from $onnxDir');

  final cfgs = await _loadCfgs(onnxDir);
  final sessions = await _loadOnnxAll(onnxDir);
  final path = p.join(onnxDir, 'unicode_indexer.json');
  final textProcessor = await UnicodeProcessor.load(path);

  logger.i('TTS models loaded successfully');

  return TextToSpeech(
    cfgs,
    textProcessor,
    sessions['dpOrt']!,
    sessions['textEncOrt']!,
    sessions['vectorEstOrt']!,
    sessions['vocoderOrt']!,
  );
}

Future<Style> loadVoiceStyle(List<String> paths) async {
  final bsz = paths.length;

  final firstJson = jsonDecode(
    paths[0].startsWith('assets/')
        ? await rootBundle.loadString(paths[0])
        : File(paths[0]).readAsStringSync(),
  );

  final ttlDims = List<int>.from(firstJson['style_ttl']['dims']);
  final dpDims = List<int>.from(firstJson['style_dp']['dims']);

  final ttlFlat = Float32List(bsz * ttlDims[1] * ttlDims[2]);
  final dpFlat = Float32List(bsz * dpDims[1] * dpDims[2]);

  for (var i = 0; i < bsz; i++) {
    final json = jsonDecode(
      paths[i].startsWith('assets/')
          ? await rootBundle.loadString(paths[i])
          : File(paths[i]).readAsStringSync(),
    );

    final ttlData = _flattenToDouble(json['style_ttl']['data']);
    final dpData = _flattenToDouble(json['style_dp']['data']);

    ttlFlat.setRange(i * ttlDims[1] * ttlDims[2],
        (i + 1) * ttlDims[1] * ttlDims[2], ttlData);
    dpFlat.setRange(
        i * dpDims[1] * dpDims[2], (i + 1) * dpDims[1] * dpDims[2], dpData);
  }

  final ttlShape = [bsz, ttlDims[1], ttlDims[2]];
  final dpShape = [bsz, dpDims[1], dpDims[2]];

  return Style(
    await OrtValue.fromList(ttlFlat, ttlShape),
    await OrtValue.fromList(dpFlat, dpShape),
    ttlShape,
    dpShape,
  );
}
