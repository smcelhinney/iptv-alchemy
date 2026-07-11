import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../models/hit.dart';
import '../providers/playback_memory_provider.dart';
import '../providers/playback_memory_provider.dart' as playback_provider;

class PlayerScreenArguments {
  final String id;
  final String title;
  final String url;
  final Hit hit;

  PlayerScreenArguments({
    required this.id,
    required this.title,
    required this.url,
    required this.hit,
  });
}

class PlayerScreen extends ConsumerStatefulWidget {
  final PlayerScreenArguments args;

  const PlayerScreen({super.key, required this.args});

  @override
  ConsumerState<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends ConsumerState<PlayerScreen> {
  late VideoPlayerController _controller;
  Timer? _saveTimer;
  bool _controlsVisible = true;
  Timer? _controlsTimer;
  bool _isInitialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    _controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.args.url),
      httpHeaders: const {
        'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
      },
    );

    try {
      await _controller.initialize();
      await _restorePosition();
      await _controller.play();
      _startSaveTimer();
      _hideControlsAfterDelay();
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e, stack) {
      debugPrint('Failed to initialize video player: $e');
      debugPrint(stack.toString());
      if (mounted) {
        setState(() => _error = 'Failed to load video: $e');
      }
    }
  }

  Future<void> _restorePosition() async {
    try {
      final memory = await ref.read(playbackMemoryProvider.future);
      final saved = memory[widget.args.id];
      if (saved != null && saved.positionSeconds > 0) {
        await _controller.seekTo(Duration(seconds: saved.positionSeconds.toInt()));
      }
    } catch (e) {
      debugPrint('Failed to restore position: $e');
    }
  }

  void _startSaveTimer() {
    _saveTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      await _savePosition();
    });
  }

  Future<void> _savePosition() async {
    if (!_controller.value.isInitialized) return;
    final position = _controller.value.position;
    final duration = _controller.value.duration;
    if (position.inSeconds <= 0 || duration.inSeconds <= 0) return;

    try {
      final repository = ref.read(playback_provider.playbackMemoryRepositoryProvider);
      await repository.savePosition(
        widget.args.id,
        position.inSeconds.toDouble(),
        duration.inSeconds.toDouble(),
      );
    } catch (e) {
      debugPrint('Failed to save position: $e');
    }
  }

  void _toggleControls() {
    setState(() => _controlsVisible = !_controlsVisible);
    _hideControlsAfterDelay();
  }

  void _hideControlsAfterDelay() {
    _controlsTimer?.cancel();
    if (_controlsVisible) {
      _controlsTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) setState(() => _controlsVisible = false);
      });
    }
  }

  Future<void> _exit() async {
    await _savePosition();
    if (mounted) {
      Navigator.of(context).maybePop();
    }
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    _controlsTimer?.cancel();
    _savePosition();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) await _exit();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            GestureDetector(
              onTap: _toggleControls,
              child: Center(
                child: _isInitialized
                    ? AspectRatio(
                        aspectRatio: _controller.value.aspectRatio,
                        child: VideoPlayer(_controller),
                      )
                    : _error != null
                        ? Text(_error!, style: const TextStyle(color: Colors.white))
                        : const CircularProgressIndicator(),
              ),
            ),
            if (_controlsVisible && _isInitialized)
              Container(
                color: Colors.black54,
                child: SafeArea(
                  child: Column(
                    children: [
                      AppBar(
                        backgroundColor: Colors.transparent,
                        elevation: 0,
                        leading: IconButton(
                          icon: const Icon(Icons.arrow_back),
                          onPressed: _exit,
                        ),
                        title: Text(widget.args.title),
                      ),
                      const Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.replay_10, size: 36),
                            onPressed: () {
                              _controller.seekTo(_controller.value.position - const Duration(seconds: 10));
                              _hideControlsAfterDelay();
                            },
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            icon: Icon(
                              _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                              size: 48,
                            ),
                            onPressed: () {
                              _controller.value.isPlaying ? _controller.pause() : _controller.play();
                              _hideControlsAfterDelay();
                            },
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            icon: const Icon(Icons.forward_10, size: 36),
                            onPressed: () {
                              _controller.seekTo(_controller.value.position + const Duration(seconds: 10));
                              _hideControlsAfterDelay();
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      ValueListenableBuilder<VideoPlayerValue>(
                        valueListenable: _controller,
                        builder: (context, value, child) {
                          if (!value.isInitialized || value.duration.inSeconds <= 0) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Slider(
                              value: value.position.inSeconds
                                  .clamp(0, value.duration.inSeconds)
                                  .toDouble(),
                              max: value.duration.inSeconds.toDouble(),
                              onChanged: (position) {
                                _controller.seekTo(Duration(seconds: position.toInt()));
                                _hideControlsAfterDelay();
                              },
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
