import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/episode.dart';
import '../models/hit.dart';
import 'player_screen.dart';

class DetailScreen extends StatelessWidget {
  final Hit hit;

  const DetailScreen({super.key, required this.hit});

  void _play(BuildContext context, {Episode? episode}) {
    final url = episode?.url ?? hit.url;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No playable stream URL available')),
      );
      return;
    }
    final title = hit.name ?? hit.movieName ?? hit.seriesName ?? 'Untitled';
    context.push(
      '/player',
      extra: PlayerScreenArguments(
        id: episode?.id ?? hit.id,
        title: episode?.episodeName ?? title,
        url: url,
        hit: hit,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = hit.name ?? hit.movieName ?? hit.seriesName ?? 'Untitled';

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            if (hit.category != null) ...[
              const SizedBox(height: 8),
              Chip(label: Text(hit.category!)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _play(context),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Play'),
              ),
            ),
            const SizedBox(height: 24),
            if (hit.episodes != null && hit.episodes!.isNotEmpty) ...[
              Text(
                'Episodes',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  itemCount: hit.episodes!.length,
                  itemBuilder: (context, index) {
                    final episode = hit.episodes![index];
                    return ListTile(
                      leading: Text('${index + 1}'),
                      title: Text(episode.episodeName),
                      subtitle: episode.season != null && episode.episode != null
                          ? Text('Season ${episode.season}, Episode ${episode.episode}')
                          : null,
                      trailing: const Icon(Icons.play_arrow),
                      onTap: () => _play(context, episode: episode),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
