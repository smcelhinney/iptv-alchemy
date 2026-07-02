#!/usr/bin/env python3
"""
Meilisearch Indexer for IPTV Programme Listings
Indexes TV programme listings from EPG/XML files for searchable web UI.
"""

import os
import hashlib
from typing import List, Dict, Optional
from datetime import datetime
from dotenv import load_dotenv

try:
    from meilisearch import Client, errors as MeilisearchErrors
except ImportError:
    print("Warning: meilisearch package not installed. Run: pip install meilisearch")
    Client = None

load_dotenv()

MEILISEARCH_HOST = os.getenv('MEILISEARCH_HOST', 'http://iptv-meilisearch:7700')
MEILISEARCH_API_KEY = os.getenv('MEILISEARCH_API_KEY', 'iptv-alchemy-default-key')
INDEX_NAME = 'iptv_listings'


class ListingsIndexer:
    """Handles indexing of IPTV programme listings to Meilisearch"""

    INDEX_NAME = 'iptv_listings'

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
        self.client = Client(self.host, self.api_key)

    def get_or_create_index(self):
        """Get or create the listings index with proper configuration"""
        # Check if index exists by trying to get its info
        index_exists = False
        try:
            info = self.client.get_index(self.INDEX_NAME)
            index_exists = True
            index = self.client.index(self.INDEX_NAME)
            print(f"Connected to listings index '{self.INDEX_NAME}' at {self.host}")

            # Ensure primary key is set
            if info.primary_key is None:
                print(f"Setting primary key 'id' on existing index")
                index.update({'primaryKey': 'id'})

        except MeilisearchErrors.MeilisearchApiError:
            index_exists = False

        # Create index if it doesn't exist
        if not index_exists:
            print(f"Creating new listings index '{self.INDEX_NAME}' in Meilisearch")
            self.client.create_index(self.INDEX_NAME, {'primaryKey': 'id'})
            index = self.client.index(self.INDEX_NAME)
            self._configure_index(index)

        return index

    def _configure_index(self, index):
        """Configure index settings for programme listings"""
        # Configure searchable attributes
        index.update_searchable_attributes([
            'title',
            'description',
            'channel_name',
        ])

        # Configure filterable attributes
        index.update_filterable_attributes([
            'channel_id',
            'category',
            'start_timestamp',
            'stop_timestamp',
        ])

        # Configure sortable attributes
        index.update_sortable_attributes([
            'start_timestamp',
            'stop_timestamp',
        ])

        # Configure displayed attributes
        index.update_displayed_attributes([
            'id',
            'title',
            'description',
            'channel_id',
            'channel_name',
            'channel_logo',
            'channel_url',
            'category',
            'start',
            'stop',
            'start_timestamp',
            'stop_timestamp',
        ])

        print("Configured listings index settings")

    def clear_index(self) -> bool:
        """Clear all documents from the listings index

        Returns:
            True if successful, False otherwise
        """
        try:
            index = self.client.index(self.INDEX_NAME)
            index.delete_all_documents()
            print(f"Cleared all documents from '{self.INDEX_NAME}' index")
            return True
        except Exception as e:
            print(f"Error clearing listings index: {e}")
            return False

    def index_programmes(self, programmes: List[Dict]) -> int:
        """Index a batch of programme documents

        Args:
            programmes: List of programme document dictionaries

        Returns:
            Number of documents indexed
        """
        if not programmes:
            return 0

        try:
            index = self.get_or_create_index()

            # Bulk index in batches of 1000
            batch_size = 1000
            total_indexed = 0

            for i in range(0, len(programmes), batch_size):
                batch = programmes[i:i + batch_size]
                index.add_documents(batch)
                total_indexed += len(batch)

            print(f"Indexed {total_indexed} programme listings")
            return total_indexed

        except Exception as e:
            print(f"Error indexing programmes: {e}")
            return 0

    def get_stats(self) -> Optional[Dict]:
        """Get index statistics

        Returns:
            Dictionary with index stats or None if error
        """
        try:
            index = self.client.index(self.INDEX_NAME)
            stats = index.get_stats()
            if hasattr(stats, 'number_of_documents'):
                return {
                    'numberOfDocuments': stats.number_of_documents,
                    'isIndexing': stats.is_indexing,
                    'fieldDistribution': stats.field_distribution if hasattr(stats, 'field_distribution') else {},
                }
            return stats
        except Exception as e:
            print(f"Error getting listings stats: {e}")
            return None
