import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/server_config.dart';

final serverConfigProvider = FutureProvider<ServerConfig>((ref) async {
  return ServerConfig.initialize();
});
