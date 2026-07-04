import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

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
  late final Player _player;
  late final VideoController _controller;
  Timer? _saveTimer;
  bool _controlsVisible = true;
  Timer? _controlsTimer;

  @override
  void initState() {
    super.initState();
    _player = Player();
    _controller = VideoController(_player);

    _player.open(Media(widget.args.url));
    _player.setPlaylistMode(PlaylistMode.none);

    _player.stream.error.listen((error) {
      debugPrint('Player error: $error');
    });

    _restorePosition();
    _startSaveTimer();
    _hideControlsAfterDelay();
  }

  Future<void> _restorePosition() async {
    try {
      final memory = await ref.read(playbackMemoryProvider.future);
      final saved = memory[widget.args.id];
      if (saved != null && saved.positionSeconds > 0) {
        await _player.seek(Duration(seconds: saved.positionSeconds.toInt()));
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
    final position = _player.state.position;
    final duration = _player.state.duration;
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
    _player.dispose();
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
                child: Video(controller: _controller),
              ),
            ),
            if (_controlsVisible)
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
                              final newPos = _player.state.position -
                                  const Duration(seconds: 10);
                              _player.seek(newPos);
                              _hideControlsAfterDelay();
                            },
                          ),
                          const SizedBox(width: 24),
                          StreamBuilder<bool>(
                            stream: _player.stream.playing,
                            builder: (context, snapshot) {
                              final playing = snapshot.data ?? false;
                              return IconButton(
                                icon: Icon(
                                  playing ? Icons.pause : Icons.play_arrow,
                                  size: 48,
                                ),
                                onPressed: () {
                                  playing ? _player.pause() : _player.play();
                                  _hideControlsAfterDelay();
                                },
                              );
                            },
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            icon: const Icon(Icons.forward_10, size: 36),
                            onPressed: () {
                              final newPos = _player.state.position +
                                  const Duration(seconds: 10);
                              _player.seek(newPos);
                              _hideControlsAfterDelay();
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      StreamBuilder<Duration>(
                        stream: _player.stream.position,
                        builder: (context, positionSnapshot) {
                          return StreamBuilder<Duration>(
                            stream: _player.stream.duration,
                            builder: (context, durationSnapshot) {
                              final position = positionSnapshot.data ?? Duration.zero;
                              final duration = durationSnapshot.data ?? Duration.zero;
                              if (duration.inSeconds <= 0) {
                                return const SizedBox.shrink();
                              }
                              return Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 24),
                                child: Slider(
                                  value: position.inSeconds
                                      .clamp(0, duration.inSeconds)
                                      .toDouble(),
                                  max: duration.inSeconds.toDouble(),
                                  onChanged: (value) {
                                    _player.seek(Duration(seconds: value.toInt()));
                                    _hideControlsAfterDelay();
                                  },
                                ),
                              );
                            },
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
