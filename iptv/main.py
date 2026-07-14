#!/usr/bin/env python3
"""
iptv-alchemy processor
Downloads M3U playlist and XMLTV EPG from Xtream API, filters by categories, and generates output files.
"""

import os
import re
import sys
import argparse
import time
import hashlib
from datetime import datetime
from typing import List, Dict, Set

from .utils import (
    load_config, validate_credentials, get_output_path,
    construct_urls, download_file, categorize_channels_by_url,
    generate_output_m3u, generate_output_xml
)
from .m3u_xmltv import M3UParser, XMLTVParser
from .meilisearch_indexer import MeilisearchIndexer
from .listings_indexer import ListingsIndexer
from .redis_client import refresh_category_cache
from .config_db import get_selected_categories


class AlchemyProcessor:
    """Main processing orchestrator"""

    def __init__(self):
        self._load_configuration()
        self._setup_processors()

    def _load_configuration(self):
        """Load configuration from environment and YAML"""
        try:
            config_data = load_config()

            # Core configuration
            self.server_url = config_data['server_url']
            self.username = config_data['username']
            self.password = config_data['password']
            self.output_directory = config_data['output_directory']

            # Settings
            self.should_overwrite_output = config_data['should_overwrite_output']
            self.epg_prev_days = config_data['epg_prev_days']
            self.epg_next_days = config_data['epg_next_days']

            # Global search exclude regex
            self.search_exclude_regex = config_data.get('search_exclude_regex')

            print(f"Output directory: {self.output_directory}")

        except Exception as e:
            print(f"Failed to load configuration: {e}", file=sys.stderr)
            sys.exit(1)

    def _setup_processors(self):
        """Initialize processing components"""
        # Validate credentials
        validate_credentials(self.server_url, self.username, self.password)

        # Initialize parsers
        self.m3u_parser = M3UParser(self.output_directory)
        self.xmltv_parser = XMLTVParser(self.output_directory)

        # Initialize Meilisearch indexer
        try:
            self.meilisearch_indexer = MeilisearchIndexer()
        except Exception as e:
            print(f"Warning: Could not initialize Meilisearch indexer: {e}")
            self.meilisearch_indexer = None

    def _validate_input_files(self) -> bool:
        """Check that iptv.m3u and iptv.xml exist"""
        m3u_path = get_output_path(self.output_directory, 'iptv.m3u')
        xml_path = get_output_path(self.output_directory, 'iptv.xml')

        if not os.path.exists(m3u_path):
            print(f"Error: {m3u_path} not found. Run with --download-only first.", file=sys.stderr)
            return False
        if not os.path.exists(xml_path):
            print(f"Error: {xml_path} not found. Run with --download-only first.", file=sys.stderr)
            return False
        return True

    def populate_index(self, full_reindex: bool = False) -> bool:
        """Parse M3U and populate Meilisearch index with all content.

        By default performs incremental updates: upserts current documents and
        deletes stale ones. Use full_reindex=True to clear and rebuild from scratch.

        Args:
            full_reindex: If True, clear the index before reindexing
        """
        if not self._validate_input_files():
            return False

        if not self.meilisearch_indexer:
            print("Warning: Meilisearch indexer not available, skipping index population")
            return True

        try:
            # Parse and categorize M3U channels by URL
            all_channels = self.m3u_parser.parse_m3u('iptv.m3u')
            if not all_channels:
                print("Warning: No channels found in M3U file", file=sys.stderr)
                return False

            # Categorize channels by URL patterns
            categorized_channels = categorize_channels_by_url(all_channels)
            series_channels = categorized_channels['series']
            live_tv_channels = categorized_channels['live_tv']
            movie_channels = categorized_channels['movies']

            print(f"Parsed {len(all_channels)} total channels from M3U")

            # Optionally clear existing index for full reindex
            if full_reindex:
                self.meilisearch_indexer.clear_index()

            # Apply global exclude regex to all content types
            if self.search_exclude_regex:
                for name, channels in [('movies', movie_channels), ('series', series_channels), ('live_tv', live_tv_channels)]:
                    before = len(channels)
                    channels[:] = [
                        ch for ch in channels
                        if not self.search_exclude_regex.search(ch.get('category', ''))
                    ]
                    excluded = before - len(channels)
                    if excluded:
                        print(f"Globally excluded {excluded} {name} items")

            # Whitelist filtering for movies and series
            movie_selected = set(get_selected_categories('movies'))
            if movie_selected:
                movie_channels = [
                    ch for ch in movie_channels
                    if ch.get('category', '') in movie_selected
                ]
                print(f"Movies: {len(movie_channels)} channels after category whitelist")
            else:
                movie_channels = []
                print("Movies: no categories selected, skipping")

            series_selected = set(get_selected_categories('series'))
            if series_selected:
                series_channels = [
                    ch for ch in series_channels
                    if ch.get('category', '') in series_selected
                ]
                print(f"Series: {len(series_channels)} channels after category whitelist")
            else:
                series_channels = []
                print("Series: no categories selected, skipping")

            # Index all content, collecting upserted document IDs
            total_indexed = 0
            current_ids: Set[str] = set()

            for channels, content_type in [
                (series_channels, 'series'),
                (movie_channels, 'movie'),
                (live_tv_channels, 'live_tv'),
            ]:
                count, ids = self.meilisearch_indexer.index_channels(
                    channels, content_type
                )
                total_indexed += count
                current_ids.update(ids)

            # For incremental updates, remove stale documents
            if not full_reindex:
                existing_ids = self.meilisearch_indexer.get_all_document_ids()
                stale_ids = existing_ids - current_ids
                if stale_ids:
                    print(f"Found {len(stale_ids)} stale documents to remove")
                    self.meilisearch_indexer.delete_documents_by_ids(stale_ids)
                else:
                    print("No stale documents to remove")

            print(f"✓ Indexed {total_indexed} items to Meilisearch")

            # Show stats
            stats = self.meilisearch_indexer.get_stats()
            if stats:
                print(f"  Index has {stats.get('numberOfDocuments', 0)} documents")

            return True

        except Exception as e:
            print(f"Error populating index: {e}", file=sys.stderr)
            return False

    def populate_listings_index(self, full_reindex: bool = True) -> bool:
        """Parse and index TV programme listings from EPG/XML file.

        Args:
            full_reindex: If True, clear the index before reindexing (always true for listings)

        Returns:
            True if successful, False otherwise
        """
        if not self._validate_input_files():
            return False

        try:
            # Read Meilisearch config
            meilisearch_host = os.getenv('MEILISEARCH_HOST', 'http://iptv-meilisearch:7700')
            meilisearch_api_key = os.getenv('MEILISEARCH_KEY', 'iptv-alchemy-default-key')

            # Parse M3U to get channel mapping
            channel_map = self.m3u_parser.get_channel_map('iptv.m3u')
            print(f"Loaded channel map with {len(channel_map)} channels")

            # Parse XMLTV programmes
            programmes = self.xmltv_parser.parse_programmes('iptv.xml')
            print(f"Parsed {len(programmes)} programmes from XMLTV")

            if not programmes:
                print("Warning: No programmes found in XMLTV file", file=sys.stderr)
                return False

            # Enrich programmes with channel data
            documents = []
            for prog in programmes:
                channel_info = channel_map.get(prog['channel'], {})
                category = channel_info.get('category', '')

                # Apply global exclude regex to programme categories
                if self.search_exclude_regex and self.search_exclude_regex.search(category):
                    continue

                doc = {
                    'id': self._generate_programme_id(prog),
                    'title': prog['title'],
                    'description': prog['description'],
                    'channel_id': prog['channel'],
                    'channel_name': channel_info.get('name', ''),
                    'channel_logo': channel_info.get('logo', ''),
                    'channel_url': channel_info.get('url', ''),
                    'category': category,
                    'start': prog['start'],
                    'stop': prog['stop'],
                    'start_timestamp': prog['start_timestamp'],
                    'stop_timestamp': prog['stop_timestamp'],
                }
                documents.append(doc)

            # Index with full purge
            listings_indexer = ListingsIndexer(meilisearch_host, meilisearch_api_key)
            listings_indexer.get_or_create_index()

            if full_reindex:
                listings_indexer.clear_index()

            total_indexed = listings_indexer.index_programmes(documents)
            print(f"✓ Indexed {total_indexed} programme listings to Meilisearch")

            # Show stats
            stats = listings_indexer.get_stats()
            if stats:
                print(f"  Listings index has {stats.get('numberOfDocuments', 0)} documents")

            return True

        except Exception as e:
            print(f"Error indexing listings: {e}", file=sys.stderr)
            return False

    def _generate_programme_id(self, prog: Dict) -> str:
        """Generate unique ID for a programme using SHA256 hash of channel_id + start + stop

        Args:
            prog: Programme dictionary with channel, start, and stop fields

        Returns:
            Unique ID string (first 16 chars of SHA256 hash)
        """
        key = f"{prog['channel']}:{prog['start']}:{prog['stop']}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]

    def download(self, skip_if_present: bool = False) -> bool:
        """Download iptv.m3u and iptv.xml files"""
        m3u_url, xmltv_url = construct_urls(
            self.server_url, self.username, self.password,
            self.epg_prev_days, self.epg_next_days
        )

        if not download_file(xmltv_url, 'iptv.xml', self.output_directory, skip_if_present=skip_if_present):
            return False
        if not download_file(m3u_url, 'iptv.m3u', self.output_directory, skip_if_present=skip_if_present):
            return False
        return True

    def process_local(self) -> bool:
        """Filter live TV channels from existing iptv.m3u and iptv.xml files into output files."""
        if not self._validate_input_files():
            return False

        try:
            # Parse and categorize M3U channels by URL
            all_channels = self.m3u_parser.parse_m3u('iptv.m3u')
            if not all_channels:
                print("Warning: No channels found in M3U file", file=sys.stderr)
                return False

            # Categorize channels by URL patterns
            categorized_channels = categorize_channels_by_url(all_channels)
            live_tv_channels = categorized_channels['live_tv']

            # Release memory
            del all_channels
            del categorized_channels

            # Filter by selected TV listings categories (whitelist)
            tv_selected = set(get_selected_categories('tv_listings'))
            if tv_selected:
                live_tv_channels = [
                    ch for ch in live_tv_channels
                    if ch.get('category', '') in tv_selected
                ]
                print(f"TV Listings: {len(live_tv_channels)} channels after category whitelist")
            else:
                print("Warning: No TV listings categories selected, nothing to output", file=sys.stderr)
                return False

            if not live_tv_channels:
                print("Warning: No live TV channels remain after filtering", file=sys.stderr)
                return False

            # Get allowed channel IDs for XMLTV filtering
            allowed_channel_ids = {
                channel.get('id', '') for channel in live_tv_channels
                if channel.get('id')
            }

            # Parse and filter XMLTV
            filtered_xmltv = self.xmltv_parser.parse_xmltv('iptv.xml', allowed_channel_ids)

            # Generate output files
            success = True
            success &= generate_output_m3u(
                live_tv_channels, 'output.m3u',
                self.output_directory, self.should_overwrite_output
            )
            success &= generate_output_xml(
                filtered_xmltv, 'output.xml',
                self.output_directory, self.should_overwrite_output
            )

            if success:
                programmes_count = len(filtered_xmltv.findall('programme'))
                print(f"✓ Generated output.m3u with {len(live_tv_channels)} channels")
                print(f"✓ Generated output.xml with {programmes_count} programmes")

            return success

        except Exception as e:
            print(f"Error in main processing: {e}", file=sys.stderr)
            return False

    def extract_categories(self) -> bool:
        """Parse M3U and refresh Redis category cache."""
        if not self._validate_input_files():
            return False
        all_channels = self.m3u_parser.parse_m3u('iptv.m3u')
        if not all_channels:
            return False
        refresh_category_cache(all_channels)
        print(f"Extracted categories from {len(all_channels)} channels")
        return True

    def reindex(self, index_type: str = 'all') -> bool:
        """Reindex Meilisearch indices.

        Args:
            index_type: 'all', 'content', or 'listings'
        """
        success = True
        if index_type in ('all', 'content'):
            if not self.populate_index():
                success = False
        if index_type in ('all', 'listings'):
            if not self.populate_listings_index(full_reindex=True):
                success = False
        return success

    def process(self) -> bool:
        """Full pipeline: download, extract categories, reindex, and recreate IPTV files."""
        print("Step 1/4: Downloading files...")
        if not self.download():
            return False
        print("✓ Downloaded all files successfully\n")

        print("Step 2/4: Extracting categories...")
        self.extract_categories()
        print("✓ Categories extracted\n")

        print("Step 3/4: Indexing content to Meilisearch...")
        self.reindex(index_type='all')
        print()

        print("Step 4/4: Generating output files...")
        self.process_local()
        return True


if __name__ == "__main__":
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv()

    # Parse CLI arguments
    parser = argparse.ArgumentParser(description='iptv-alchemy - Download and process IPTV playlists')
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument('--download-only', action='store_true', help='Only download iptv.m3u and iptv.xml')
    mode_group.add_argument('--process-only', action='store_true', help='Only process existing files (skip download)')
    mode_group.add_argument('--extract-categories', action='store_true', help='Extract categories from M3U to Redis cache')
    mode_group.add_argument('--reindex-only', action='store_true', help='Reindex Meilisearch content and listings indices')
    mode_group.add_argument('--reindex-listings', action='store_true', help='Only reindex programme listings from EPG/XML (full purge)')
    args = parser.parse_args()

    # Create processor
    processor = AlchemyProcessor()

    # Print start delimiter
    start_time = datetime.now()
    print(f"\n{'='*60}")
    print(f"Started at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Run based on mode
    start = time.time()
    success = False
    if args.download_only:
        success = processor.download()
    elif args.process_only:
        success = processor.process_local()
    elif args.extract_categories:
        success = processor.extract_categories()
    elif args.reindex_only:
        success = processor.reindex(index_type='all')
    elif args.reindex_listings:
        success = processor.reindex(index_type='listings')
    else:
        success = processor.process()
    elapsed = time.time() - start

    mins, secs = divmod(int(elapsed), 60)
    print(f"Total execution time: {mins}m {secs}s")

    # Print end delimiter
    end_time = datetime.now()
    print(f"\n{'='*60}")
    print(f"Ended at {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Exit with appropriate code
    sys.exit(0 if success else 1)
