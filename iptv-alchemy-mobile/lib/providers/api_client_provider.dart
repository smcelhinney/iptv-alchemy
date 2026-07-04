import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/server_config.dart';
import '../data/api_client.dart';
import 'server_config_provider.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final configAsync = ref.watch(serverConfigProvider);
  final config = configAsync.valueOrNull;
  if (config == null) {
    throw StateError('Server config is not initialized');
  }
  return ApiClient(config: config);
});
