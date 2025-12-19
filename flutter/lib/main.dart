import 'dart:io';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_sdk/helper.dart';
import 'package:path/path.dart' as p;

void main() {
  runApp(const SupertonicApp());
}

class SupertonicApp extends StatelessWidget {
  const SupertonicApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Supertonic',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const TTSPage(),
    );
  }
}

class TTSPage extends StatefulWidget {
  const TTSPage({super.key});

  @override
  State<TTSPage> createState() => _TTSPageState();
}

class _TTSPageState extends State<TTSPage> {
  final TextEditingController _textController = TextEditingController(
    text: 'Hello, this is a text to speech example.',
  );
  final AudioPlayer _audioPlayer = AudioPlayer();

  TextToSpeech? _textToSpeech;
  Style? _style;
  bool _isLoading = false;
  bool _isGenerating = false;
  String _status = 'Not initialized';
  int _totalSteps = 5;
  double _speed = 1.05;
  bool _isPlaying = false;
  String? _lastGeneratedFilePath;

  @override
  void initState() {
    super.initState();
    _loadModels();
    _setupAudioPlayerListeners();
  }

  void _setupAudioPlayerListeners() {
    _audioPlayer.playerStateStream.listen((state) {
      if (!mounted) return;

      setState(() {
        _isPlaying = state.playing;

        if (state.processingState == ProcessingState.completed) {
          _isPlaying = false;
          _status = 'Ready';
        } else if (state.processingState == ProcessingState.loading) {
          _status = 'Loading audio...';
        } else if (state.processingState == ProcessingState.buffering) {
          _status = 'Buffering...';
        }
      });
    });
  }

  Future<void> _loadModels() async {
    setState(() {
      _isLoading = true;
      _status = 'Loading models...';
    });

    try {
      final onnxPath = p.join('assets', 'onnx');
      final stylePath = p.join('assets', 'voice_styles', 'M1.json');
      _textToSpeech = await loadTextToSpeech(onnxPath, useGpu: false);
      _style = await loadVoiceStyle([stylePath]);

      setState(() {
        _isLoading = false;
        _status = 'Ready';
      });
    } catch (e, stackTrace) {
      logger.e('Error loading models', error: e, stackTrace: stackTrace);
      setState(() {
        _isLoading = false;
        _status = 'Error: $e';
      });
    }
  }

  Future<void> _generateSpeech() async {
    if (_textToSpeech == null || _style == null) {
      setState(() => _status = 'Models not loaded yet');
      return;
    }

    if (_textController.text.trim().isEmpty) {
      setState(() => _status = 'Please enter some text');
      return;
    }

    setState(() {
      _isGenerating = true;
      _status = 'Generating speech...';
    });

    List<double>? wav;
    List<double>? duration;

    // Step 1: Generate speech
    try {
      final result = await _textToSpeech!.call(
        _textController.text,
        _style!,
        _totalSteps,
        speed: _speed,
      );

      wav = result['wav'] is List<double>
          ? result['wav']
          : (result['wav'] as List).cast<double>();
      duration = result['duration'] is List<double>
          ? result['duration']
          : (result['duration'] as List).cast<double>();
    } catch (e, stacktrace) {
      // print stacktrace
      logger.e('Error generating speech', error: e, stackTrace: stacktrace);
      setState(() {
        _isGenerating = false;
        _status = 'Error generating speech: $e';
      });
      return;
    }

    // Step 2: Save to file and play
    try {
      final tempDir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final outputPath = '${tempDir.path}/speech_$timestamp.wav';

      writeWavFile(outputPath, wav!, _textToSpeech!.sampleRate);

      final file = File(outputPath);
      if (!file.existsSync()) {
        throw Exception('Failed to create WAV file');
      }

      final absolutePath = file.absolute.path;

      setState(() {
        _isGenerating = false;
        _status = 'Playing ${duration![0].toStringAsFixed(2)}s of audio...';
        _lastGeneratedFilePath = absolutePath;
      });

      logger.i('Audio saved to $absolutePath');

      final uri = Uri.file(absolutePath);
      await _audioPlayer.setAudioSource(AudioSource.uri(uri));
      await _audioPlayer.play();
    } catch (e) {
      logger.e('Error playing audio', error: e);
      setState(() {
        _isGenerating = false;
        _status = 'Error playing audio: $e';
      });
    }
  }

  Future<void> _downloadFile() async {
    if (_lastGeneratedFilePath == null) return;

    try {
      final sourceFile = File(_lastGeneratedFilePath!);
      if (!sourceFile.existsSync()) {
        setState(() => _status = 'Error: File no longer exists');
        return;
      }

      final downloadsDir = await getDownloadsDirectory();
      if (downloadsDir == null) {
        setState(() => _status = 'Error: Could not access downloads folder');
        return;
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final downloadPath = p.join(downloadsDir.path, 'speech_$timestamp.wav');

      await sourceFile.copy(downloadPath);
      logger.i('File saved to $downloadPath');

      setState(() => _status = 'File saved to: $downloadPath');
    } catch (e) {
      logger.e('Error downloading file', error: e);
      setState(() => _status = 'Error downloading file: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: const Text('Supertonic'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status indicator
            Card(
              color: _isLoading || _isGenerating
                  ? Colors.orange.shade100
                  : _status.startsWith('Error')
                      ? Colors.red.shade100
                      : Colors.green.shade100,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    if (_isLoading || _isGenerating)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    if (_isLoading || _isGenerating) const SizedBox(width: 12),
                    Expanded(
                      child:
                          Text(_status, style: const TextStyle(fontSize: 16)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Text input
            TextField(
              controller: _textController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Text to synthesize',
                border: OutlineInputBorder(),
                hintText: 'Enter the text you want to convert to speech...',
              ),
              enabled: !_isLoading && !_isGenerating,
            ),
            const SizedBox(height: 24),

            // Parameters
            Text('Parameters', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),

            // Denoising steps slider
            Row(
              children: [
                const Expanded(flex: 2, child: Text('Denoising Steps:')),
                Expanded(
                  flex: 3,
                  child: Slider(
                    value: _totalSteps.toDouble(),
                    min: 1,
                    max: 20,
                    divisions: 19,
                    label: _totalSteps.toString(),
                    onChanged: _isLoading || _isGenerating
                        ? null
                        : (value) =>
                            setState(() => _totalSteps = value.toInt()),
                  ),
                ),
                SizedBox(
                  width: 40,
                  child:
                      Text(_totalSteps.toString(), textAlign: TextAlign.right),
                ),
              ],
            ),

            // Speed slider
            Row(
              children: [
                const Expanded(flex: 2, child: Text('Speed:')),
                Expanded(
                  flex: 3,
                  child: Slider(
                    value: _speed,
                    min: 0.5,
                    max: 2.0,
                    divisions: 30,
                    label: _speed.toStringAsFixed(2),
                    onChanged: _isLoading || _isGenerating
                        ? null
                        : (value) => setState(() => _speed = value),
                  ),
                ),
                SizedBox(
                  width: 40,
                  child: Text(_speed.toStringAsFixed(2),
                      textAlign: TextAlign.right),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Generate button
            ElevatedButton.icon(
              onPressed: _isLoading || _isGenerating
                  ? null
                  : _isPlaying
                      ? () async {
                          await _audioPlayer.stop();
                          setState(() => _status = 'Ready');
                        }
                      : _generateSpeech,
              icon: Icon(_isPlaying ? Icons.stop : Icons.play_arrow),
              label: Text(
                _isGenerating
                    ? 'Generating...'
                    : _isPlaying
                        ? 'Stop Playback'
                        : 'Generate & Play Speech',
                style: const TextStyle(fontSize: 16),
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),

            // Download button
            if (_lastGeneratedFilePath != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _isLoading || _isGenerating ? null : _downloadFile,
                icon: const Icon(Icons.download),
                label: const Text('Download WAV File',
                    style: TextStyle(fontSize: 16)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
}
