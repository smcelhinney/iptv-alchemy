import 'dart:developer';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/library_repository.dart';
import '../providers/api_client_provider.dart';
import '../providers/server_config_provider.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      // Ensure the soft keyboard opens on Android TV when the field is focused.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SystemChannels.textInput.invokeMethod('TextInput.show');
      });
    }
  }

  Future<void> _connect() async {
    final rawUrl = _controller.text.trim();
    if (rawUrl.isEmpty) {
      setState(() => _error = 'Please enter a server URL');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final config = await ref.read(serverConfigProvider.future);
      await config.setServerUrl(rawUrl);
      ref.invalidate(apiClientProvider);

      final repository = LibraryRepository(ref.read(apiClientProvider));
      await repository.checkConnection();

      if (mounted) {
        context.go('/library');
      }
    } on DioException catch (e, stack) {
      final message = _dioMessage(e);
      log('Connection error: $message', error: e, stackTrace: stack);
      setState(() => _error = message);
    } catch (e, stack) {
      log('Unexpected error: $e', error: e, stackTrace: stack);
      setState(() => _error = 'Unexpected error: $e');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _dioMessage(DioException e) {
    final url = e.requestOptions.uri.toString();
    final type = e.type;
    final cause = e.error;
    final details = e.message ?? (cause is SocketException ? cause.message : cause?.toString()) ?? type.name;

    if (cause is SocketException) {
      return 'Could not reach $url. '
          'The emulator may not resolve local domains like .lan. '
          'Try the server IP address instead. ($details)';
    }

    if (type == DioExceptionType.connectionTimeout ||
        type == DioExceptionType.connectionError ||
        type == DioExceptionType.unknown) {
      return 'Could not connect to $url. Error: $details';
    }

    if (e.response != null) {
      return 'Server error ${e.response?.statusCode} from $url';
    }

    return 'Connection failed: $details';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FocusScope(
        autofocus: true,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'IPTV Alchemy',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter your server URL to get started.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  Focus(
                    autofocus: true,
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      decoration: InputDecoration(
                        labelText: 'Server URL',
                        hintText: 'http://192.168.1.100:5555',
                        border: const OutlineInputBorder(),
                        errorText: _error,
                      ),
                      keyboardType: TextInputType.url,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _connect(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      autofocus: false,
                      onPressed: _loading ? null : _connect,
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Connect'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
