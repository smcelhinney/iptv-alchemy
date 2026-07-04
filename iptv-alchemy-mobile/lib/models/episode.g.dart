// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'episode.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Episode _$EpisodeFromJson(Map<String, dynamic> json) => _Episode(
  id: json['id'] as String,
  name: json['name'] as String,
  url: json['url'] as String,
  season: (json['season'] as num?)?.toInt(),
  episode: (json['episode'] as num?)?.toInt(),
  episodeName: json['episode_name'] as String,
  fullEpisodeId: json['full_episode_id'] as String?,
  logo: json['logo'] as String?,
);

Map<String, dynamic> _$EpisodeToJson(_Episode instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'url': instance.url,
  'season': instance.season,
  'episode': instance.episode,
  'episode_name': instance.episodeName,
  'full_episode_id': instance.fullEpisodeId,
  'logo': instance.logo,
};
