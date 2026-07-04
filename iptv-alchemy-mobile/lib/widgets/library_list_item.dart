import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/hit.dart';
import 'focusable_card.dart';

class LibraryListItem extends StatelessWidget {
  final Hit hit;
  final VoidCallback? onTap;

  const LibraryListItem({super.key, required this.hit, this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = hit.name ?? hit.movieName ?? hit.seriesName ?? 'Untitled';
    final subtitle = hit.category ?? '';

    return FocusableCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: hit.logo != null && hit.logo!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: hit.logo!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Colors.grey.shade800,
                        child: const Center(child: CircularProgressIndicator()),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Colors.grey.shade800,
                        child: const Icon(Icons.broken_image),
                      ),
                    )
                  : Container(
                      color: Colors.grey.shade800,
                      child: const Center(child: Icon(Icons.movie)),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          if (subtitle.isNotEmpty)
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      ),
    );
  }
}
