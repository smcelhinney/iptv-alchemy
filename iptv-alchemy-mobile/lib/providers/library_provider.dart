import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/library_repository.dart';
import '../models/library.dart';
import 'api_client_provider.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return LibraryRepository(client);
});

final libraryProvider = FutureProvider.autoDispose<Library>((ref) async {
  final repository = ref.watch(libraryRepositoryProvider);
  return repository.fetchExpanded();
});
