import 'package:shared_preferences/shared_preferences.dart';

const _serverUrlKey = 'server_url';

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
    return value.trim().replaceAll(RegExp(r'/+$'), '');
  }

  Future<bool> setServerUrl(String url) async {
    final normalized = url.trim().replaceAll(RegExp(r'/+$'), '');
    return _prefs.setString(_serverUrlKey, normalized);
  }

  Future<bool> clear() => _prefs.remove(_serverUrlKey);
}
