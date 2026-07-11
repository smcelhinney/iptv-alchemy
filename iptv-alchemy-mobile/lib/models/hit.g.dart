// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'hit.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Hit _$HitFromJson(Map<String, dynamic> json) => _Hit(
  id: json['id'] as String,
  name: json['name'] as String?,
  category: json['category'] as String?,
  logo: json['logo'] as String?,
  url: json['url'] as String?,
  type: _contentTypeFromJson(json['type'] as String),
  seriesName: json['series_name'] as String?,
  episodeName: json['episode_name'] as String?,
  season: (json['season'] as num?)?.toInt(),
  episode: (json['episode'] as num?)?.toInt(),
  fullEpisodeId: json['full_episode_id'] as String?,
  movieName: json['movie_name'] as String?,
  year: (json['year'] as num?)?.toInt(),
  episodes: (json['episodes'] as List<dynamic>?)
      ?.map((e) => Episode.fromJson(e as Map<String, dynamic>))
      .toList(),
  episodeCount: (json['episode_count'] as num?)?.toInt(),
);

Map<String, dynamic> _$HitToJson(_Hit instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'category': instance.category,
  'logo': instance.logo,
  'url': instance.url,
  'type': _contentTypeToJson(instance.type),
  'series_name': instance.seriesName,
  'episode_name': instance.episodeName,
  'season': instance.season,
  'episode': instance.episode,
  'full_episode_id': instance.fullEpisodeId,
  'movie_name': instance.movieName,
  'year': instance.year,
  'episodes': instance.episodes,
  'episode_count': instance.episodeCount,
};
