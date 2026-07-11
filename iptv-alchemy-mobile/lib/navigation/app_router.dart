import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/hit.dart';
import '../screens/detail_screen.dart';
import '../screens/library_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/player_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter({required bool hasServerUrl}) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: hasServerUrl ? '/library' : '/onboarding',
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/library',
        builder: (context, state) => const LibraryScreen(),
      ),
      GoRoute(
        path: '/detail',
        builder: (context, state) {
          final hit = state.extra as Hit;
          return DetailScreen(hit: hit);
        },
      ),
      GoRoute(
        path: '/player',
        builder: (context, state) {
          final args = state.extra as PlayerScreenArguments;
          return PlayerScreen(args: args);
        },
      ),
    ],
  );
}
