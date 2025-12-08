import 'dart:async';
import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/scheduler.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_sdk/helper.dart';

void main() {
  runApp(const SupertonicApp());
}

class SupertonicApp extends StatelessWidget {
  const SupertonicApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const CupertinoApp(
      title: 'Supertonic',
      theme: CupertinoThemeData(
        brightness: Brightness.light,
        primaryColor: CupertinoColors.systemPurple,
        scaffoldBackgroundColor: CupertinoColors.systemGroupedBackground,
      ),
      home: TTSPage(),
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

  final List<String> _voiceStyles = ['M1', 'M2', 'F1', 'F2'];
  String _selectedVoiceStyle = 'M1';

  TextToSpeech? _textToSpeech;
  Style? _style;
  bool _isLoading = false;
  bool _isGenerating = false;
  String _status = 'Not initialized';
  int _totalSteps = 5;
  double _speed = 1.05;
  bool _isPlaying = false;
  String? _lastGeneratedFilePath;

  // Stream subscription to properly cancel on dispose
  StreamSubscription<PlayerState>? _playerStateSubscription;

  @override
  void initState() {
    super.initState();
    _setupAudioPlayerListeners();
    // Defer heavy model loading until after first frame renders
    // This prevents UI jank during app startup
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _loadModels();
    });
  }

  void _setupAudioPlayerListeners() {
    _playerStateSubscription = _audioPlayer.playerStateStream.listen(
      (state) {
        if (!mounted) return;

        // Only update state if values actually changed to reduce rebuilds
        final newIsPlaying =
            state.playing && state.processingState != ProcessingState.completed;

        String? newStatus;
        if (state.processingState == ProcessingState.completed) {
          newStatus = 'Ready';
        } else if (state.processingState == ProcessingState.loading) {
          newStatus = 'Loading audio...';
        } else if (state.processingState == ProcessingState.buffering) {
          newStatus = 'Buffering...';
        }

        // Batch state updates and only call setState if something changed
        if (newIsPlaying != _isPlaying ||
            (newStatus != null && newStatus != _status)) {
          setState(() {
            _isPlaying = newIsPlaying;
            if (newStatus != null) _status = newStatus;
          });
        }
      },
      onError: (error) {
        logger.e('Audio player stream error', error: error);
        if (mounted) {
          setState(() {
            _isPlaying = false;
            _status = 'Audio error: $error';
          });
        }
      },
    );
  }

  Future<void> _loadModels() async {
    setState(() {
      _isLoading = true;
      _status = 'Loading models...';
    });

    try {
      _textToSpeech = await loadTextToSpeech('assets/onnx', useGpu: false);
      await _loadVoiceStyle();

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

  Future<void> _loadVoiceStyle() async {
    _style =
        await loadVoiceStyle(['assets/voice_styles/$_selectedVoiceStyle.json']);
  }

  Future<void> _onVoiceStyleChanged(String? newValue) async {
    if (newValue == null || newValue == _selectedVoiceStyle) return;

    setState(() {
      _selectedVoiceStyle = newValue;
      _isLoading = true;
      _status = 'Loading voice style...';
    });

    try {
      await _loadVoiceStyle();
      setState(() {
        _isLoading = false;
        _status = 'Ready';
      });
    } catch (e) {
      logger.e('Error loading voice style', error: e);
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
    } catch (e) {
      logger.e('Error generating speech', error: e);
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

      // Use async WAV writing to avoid blocking UI
      await writeWavFileAsync(outputPath, wav!, _textToSpeech!.sampleRate);

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

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      String downloadPath;

      if (Platform.isIOS) {
        // On iOS, save to Documents directory (accessible via Files app)
        final documentsDir = await getApplicationDocumentsDirectory();
        downloadPath = '${documentsDir.path}/speech_$timestamp.wav';
      } else {
        // On macOS, use Downloads directory
        final downloadsDir = await getDownloadsDirectory();
        if (downloadsDir == null) {
          setState(() => _status = 'Error: Could not access downloads folder');
          return;
        }
        downloadPath = '${downloadsDir.path}/speech_$timestamp.wav';
      }

      await sourceFile.copy(downloadPath);
      logger.i('File saved to $downloadPath');

      if (Platform.isIOS) {
        setState(() => _status = 'File saved! Check Files app → On My iPhone');
      } else {
        setState(() => _status = 'File saved to: $downloadPath');
      }
    } catch (e) {
      logger.e('Error downloading file', error: e);
      setState(() => _status = 'Error downloading file: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: CupertinoPageScaffold(
        backgroundColor: CupertinoColors.systemGroupedBackground,
        navigationBar: const CupertinoNavigationBar(
          middle: Text('Supertonic'),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Status indicator
                Container(
                  decoration: BoxDecoration(
                    color: _isLoading || _isGenerating
                        ? CupertinoColors.systemOrange.withOpacity(0.1)
                        : _status.startsWith('Error')
                            ? CupertinoColors.systemRed.withOpacity(0.1)
                            : CupertinoColors.systemGreen.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _isLoading || _isGenerating
                          ? CupertinoColors.systemOrange.withOpacity(0.3)
                          : _status.startsWith('Error')
                              ? CupertinoColors.systemRed.withOpacity(0.3)
                              : CupertinoColors.systemGreen.withOpacity(0.3),
                    ),
                  ),
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      if (_isLoading || _isGenerating)
                        const Padding(
                          padding: EdgeInsets.only(right: 12),
                          child: CupertinoActivityIndicator(),
                        ),
                      Expanded(
                        child: Text(
                          _status,
                          style: TextStyle(
                            fontSize: 15,
                            color: _isLoading || _isGenerating
                                ? CupertinoColors.systemOrange
                                : _status.startsWith('Error')
                                    ? CupertinoColors.systemRed
                                    : CupertinoColors.systemGreen,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Voice Style Selection
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 8),
                      child: Text(
                        'VOICE STYLE',
                        style: TextStyle(
                          fontSize: 13,
                          color: CupertinoColors.secondaryLabel,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoSlidingSegmentedControl<String>(
                        groupValue: _selectedVoiceStyle,
                        children: {
                          for (var style in _voiceStyles)
                            style: Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 20),
                              child: Text(style),
                            ),
                        },
                        onValueChanged: (value) {
                          if (!_isLoading && !_isGenerating && value != null) {
                            _onVoiceStyleChanged(value);
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Text input
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 8),
                      child: Text(
                        'INPUT TEXT',
                        style: TextStyle(
                          fontSize: 13,
                          color: CupertinoColors.secondaryLabel,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    CupertinoTextField(
                      controller: _textController,
                      maxLines: 5,
                      placeholder:
                          'Enter the text you want to convert to speech...',
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: CupertinoColors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      enabled: !_isLoading && !_isGenerating,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Parameters
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 8),
                      child: Text(
                        'PARAMETERS',
                        style: TextStyle(
                          fontSize: 13,
                          color: CupertinoColors.secondaryLabel,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: CupertinoColors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // Denoising steps slider
                          Row(
                            children: [
                              const Expanded(
                                  flex: 2, child: Text('Denoising Steps')),
                              Expanded(
                                flex: 3,
                                child: CupertinoSlider(
                                  value: _totalSteps.toDouble(),
                                  min: 1,
                                  max: 20,
                                  divisions: 19,
                                  onChanged: _isLoading || _isGenerating
                                      ? null
                                      : (value) => setState(
                                          () => _totalSteps = value.toInt()),
                                ),
                              ),
                              SizedBox(
                                width: 30,
                                child: Text(
                                  _totalSteps.toString(),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                      color: CupertinoColors.secondaryLabel),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            height: 0.5,
                            color: CupertinoColors.separator,
                          ),
                          const SizedBox(height: 12),
                          // Speed slider
                          Row(
                            children: [
                              const Expanded(flex: 2, child: Text('Speed')),
                              Expanded(
                                flex: 3,
                                child: CupertinoSlider(
                                  value: _speed,
                                  min: 0.5,
                                  max: 2.0,
                                  divisions: 30,
                                  onChanged: _isLoading || _isGenerating
                                      ? null
                                      : (value) =>
                                          setState(() => _speed = value),
                                ),
                              ),
                              SizedBox(
                                width: 30,
                                child: Text(
                                  _speed.toStringAsFixed(1),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                      color: CupertinoColors.secondaryLabel),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Generate button
                CupertinoButton.filled(
                  onPressed: _isLoading || _isGenerating
                      ? null
                      : _isPlaying
                          ? () async {
                              await _audioPlayer.stop();
                              setState(() => _status = 'Ready');
                            }
                          : _generateSpeech,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(_isPlaying
                            ? CupertinoIcons.stop_fill
                            : CupertinoIcons.play_arrow_solid),
                        const SizedBox(width: 8),
                        Text(
                          _isGenerating
                              ? 'Generating...'
                              : _isPlaying
                                  ? 'Stop Playback'
                                  : 'Generate Speech',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),

                // Download button
                if (_lastGeneratedFilePath != null) ...[
                  const SizedBox(height: 16),
                  CupertinoButton(
                    onPressed:
                        _isLoading || _isGenerating ? null : _downloadFile,
                    color: CupertinoColors.white,
                    borderRadius: BorderRadius.circular(12),
                    padding: EdgeInsets.zero,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.cloud_download,
                              color: CupertinoColors.activeBlue),
                          SizedBox(width: 8),
                          Text('Download WAV File',
                              style:
                                  TextStyle(color: CupertinoColors.activeBlue)),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    // Cancel stream subscription first to prevent callbacks after dispose
    _playerStateSubscription?.cancel();
    _textController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
}
