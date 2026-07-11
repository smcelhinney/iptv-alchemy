import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/playback_memory_repository.dart';
import '../models/playback_memory.dart';
import 'api_client_provider.dart';

final playbackMemoryRepositoryProvider = Provider<PlaybackMemoryRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return PlaybackMemoryRepository(client);
});

final playbackMemoryProvider =
    FutureProvider.autoDispose<Map<String, PlaybackMemory>>((ref) async {
  final repository = ref.watch(playbackMemoryRepositoryProvider);
  return repository.fetchAll();
});
