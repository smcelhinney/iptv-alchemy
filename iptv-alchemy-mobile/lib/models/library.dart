import 'package:freezed_annotation/freezed_annotation.dart';

import 'hit.dart';

part 'library.freezed.dart';
part 'library.g.dart';

@freezed
class Library with _$Library {
  const factory Library({
    required List<Hit> movies,
    required List<Hit> series,
    @JsonKey(name: 'tv_channels') required List<Hit> tvChannels,
  }) = _Library;

  factory Library.fromJson(Map<String, Object?> json) =>
      _$LibraryFromJson(json);
}
