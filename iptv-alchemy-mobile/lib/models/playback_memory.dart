import 'package:freezed_annotation/freezed_annotation.dart';

part 'playback_memory.freezed.dart';
part 'playback_memory.g.dart';

@freezed
abstract class PlaybackMemory with _$PlaybackMemory {
  const factory PlaybackMemory({
    @JsonKey(name: 'position') required double positionSeconds,
    @JsonKey(name: 'duration') required double durationSeconds,
    @JsonKey(name: 'updated_at') required int updatedAt,
  }) = _PlaybackMemory;

  factory PlaybackMemory.fromJson(Map<String, Object?> json) =>
      _$PlaybackMemoryFromJson(json);
}
