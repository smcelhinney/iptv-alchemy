import 'package:freezed_annotation/freezed_annotation.dart';

part 'settings.freezed.dart';
part 'settings.g.dart';

@freezed
abstract class Settings with _$Settings {
  const factory Settings({
    @JsonKey(name: 'subtitle_size') @Default('normal') String subtitleSize,
    @JsonKey(name: 'subtitle_offset') @Default('0ms') String subtitleOffset,
  }) = _Settings;

  factory Settings.fromJson(Map<String, Object?> json) =>
      _$SettingsFromJson(json);
}
