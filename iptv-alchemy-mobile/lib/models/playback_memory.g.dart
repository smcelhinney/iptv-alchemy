// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'playback_memory.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PlaybackMemory _$PlaybackMemoryFromJson(Map<String, dynamic> json) =>
    _PlaybackMemory(
      positionSeconds: (json['position'] as num).toDouble(),
      durationSeconds: (json['duration'] as num).toDouble(),
      updatedAt: (json['updated_at'] as num).toInt(),
    );

Map<String, dynamic> _$PlaybackMemoryToJson(_PlaybackMemory instance) =>
    <String, dynamic>{
      'position': instance.positionSeconds,
      'duration': instance.durationSeconds,
      'updated_at': instance.updatedAt,
    };
