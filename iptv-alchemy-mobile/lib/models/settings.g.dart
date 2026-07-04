// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Settings _$SettingsFromJson(Map<String, dynamic> json) => _Settings(
  subtitleSize: json['subtitle_size'] as String? ?? 'normal',
  subtitleOffset: json['subtitle_offset'] as String? ?? '0ms',
);

Map<String, dynamic> _$SettingsToJson(_Settings instance) => <String, dynamic>{
  'subtitle_size': instance.subtitleSize,
  'subtitle_offset': instance.subtitleOffset,
};
