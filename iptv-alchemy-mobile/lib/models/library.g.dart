// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'library.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Library _$LibraryFromJson(Map<String, dynamic> json) => _Library(
  movies: (json['movies'] as List<dynamic>)
      .map((e) => Hit.fromJson(e as Map<String, dynamic>))
      .toList(),
  series: (json['series'] as List<dynamic>)
      .map((e) => Hit.fromJson(e as Map<String, dynamic>))
      .toList(),
  tvChannels: (json['tv_channels'] as List<dynamic>)
      .map((e) => Hit.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$LibraryToJson(_Library instance) => <String, dynamic>{
  'movies': instance.movies,
  'series': instance.series,
  'tv_channels': instance.tvChannels,
};
