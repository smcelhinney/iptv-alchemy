import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api_client.dart';
import 'server_config_provider.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(serverConfigProvider).whenOrNull(
        data: (config) => config,
      );
  if (config == null) {
    throw StateError('Server config is not initialized');
  }
  return ApiClient(config: config);
});
