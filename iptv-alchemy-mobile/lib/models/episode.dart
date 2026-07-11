import 'package:freezed_annotation/freezed_annotation.dart';

part 'episode.freezed.dart';
part 'episode.g.dart';

@freezed
abstract class Episode with _$Episode {
  const factory Episode({
    required String id,
    required String name,
    required String url,
    int? season,
    int? episode,
    @JsonKey(name: 'episode_name') required String episodeName,
    @JsonKey(name: 'full_episode_id') String? fullEpisodeId,
    String? logo,
  }) = _Episode;

  factory Episode.fromJson(Map<String, Object?> json) =>
      _$EpisodeFromJson(json);
}
