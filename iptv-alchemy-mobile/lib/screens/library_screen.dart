import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/hit.dart';
import '../providers/api_client_provider.dart';
import '../providers/library_provider.dart';
import '../providers/server_config_provider.dart';
import '../widgets/error_state.dart';
import '../widgets/library_list_item.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _signOut() async {
    final config = await ref.read(serverConfigProvider.future);
    await config.clear();
    ref.invalidate(apiClientProvider);
    if (mounted) {
      context.go('/onboarding');
    }
  }

  void _openHit(Hit hit) {
    context.push('/detail', extra: hit);
  }

  @override
  Widget build(BuildContext context) {
    final libraryAsync = ref.watch(libraryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Library'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Movies'),
            Tab(text: 'Shows'),
            Tab(text: 'Live TV'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(libraryProvider),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _signOut,
            tooltip: 'Change server',
          ),
        ],
      ),
      body: libraryAsync.when(
        data: (library) => TabBarView(
          controller: _tabController,
          children: [
            _HitGrid(hits: library.movies, onTap: _openHit),
            _HitGrid(hits: library.series, onTap: _openHit),
            _HitGrid(hits: library.tvChannels, onTap: _openHit),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorState(
          message: 'Failed to load library: $error',
          onRetry: () => ref.invalidate(libraryProvider),
        ),
      ),
    );
  }
}

class _HitGrid extends StatelessWidget {
  final List<Hit> hits;
  final ValueChanged<Hit> onTap;

  const _HitGrid({required this.hits, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (hits.isEmpty) {
      return const Center(child: Text('Nothing in your library yet.'));
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 240,
        childAspectRatio: 16 / 14,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: hits.length,
      itemBuilder: (context, index) {
        final hit = hits[index];
        return LibraryListItem(
          hit: hit,
          onTap: () => onTap(hit),
        );
      },
    );
  }
}
