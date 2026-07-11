// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'episode.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Episode {

 String get id; String get name; String get url; int? get season; int? get episode;@JsonKey(name: 'episode_name') String get episodeName;@JsonKey(name: 'full_episode_id') String? get fullEpisodeId; String? get logo;
/// Create a copy of Episode
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EpisodeCopyWith<Episode> get copyWith => _$EpisodeCopyWithImpl<Episode>(this as Episode, _$identity);

  /// Serializes this Episode to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Episode&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.url, url) || other.url == url)&&(identical(other.season, season) || other.season == season)&&(identical(other.episode, episode) || other.episode == episode)&&(identical(other.episodeName, episodeName) || other.episodeName == episodeName)&&(identical(other.fullEpisodeId, fullEpisodeId) || other.fullEpisodeId == fullEpisodeId)&&(identical(other.logo, logo) || other.logo == logo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,url,season,episode,episodeName,fullEpisodeId,logo);

@override
String toString() {
  return 'Episode(id: $id, name: $name, url: $url, season: $season, episode: $episode, episodeName: $episodeName, fullEpisodeId: $fullEpisodeId, logo: $logo)';
}


}

/// @nodoc
abstract mixin class $EpisodeCopyWith<$Res>  {
  factory $EpisodeCopyWith(Episode value, $Res Function(Episode) _then) = _$EpisodeCopyWithImpl;
@useResult
$Res call({
 String id, String name, String url, int? season, int? episode,@JsonKey(name: 'episode_name') String episodeName,@JsonKey(name: 'full_episode_id') String? fullEpisodeId, String? logo
});




}
/// @nodoc
class _$EpisodeCopyWithImpl<$Res>
    implements $EpisodeCopyWith<$Res> {
  _$EpisodeCopyWithImpl(this._self, this._then);

  final Episode _self;
  final $Res Function(Episode) _then;

/// Create a copy of Episode
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? url = null,Object? season = freezed,Object? episode = freezed,Object? episodeName = null,Object? fullEpisodeId = freezed,Object? logo = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,season: freezed == season ? _self.season : season // ignore: cast_nullable_to_non_nullable
as int?,episode: freezed == episode ? _self.episode : episode // ignore: cast_nullable_to_non_nullable
as int?,episodeName: null == episodeName ? _self.episodeName : episodeName // ignore: cast_nullable_to_non_nullable
as String,fullEpisodeId: freezed == fullEpisodeId ? _self.fullEpisodeId : fullEpisodeId // ignore: cast_nullable_to_non_nullable
as String?,logo: freezed == logo ? _self.logo : logo // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Episode].
extension EpisodePatterns on Episode {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Episode value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Episode() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Episode value)  $default,){
final _that = this;
switch (_that) {
case _Episode():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Episode value)?  $default,){
final _that = this;
switch (_that) {
case _Episode() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String url,  int? season,  int? episode, @JsonKey(name: 'episode_name')  String episodeName, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId,  String? logo)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Episode() when $default != null:
return $default(_that.id,_that.name,_that.url,_that.season,_that.episode,_that.episodeName,_that.fullEpisodeId,_that.logo);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String url,  int? season,  int? episode, @JsonKey(name: 'episode_name')  String episodeName, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId,  String? logo)  $default,) {final _that = this;
switch (_that) {
case _Episode():
return $default(_that.id,_that.name,_that.url,_that.season,_that.episode,_that.episodeName,_that.fullEpisodeId,_that.logo);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String url,  int? season,  int? episode, @JsonKey(name: 'episode_name')  String episodeName, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId,  String? logo)?  $default,) {final _that = this;
switch (_that) {
case _Episode() when $default != null:
return $default(_that.id,_that.name,_that.url,_that.season,_that.episode,_that.episodeName,_that.fullEpisodeId,_that.logo);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Episode implements Episode {
  const _Episode({required this.id, required this.name, required this.url, this.season, this.episode, @JsonKey(name: 'episode_name') required this.episodeName, @JsonKey(name: 'full_episode_id') this.fullEpisodeId, this.logo});
  factory _Episode.fromJson(Map<String, dynamic> json) => _$EpisodeFromJson(json);

@override final  String id;
@override final  String name;
@override final  String url;
@override final  int? season;
@override final  int? episode;
@override@JsonKey(name: 'episode_name') final  String episodeName;
@override@JsonKey(name: 'full_episode_id') final  String? fullEpisodeId;
@override final  String? logo;

/// Create a copy of Episode
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EpisodeCopyWith<_Episode> get copyWith => __$EpisodeCopyWithImpl<_Episode>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EpisodeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Episode&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.url, url) || other.url == url)&&(identical(other.season, season) || other.season == season)&&(identical(other.episode, episode) || other.episode == episode)&&(identical(other.episodeName, episodeName) || other.episodeName == episodeName)&&(identical(other.fullEpisodeId, fullEpisodeId) || other.fullEpisodeId == fullEpisodeId)&&(identical(other.logo, logo) || other.logo == logo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,url,season,episode,episodeName,fullEpisodeId,logo);

@override
String toString() {
  return 'Episode(id: $id, name: $name, url: $url, season: $season, episode: $episode, episodeName: $episodeName, fullEpisodeId: $fullEpisodeId, logo: $logo)';
}


}

/// @nodoc
abstract mixin class _$EpisodeCopyWith<$Res> implements $EpisodeCopyWith<$Res> {
  factory _$EpisodeCopyWith(_Episode value, $Res Function(_Episode) _then) = __$EpisodeCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String url, int? season, int? episode,@JsonKey(name: 'episode_name') String episodeName,@JsonKey(name: 'full_episode_id') String? fullEpisodeId, String? logo
});




}
/// @nodoc
class __$EpisodeCopyWithImpl<$Res>
    implements _$EpisodeCopyWith<$Res> {
  __$EpisodeCopyWithImpl(this._self, this._then);

  final _Episode _self;
  final $Res Function(_Episode) _then;

/// Create a copy of Episode
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? url = null,Object? season = freezed,Object? episode = freezed,Object? episodeName = null,Object? fullEpisodeId = freezed,Object? logo = freezed,}) {
  return _then(_Episode(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,season: freezed == season ? _self.season : season // ignore: cast_nullable_to_non_nullable
as int?,episode: freezed == episode ? _self.episode : episode // ignore: cast_nullable_to_non_nullable
as int?,episodeName: null == episodeName ? _self.episodeName : episodeName // ignore: cast_nullable_to_non_nullable
as String,fullEpisodeId: freezed == fullEpisodeId ? _self.fullEpisodeId : fullEpisodeId // ignore: cast_nullable_to_non_nullable
as String?,logo: freezed == logo ? _self.logo : logo // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
