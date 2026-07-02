"""
M3U and XMLTV parsing functionality
"""

import os
import re
import sys
from typing import List, Dict, Set, Optional
from datetime import datetime
from lxml import etree


class M3UParser:
    """Handles M3U file parsing and channel information extraction"""

    def __init__(self, output_directory: str):
        self.output_directory = output_directory

    def get_output_path(self, *path_components: str) -> str:
        """Construct full path relative to output directory"""
        return os.path.join(self.output_directory, *path_components)

    def parse_m3u(self, filename: str) -> List[Dict[str, str]]:
        """Parse M3U file and extract channel information"""
        channels = []

        try:
            input_path = self.get_output_path(filename)
            with open(input_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                line = line.strip()
                if line.startswith('#EXTINF:'):
                    # Parse EXTINF line
                    channel_info = self._parse_extinf_line(line)

                    # Get the URL line (next non-empty line)
                    for j in range(i + 1, len(lines)):
                        url_line = lines[j].strip()
                        if url_line and not url_line.startswith('#'):
                            channel_info['url'] = url_line
                            channels.append(channel_info)
                            break

        except FileNotFoundError:
            print(f"Error: M3U file {filename} not found", file=sys.stderr)
        except Exception as e:
            print(f"Error parsing M3U file: {e}", file=sys.stderr)

        return channels

    def _parse_extinf_line(self, line: str) -> Dict[str, str]:
        """Parse a single EXTINF line to extract channel information"""
        channel_info = {}

        # Extract channel name by finding the last unquoted comma
        # This handles cases where tvg-logo contains data URLs with commas or quotes
        name = self._extract_name_after_last_comma(line)
        if name:
            channel_info['name'] = name

        # Extract channel ID
        id_match = re.search(r'tvg-id="([^"]*)"', line)
        if id_match:
            channel_info['id'] = id_match.group(1)

        # Extract channel category
        category_match = re.search(r'group-title="([^"]*)"', line)
        if category_match:
            channel_info['category'] = category_match.group(1)

        # Extract logo - skip data URLs which can cause parsing issues
        logo_match = re.search(r'tvg-logo="([^"]*)"', line)
        if logo_match:
            logo = logo_match.group(1)
            # Skip data URLs (too large, can contain quotes/commas that break parsing)
            if not logo.startswith('data:'):
                channel_info['logo'] = logo

        return channel_info

    def _extract_name_after_last_comma(self, line: str) -> str:
        """Extract the channel name using the space/comma/quote algorithm.

        This handles cases where tvg-logo contains data URLs with commas and quotes
        by finding the element that has both " and , in sequence (the attribute separator).
        """
        # Step 1: Remove #EXTINF:-1 prefix
        if line.startswith('#EXTINF:'):
            first_space = line.find(' ', line.find('#EXTINF'))
            if first_space == -1:
                return ""
            line = line[first_space + 1:]

        # Step 2: Split by spaces
        parts = line.split(' ')

        # Step 3: Find the LAST element containing both " and , in that sequence
        found_index = -1
        for i, part in enumerate(parts):
            quote_pos = part.find('"')
            comma_pos = part.find(',')
            if quote_pos != -1 and comma_pos != -1 and comma_pos > quote_pos:
                # This part has " then ,
                found_index = i

        if found_index == -1:
            return ""

        # Step 4: Get the target element and find the comma position
        target_part = parts[found_index]
        comma_pos_in_part = target_part.find(',')

        # Step 5: Search for the pattern up to and including the comma in the original line
        search_pattern = target_part[:comma_pos_in_part + 1]  # Include the comma
        pattern_pos = line.find(search_pattern)

        if pattern_pos == -1:
            return ""

        # Step 6: Extract everything after the pattern
        return line[pattern_pos + len(search_pattern):].strip()

    def get_channel_map(self, filename: str) -> Dict[str, Dict]:
        """Build a mapping of tvg-id to channel info

        Args:
            filename: Name of the M3U file to parse

        Returns:
            Dictionary mapping channel IDs to their info (name, logo, url, category)
        """
        channels = self.parse_m3u(filename)
        return {
            ch['id']: {
                'name': ch.get('name', ''),
                'logo': ch.get('logo', ''),
                'url': ch.get('url', ''),
                'category': ch.get('category', ''),
            }
            for ch in channels
            if 'id' in ch
        }


class XMLTVParser:
    """Handles XMLTV file parsing and channel/programme filtering"""

    def __init__(self, output_directory: str):
        self.output_directory = output_directory

    def get_output_path(self, *path_components: str) -> str:
        """Construct full path relative to output directory"""
        return os.path.join(self.output_directory, *path_components)

    def parse_xmltv(self, filename: str, allowed_channel_ids: Set[str]) -> etree._Element:
        """Parse XMLTV file and filter by allowed channel IDs"""
        try:
            input_path = self.get_output_path(filename)
            parser = etree.XMLParser(remove_blank_text=True)
            tree = etree.parse(input_path, parser)
            root = tree.getroot()

            # Filter channels to only include allowed ones
            channels_to_keep = []
            for channel in root.findall('channel'):
                channel_id = channel.get('id', '')
                if channel_id in allowed_channel_ids:
                    channels_to_keep.append(channel)

            # Filter programmes to only include allowed channels
            programmes_to_keep = []
            for programme in root.findall('programme'):
                programme_channel_id = programme.get('channel', '')
                if programme_channel_id in allowed_channel_ids:
                    programmes_to_keep.append(programme)

            # Create new root with filtered content
            new_root = etree.Element("tv")
            new_root.set("generator-info-name", "iptv-processor")

            # Add filtered channels and programmes
            for channel in channels_to_keep:
                new_root.append(channel)

            for programme in programmes_to_keep:
                new_root.append(programme)

            return new_root

        except FileNotFoundError:
            print(f"Error: XMLTV file {filename} not found", file=sys.stderr)
            return etree.Element("tv")
        except Exception as e:
            print(f"Error parsing XMLTV file: {e}", file=sys.stderr)
            return etree.Element("tv")

    def get_channel_display_name(self, channel_elem: etree._Element) -> str:
        """Extract display name from channel element"""
        for display_name in channel_elem.findall('display-name'):
            if display_name.text:
                return display_name.text.strip()
        return ""

    def get_channel_name_by_id(self, root: etree._Element, channel_id: str) -> str:
        """Find channel name by channel ID"""
        for channel in root.findall('channel'):
            if channel.get('id') == channel_id:
                return self.get_channel_display_name(channel)
        return ""

    def parse_programmes(self, filename: str) -> List[Dict]:
        """Parse all programme elements from XMLTV file

        Args:
            filename: Name of the XMLTV file to parse

        Returns:
            List of programme dictionaries with channel, start, stop, title, description
        """
        programmes = []
        try:
            input_path = self.get_output_path(filename)
            tree = etree.parse(input_path)
            root = tree.getroot()

            for prog in root.findall('programme'):
                programme = {
                    'channel': prog.get('channel', ''),
                    'start': prog.get('start', ''),
                    'stop': prog.get('stop', ''),
                    'start_timestamp': self._parse_timestamp(prog.get('start', '')),
                    'stop_timestamp': self._parse_timestamp(prog.get('stop', '')),
                    'title': prog.findtext('title', '') or '',
                    'description': prog.findtext('desc', '') or '',
                }
                programmes.append(programme)

        except FileNotFoundError:
            print(f"Error: XMLTV file {filename} not found", file=sys.stderr)
        except Exception as e:
            print(f"Error parsing programmes: {e}", file=sys.stderr)

        return programmes

    def _parse_timestamp(self, ts_string: str) -> int:
        """Convert XMLTV timestamp to Unix timestamp

        Args:
            ts_string: XMLTV timestamp in format "20260420233000 +0000"

        Returns:
            Unix timestamp (seconds since epoch), or 0 if parsing fails
        """
        if not ts_string:
            return 0

        try:
            # Format: "20260420233000 +0000"
            # Extract the datetime part and timezone
            parts = ts_string.split()
            if len(parts) < 2:
                return 0

            dt_str = parts[0]  # "20260420233000"
            tz_str = parts[1]  # "+0000"

            # Parse the datetime string
            # Format: YYYYMMDDHHMMSS
            year = int(dt_str[0:4])
            month = int(dt_str[4:6])
            day = int(dt_str[6:8])
            hour = int(dt_str[8:10])
            minute = int(dt_str[10:12])
            second = int(dt_str[12:14])

            # Parse timezone offset
            tz_sign = 1 if tz_str[0] == '+' else -1
            tz_hours = int(tz_str[1:3])
            tz_minutes = int(tz_str[3:5])
            tz_offset = tz_sign * (tz_hours * 3600 + tz_minutes * 60)

            # Create datetime object
            dt = datetime(year, month, day, hour, minute, second)

            # Convert to Unix timestamp (accounting for timezone)
            timestamp = int(dt.timestamp()) - tz_offset
            return timestamp

        except (ValueError, IndexError) as e:
            print(f"Warning: Failed to parse timestamp '{ts_string}': {e}", file=sys.stderr)
            return 0
