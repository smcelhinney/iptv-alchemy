import 'package:shared_preferences/shared_preferences.dart';

const _serverUrlKey = 'server_url';
const _apiPath = '/api';

/// Normalizes a user-supplied server URL so API calls land under `/api`.
///
/// Accepts either `http://host:port` or `http://host:port/api` and always
/// returns the URL with `/api` appended.
String normalizeServerUrl(String url) {
  var normalized = url.trim();
  if (normalized.isEmpty) return normalized;
  normalized = normalized.replaceAll(RegExp(r'/+$'), '');
  if (normalized.endsWith(_apiPath)) {
    return normalized;
  }
  return '$normalized$_apiPath';
}

class ServerConfig {
  final SharedPreferences _prefs;

  ServerConfig(this._prefs);

  static Future<ServerConfig> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    return ServerConfig(prefs);
  }

  String? get serverUrl {
    final value = _prefs.getString(_serverUrlKey);
    if (value == null || value.trim().isEmpty) return null;
    return value.trim();
  }

  Future<bool> setServerUrl(String url) async {
    final normalized = normalizeServerUrl(url);
    return _prefs.setString(_serverUrlKey, normalized);
  }

  Future<bool> clear() => _prefs.remove(_serverUrlKey);
}
