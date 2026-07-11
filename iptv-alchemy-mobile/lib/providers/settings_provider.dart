import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/settings_repository.dart';
import '../models/settings.dart';
import 'api_client_provider.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return SettingsRepository(client);
});

final settingsProvider = FutureProvider.autoDispose<Settings>((ref) async {
  final repository = ref.watch(settingsRepositoryProvider);
  return repository.fetch();
});
