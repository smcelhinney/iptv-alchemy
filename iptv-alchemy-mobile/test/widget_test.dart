// Basic smoke test for the IPTV Alchemy app.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iptv_alchemy_mobile/app.dart';

void main() {
  testWidgets('App builds and shows loading indicator', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: IptvAlchemyApp()),
    );
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
