import 'package:freezed_annotation/freezed_annotation.dart';

import 'content_type.dart';
import 'episode.dart';

part 'hit.freezed.dart';
part 'hit.g.dart';

@freezed
abstract class Hit with _$Hit {
  const factory Hit({
    required String id,
    String? name,
    String? category,
    String? logo,
    required String url,
    @JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson)
    required ContentType type,
    @JsonKey(name: 'series_name') String? seriesName,
    @JsonKey(name: 'episode_name') String? episodeName,
    int? season,
    int? episode,
    @JsonKey(name: 'full_episode_id') String? fullEpisodeId,
    @JsonKey(name: 'movie_name') String? movieName,
    int? year,
    List<Episode>? episodes,
    @JsonKey(name: 'episode_count') int? episodeCount,
  }) = _Hit;

  factory Hit.fromJson(Map<String, Object?> json) => _$HitFromJson(json);
}

ContentType _contentTypeFromJson(String value) {
  switch (value) {
    case 'movie':
      return ContentType.movie;
    case 'series':
      return ContentType.series;
    case 'live_tv':
      return ContentType.liveTv;
    default:
      return ContentType.movie;
  }
}

String _contentTypeToJson(ContentType type) {
  switch (type) {
    case ContentType.movie:
      return 'movie';
    case ContentType.series:
      return 'series';
    case ContentType.liveTv:
      return 'live_tv';
  }
}
