import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'navigation/app_router.dart';
import 'providers/server_config_provider.dart';

class IptvAlchemyApp extends ConsumerWidget {
  const IptvAlchemyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configAsync = ref.watch(serverConfigProvider);

    return configAsync.when(
      data: (config) {
        final router = createRouter(hasServerUrl: config.serverUrl != null);
        return FocusTraversalGroup(
          child: MaterialApp.router(
            title: 'IPTV Alchemy',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: Colors.deepPurple,
                brightness: Brightness.dark,
              ),
              brightness: Brightness.dark,
              useMaterial3: true,
            ),
            routerConfig: router,
          ),
        );
      },
      loading: () => const MaterialApp(
        home: Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (error, _) => MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Failed to load config: $error')),
        ),
      ),
    );
  }
}
