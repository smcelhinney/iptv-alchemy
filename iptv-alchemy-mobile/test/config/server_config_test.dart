import 'package:flutter_test/flutter_test.dart';
import 'package:iptv_alchemy_mobile/config/server_config.dart';

void main() {
  group('normalizeServerUrl', () {
    test('appends /api when missing', () {
      expect(normalizeServerUrl('http://192.168.1.100:5555'),
          'http://192.168.1.100:5555/api');
    });

    test('does not duplicate /api when present', () {
      expect(normalizeServerUrl('http://192.168.1.100:5555/api'),
          'http://192.168.1.100:5555/api');
    });

    test('strips trailing slashes before appending /api', () {
      expect(normalizeServerUrl('http://192.168.1.100:5555/'),
          'http://192.168.1.100:5555/api');
      expect(normalizeServerUrl('http://192.168.1.100:5555//'),
          'http://192.168.1.100:5555/api');
    });

    test('strips trailing slashes after /api', () {
      expect(normalizeServerUrl('http://192.168.1.100:5555/api/'),
          'http://192.168.1.100:5555/api');
    });

    test('handles https', () {
      expect(normalizeServerUrl('https://example.com'),
          'https://example.com/api');
    });

    test('returns empty string for empty input', () {
      expect(normalizeServerUrl(''), '');
    });
  });
}
