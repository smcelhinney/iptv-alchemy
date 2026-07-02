#!/usr/bin/env python3
"""
Meilisearch Indexer for IPTV Content
Indexes all IPTV content (series, movies, live TV) for searchable web UI.
"""

import os
import re
import hashlib
from typing import List, Dict, Optional
from collections import defaultdict
from dotenv import load_dotenv

try:
    from meilisearch import Client, errors as MeilisearchErrors
except ImportError:
    print("Warning: meilisearch package not installed. Run: pip install meilisearch")
    Client = None

load_dotenv()

MEILISEARCH_HOST = os.getenv('MEILISEARCH_HOST', 'http://iptv-meilisearch:7700')
MEILISEARCH_API_KEY = os.getenv('MEILISEARCH_API_KEY', 'iptv-alchemy-default-key')
INDEX_NAME = 'iptv_content'


class MeilisearchIndexer:
    """Handles indexing of IPTV content to Meilisearch"""

    def __init__(self, host: str = None, api_key: str = None):
        """Initialize Meilisearch client

        Args:
            host: Meilisearch host URL (defaults to MEILISEARCH_HOST env var or the iptv-meilisearch service)
            api_key: Meilisearch API key (defaults to MEILISEARCH_API_KEY env var)
        """
        if Client is None:
            raise ImportError("meilisearch package is not installed. Install with: pip install meilisearch")

        self.host = host or MEILISEARCH_HOST
        self.api_key = api_key or MEILISEARCH_API_KEY

        try:
            self.client = Client(self.host, self.api_key)
            self.client.get_index(INDEX_NAME)
            print(f"Connected to Meilisearch at {self.host}")
        except MeilisearchErrors.MeilisearchApiError:
            print(f"Creating new index '{INDEX_NAME}' in Meilisearch")
            self.client.create_index(INDEX_NAME, {'primaryKey': 'id'})
            self._configure_index()

    def _configure_index(self):
        """Configure index settings for optimal search"""
        index = self.client.index(INDEX_NAME)

        # Configure searchable attributes with ranking order
        index.update_searchable_attributes([
            'name',
            'series_name',
            'movie_name',
            'category',
            'episode_name',
            'full_episode_id',
            'year',
        ])

        # Configure filterable attributes
        index.update_filterable_attributes([
            'type',
            'category',
            'season',
            'episode',
            'year',
        ])

        # Configure sortable attributes
        index.update_sortable_attributes([
            'name',
            'series_name',
            'movie_name',
        ])

        # Configure displayed attributes
        index.update_displayed_attributes([
            'id',
            'name',
            'category',
            'logo',
            'url',
            'type',
            'series_name',
            'episode_name',
            'season',
            'episode',
            'full_episode_id',
            'movie_name',
            'episodes',
            'episode_count',
            'year',
        ])

        print("Configured Meilisearch index settings")

    def _generate_id(self, channel: Dict) -> str:
        """Generate unique ID for a channel using URL hash

        Args:
            channel: Channel dictionary

        Returns:
            Unique ID string
        """
        url = channel.get('url', '')
        return hashlib.sha256(url.encode()).hexdigest()[:16]

    def _prepare_document(self, channel: Dict, content_type: str) -> Dict:
        """Prepare channel data for indexing

        Args:
            channel: Raw channel dictionary
            content_type: Type of content ('series', 'movie', or 'live_tv')

        Returns:
            Document ready for indexing
        """
        doc = {
            'id': self._generate_id(channel),
            'name': channel.get('name', ''),
            'category': channel.get('category', ''),
            'logo': channel.get('logo', ''),
            'url': channel.get('url', ''),
            'type': content_type,
        }

        # Add series-specific fields
        if content_type == 'series':
            doc.update({
                'series_name': channel.get('series_name', ''),
                'episode_name': channel.get('episode_name', ''),
                'season': channel.get('season'),
                'episode': channel.get('episode'),
                'full_episode_id': channel.get('full_episode_id', ''),
            })

        # Add movie-specific fields
        elif content_type == 'movie':
            movie_name = channel.get('movie_name', '') or self._clean_movie_name(channel.get('name', ''))
            doc.update({
                'movie_name': movie_name,
            })
            # Extract year from movie name, e.g. "Superman (1980)" → "1980"
            year_match = re.search(r'\((\d{4})\)', movie_name)
            if year_match:
                doc['year'] = int(year_match.group(1))

        return doc

    def _clean_movie_name(self, channel_name: str) -> str:
        """Strip IPTV attributes from a raw channel name to get the movie title."""
        name = channel_name.strip()
        for pattern in [
            r'\s+tvg-logo=', r'\s+group-title=', r'\s+tvg-id=',
            r'\s+tvg-name=', r'\s+tvg-chno=', r'\s+radio=',
            r'\s+aspect-ratio=',
        ]:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                name = name[:match.start()].strip()
        return re.sub(r'\s*[-:]\s*$', '', name)

    def _parse_series_info(self, channel_name: str) -> Optional[Dict[str, str]]:
        """Parse series name and episode info from channel name"""
        # Pattern to match: SeriesName S01E12 ...
        match = re.match(r'^(.*?)\s*S(\d+)E(\d+)(.*)$', channel_name, re.IGNORECASE)
        if match:
            series_name, season, episode, rest = match.groups()
            series_name = series_name.strip()

            episode_name = f"S{season.zfill(2)}E{episode.zfill(2)}"
            if rest.strip():
                rest_clean = re.sub(r'^[-:\s]+', '', rest.strip())
                episode_name = f"{episode_name} - {rest_clean}"

            return {
                'series_name': series_name if series_name else 'Unknown Series',
                'episode_name': episode_name,
                'season': int(season),
                'episode': int(episode),
                'full_episode_id': f"S{season.zfill(2)}E{episode.zfill(2)}"
            }

        # Fallback: "Series Name - Episode Title"
        match = re.match(r'^(.+?)\s*[-:]\s*(.+)$', channel_name)
        if match:
            series_name, episode_name = match.groups()
            return {
                'series_name': series_name.strip(),
                'episode_name': episode_name.strip(),
                'season': None,
                'episode': None,
                'full_episode_id': None
            }

        return {
            'series_name': 'Unknown Series',
            'episode_name': channel_name.strip(),
            'season': None,
            'episode': None,
            'full_episode_id': None
        }

    def _prepare_series_group_documents(self, channels: List[Dict]) -> List[Dict]:
        """Group series channels into single documents per series

        Args:
            channels: List of raw series channel dictionaries

        Returns:
            List of grouped series documents, each containing an episodes array
        """
        # Parse series info and group by series_name
        series_groups = defaultdict(list)
        for channel in channels:
            series_info = self._parse_series_info(channel.get('name', ''))
            series_name = series_info['series_name']
            channel_with_info = dict(channel)
            channel_with_info.update(series_info)
            series_groups[series_name].append(channel_with_info)

        documents = []
        for series_name, episodes in series_groups.items():
            # Pick first available logo as the series logo
            series_logo = ''
            for ep in episodes:
                if ep.get('logo'):
                    series_logo = ep['logo']
                    break

            # Build episodes array
            episodes_array = []
            for ep in episodes:
                episodes_array.append({
                    'id': self._generate_id(ep),
                    'name': ep.get('name', ''),
                    'url': ep.get('url', ''),
                    'season': ep.get('season'),
                    'episode': ep.get('episode'),
                    'episode_name': ep.get('episode_name', ''),
                    'full_episode_id': ep.get('full_episode_id', ''),
                    'logo': ep.get('logo', ''),
                })

            # Use hash of series_name as document ID
            doc_id = hashlib.sha256(series_name.encode()).hexdigest()[:16]

            # Pick category from first episode
            category = episodes[0].get('category', '') if episodes else ''

            documents.append({
                'id': doc_id,
                'name': series_name,
                'type': 'series',
                'category': category,
                'logo': series_logo,
                'series_name': series_name,
                'episode_count': len(episodes_array),
                'episodes': episodes_array,
            })

        return documents

    def get_all_document_ids(self) -> set:
        """Fetch all document IDs from the index (paginated, fields=['id'] for efficiency).

        Returns:
            Set of document ID strings
        """
        index = self.client.index(INDEX_NAME)
        ids = set()
        offset = 0
        limit = 1000

        while True:
            results = index.get_documents({
                'offset': offset,
                'limit': limit,
                'fields': ['id'],
            })
            # SDK >=0.31.0 returns DocumentsResults with .results attribute
            batch = results.results if hasattr(results, 'results') else results
            if not batch:
                break
            for doc in batch:
                ids.add(doc['id'] if isinstance(doc, dict) else doc.id)
            if len(batch) < limit:
                break
            offset += limit

        return ids

    def delete_documents_by_ids(self, ids: set) -> None:
        """Delete documents by their IDs in batches of 1000.

        Args:
            ids: Set of document ID strings to delete
        """
        if not ids:
            return

        index = self.client.index(INDEX_NAME)
        ids_list = list(ids)
        batch_size = 1000

        for i in range(0, len(ids_list), batch_size):
            batch = ids_list[i:i + batch_size]
            index.delete_documents(batch)

        print(f"Deleted {len(ids)} stale documents")

    def clear_index(self) -> bool:
        """Clear all documents from the index

        Returns:
            True if successful, False otherwise
        """
        try:
            index = self.client.index(INDEX_NAME)
            index.delete_all_documents()
            print(f"Cleared all documents from '{INDEX_NAME}' index")
            return True
        except Exception as e:
            print(f"Error clearing index: {e}")
            return False

    def index_channels(self, channels: List[Dict], content_type: str) -> tuple:
        """Index a batch of channels

        Args:
            channels: List of channel dictionaries (already filtered upstream)
            content_type: Type of content ('series', 'movie', or 'live_tv')

        Returns:
            Tuple of (number of documents indexed, set of document IDs upserted)
        """
        if not channels:
            return (0, set())

        try:
            index = self.client.index(INDEX_NAME)

            # Prepare documents - group series episodes into single documents
            if content_type == 'series':
                documents = self._prepare_series_group_documents(channels)
            else:
                documents = [
                    self._prepare_document(channel, content_type)
                    for channel in channels
                ]

            # Bulk index in batches of 1000
            batch_size = 1000
            total_indexed = 0

            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                task = index.add_documents(batch)
                total_indexed += len(batch)

            # Collect all document IDs that were upserted
            upserted_ids = {doc['id'] for doc in documents}

            print(f"Indexed {total_indexed} {content_type} items")
            return (total_indexed, upserted_ids)

        except Exception as e:
            print(f"Error indexing {content_type}: {e}")
            return (0, set())

    def get_stats(self) -> Optional[Dict]:
        """Get index statistics

        Returns:
            Dictionary with index stats or None if error
        """
        try:
            index = self.client.index(INDEX_NAME)
            stats = index.get_stats()
            if hasattr(stats, 'number_of_documents'):
                return {
                    'numberOfDocuments': stats.number_of_documents,
                    'isIndexing': stats.is_indexing,
                    'fieldDistribution': stats.field_distribution if hasattr(stats, 'field_distribution') else {},
                }
            return stats
        except Exception as e:
            print(f"Error getting stats: {e}")
            return None
