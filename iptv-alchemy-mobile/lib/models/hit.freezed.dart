// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'hit.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Hit {

 String get id; String? get name; String? get category; String? get logo; String? get url;@JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson) ContentType get type;@JsonKey(name: 'series_name') String? get seriesName;@JsonKey(name: 'episode_name') String? get episodeName; int? get season; int? get episode;@JsonKey(name: 'full_episode_id') String? get fullEpisodeId;@JsonKey(name: 'movie_name') String? get movieName; int? get year; List<Episode>? get episodes;@JsonKey(name: 'episode_count') int? get episodeCount;
/// Create a copy of Hit
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HitCopyWith<Hit> get copyWith => _$HitCopyWithImpl<Hit>(this as Hit, _$identity);

  /// Serializes this Hit to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Hit&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.category, category) || other.category == category)&&(identical(other.logo, logo) || other.logo == logo)&&(identical(other.url, url) || other.url == url)&&(identical(other.type, type) || other.type == type)&&(identical(other.seriesName, seriesName) || other.seriesName == seriesName)&&(identical(other.episodeName, episodeName) || other.episodeName == episodeName)&&(identical(other.season, season) || other.season == season)&&(identical(other.episode, episode) || other.episode == episode)&&(identical(other.fullEpisodeId, fullEpisodeId) || other.fullEpisodeId == fullEpisodeId)&&(identical(other.movieName, movieName) || other.movieName == movieName)&&(identical(other.year, year) || other.year == year)&&const DeepCollectionEquality().equals(other.episodes, episodes)&&(identical(other.episodeCount, episodeCount) || other.episodeCount == episodeCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,category,logo,url,type,seriesName,episodeName,season,episode,fullEpisodeId,movieName,year,const DeepCollectionEquality().hash(episodes),episodeCount);

@override
String toString() {
  return 'Hit(id: $id, name: $name, category: $category, logo: $logo, url: $url, type: $type, seriesName: $seriesName, episodeName: $episodeName, season: $season, episode: $episode, fullEpisodeId: $fullEpisodeId, movieName: $movieName, year: $year, episodes: $episodes, episodeCount: $episodeCount)';
}


}

/// @nodoc
abstract mixin class $HitCopyWith<$Res>  {
  factory $HitCopyWith(Hit value, $Res Function(Hit) _then) = _$HitCopyWithImpl;
@useResult
$Res call({
 String id, String? name, String? category, String? logo, String? url,@JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson) ContentType type,@JsonKey(name: 'series_name') String? seriesName,@JsonKey(name: 'episode_name') String? episodeName, int? season, int? episode,@JsonKey(name: 'full_episode_id') String? fullEpisodeId,@JsonKey(name: 'movie_name') String? movieName, int? year, List<Episode>? episodes,@JsonKey(name: 'episode_count') int? episodeCount
});




}
/// @nodoc
class _$HitCopyWithImpl<$Res>
    implements $HitCopyWith<$Res> {
  _$HitCopyWithImpl(this._self, this._then);

  final Hit _self;
  final $Res Function(Hit) _then;

/// Create a copy of Hit
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = freezed,Object? category = freezed,Object? logo = freezed,Object? url = freezed,Object? type = null,Object? seriesName = freezed,Object? episodeName = freezed,Object? season = freezed,Object? episode = freezed,Object? fullEpisodeId = freezed,Object? movieName = freezed,Object? year = freezed,Object? episodes = freezed,Object? episodeCount = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,logo: freezed == logo ? _self.logo : logo // ignore: cast_nullable_to_non_nullable
as String?,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ContentType,seriesName: freezed == seriesName ? _self.seriesName : seriesName // ignore: cast_nullable_to_non_nullable
as String?,episodeName: freezed == episodeName ? _self.episodeName : episodeName // ignore: cast_nullable_to_non_nullable
as String?,season: freezed == season ? _self.season : season // ignore: cast_nullable_to_non_nullable
as int?,episode: freezed == episode ? _self.episode : episode // ignore: cast_nullable_to_non_nullable
as int?,fullEpisodeId: freezed == fullEpisodeId ? _self.fullEpisodeId : fullEpisodeId // ignore: cast_nullable_to_non_nullable
as String?,movieName: freezed == movieName ? _self.movieName : movieName // ignore: cast_nullable_to_non_nullable
as String?,year: freezed == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as int?,episodes: freezed == episodes ? _self.episodes : episodes // ignore: cast_nullable_to_non_nullable
as List<Episode>?,episodeCount: freezed == episodeCount ? _self.episodeCount : episodeCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [Hit].
extension HitPatterns on Hit {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Hit value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Hit() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Hit value)  $default,){
final _that = this;
switch (_that) {
case _Hit():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Hit value)?  $default,){
final _that = this;
switch (_that) {
case _Hit() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? name,  String? category,  String? logo,  String? url, @JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson)  ContentType type, @JsonKey(name: 'series_name')  String? seriesName, @JsonKey(name: 'episode_name')  String? episodeName,  int? season,  int? episode, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId, @JsonKey(name: 'movie_name')  String? movieName,  int? year,  List<Episode>? episodes, @JsonKey(name: 'episode_count')  int? episodeCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Hit() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.logo,_that.url,_that.type,_that.seriesName,_that.episodeName,_that.season,_that.episode,_that.fullEpisodeId,_that.movieName,_that.year,_that.episodes,_that.episodeCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? name,  String? category,  String? logo,  String? url, @JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson)  ContentType type, @JsonKey(name: 'series_name')  String? seriesName, @JsonKey(name: 'episode_name')  String? episodeName,  int? season,  int? episode, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId, @JsonKey(name: 'movie_name')  String? movieName,  int? year,  List<Episode>? episodes, @JsonKey(name: 'episode_count')  int? episodeCount)  $default,) {final _that = this;
switch (_that) {
case _Hit():
return $default(_that.id,_that.name,_that.category,_that.logo,_that.url,_that.type,_that.seriesName,_that.episodeName,_that.season,_that.episode,_that.fullEpisodeId,_that.movieName,_that.year,_that.episodes,_that.episodeCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? name,  String? category,  String? logo,  String? url, @JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson)  ContentType type, @JsonKey(name: 'series_name')  String? seriesName, @JsonKey(name: 'episode_name')  String? episodeName,  int? season,  int? episode, @JsonKey(name: 'full_episode_id')  String? fullEpisodeId, @JsonKey(name: 'movie_name')  String? movieName,  int? year,  List<Episode>? episodes, @JsonKey(name: 'episode_count')  int? episodeCount)?  $default,) {final _that = this;
switch (_that) {
case _Hit() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.logo,_that.url,_that.type,_that.seriesName,_that.episodeName,_that.season,_that.episode,_that.fullEpisodeId,_that.movieName,_that.year,_that.episodes,_that.episodeCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Hit implements Hit {
  const _Hit({required this.id, this.name, this.category, this.logo, this.url, @JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson) required this.type, @JsonKey(name: 'series_name') this.seriesName, @JsonKey(name: 'episode_name') this.episodeName, this.season, this.episode, @JsonKey(name: 'full_episode_id') this.fullEpisodeId, @JsonKey(name: 'movie_name') this.movieName, this.year, final  List<Episode>? episodes, @JsonKey(name: 'episode_count') this.episodeCount}): _episodes = episodes;
  factory _Hit.fromJson(Map<String, dynamic> json) => _$HitFromJson(json);

@override final  String id;
@override final  String? name;
@override final  String? category;
@override final  String? logo;
@override final  String? url;
@override@JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson) final  ContentType type;
@override@JsonKey(name: 'series_name') final  String? seriesName;
@override@JsonKey(name: 'episode_name') final  String? episodeName;
@override final  int? season;
@override final  int? episode;
@override@JsonKey(name: 'full_episode_id') final  String? fullEpisodeId;
@override@JsonKey(name: 'movie_name') final  String? movieName;
@override final  int? year;
 final  List<Episode>? _episodes;
@override List<Episode>? get episodes {
  final value = _episodes;
  if (value == null) return null;
  if (_episodes is EqualUnmodifiableListView) return _episodes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}

@override@JsonKey(name: 'episode_count') final  int? episodeCount;

/// Create a copy of Hit
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HitCopyWith<_Hit> get copyWith => __$HitCopyWithImpl<_Hit>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HitToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Hit&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.category, category) || other.category == category)&&(identical(other.logo, logo) || other.logo == logo)&&(identical(other.url, url) || other.url == url)&&(identical(other.type, type) || other.type == type)&&(identical(other.seriesName, seriesName) || other.seriesName == seriesName)&&(identical(other.episodeName, episodeName) || other.episodeName == episodeName)&&(identical(other.season, season) || other.season == season)&&(identical(other.episode, episode) || other.episode == episode)&&(identical(other.fullEpisodeId, fullEpisodeId) || other.fullEpisodeId == fullEpisodeId)&&(identical(other.movieName, movieName) || other.movieName == movieName)&&(identical(other.year, year) || other.year == year)&&const DeepCollectionEquality().equals(other._episodes, _episodes)&&(identical(other.episodeCount, episodeCount) || other.episodeCount == episodeCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,category,logo,url,type,seriesName,episodeName,season,episode,fullEpisodeId,movieName,year,const DeepCollectionEquality().hash(_episodes),episodeCount);

@override
String toString() {
  return 'Hit(id: $id, name: $name, category: $category, logo: $logo, url: $url, type: $type, seriesName: $seriesName, episodeName: $episodeName, season: $season, episode: $episode, fullEpisodeId: $fullEpisodeId, movieName: $movieName, year: $year, episodes: $episodes, episodeCount: $episodeCount)';
}


}

/// @nodoc
abstract mixin class _$HitCopyWith<$Res> implements $HitCopyWith<$Res> {
  factory _$HitCopyWith(_Hit value, $Res Function(_Hit) _then) = __$HitCopyWithImpl;
@override @useResult
$Res call({
 String id, String? name, String? category, String? logo, String? url,@JsonKey(fromJson: _contentTypeFromJson, toJson: _contentTypeToJson) ContentType type,@JsonKey(name: 'series_name') String? seriesName,@JsonKey(name: 'episode_name') String? episodeName, int? season, int? episode,@JsonKey(name: 'full_episode_id') String? fullEpisodeId,@JsonKey(name: 'movie_name') String? movieName, int? year, List<Episode>? episodes,@JsonKey(name: 'episode_count') int? episodeCount
});




}
/// @nodoc
class __$HitCopyWithImpl<$Res>
    implements _$HitCopyWith<$Res> {
  __$HitCopyWithImpl(this._self, this._then);

  final _Hit _self;
  final $Res Function(_Hit) _then;

/// Create a copy of Hit
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = freezed,Object? category = freezed,Object? logo = freezed,Object? url = freezed,Object? type = null,Object? seriesName = freezed,Object? episodeName = freezed,Object? season = freezed,Object? episode = freezed,Object? fullEpisodeId = freezed,Object? movieName = freezed,Object? year = freezed,Object? episodes = freezed,Object? episodeCount = freezed,}) {
  return _then(_Hit(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,logo: freezed == logo ? _self.logo : logo // ignore: cast_nullable_to_non_nullable
as String?,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ContentType,seriesName: freezed == seriesName ? _self.seriesName : seriesName // ignore: cast_nullable_to_non_nullable
as String?,episodeName: freezed == episodeName ? _self.episodeName : episodeName // ignore: cast_nullable_to_non_nullable
as String?,season: freezed == season ? _self.season : season // ignore: cast_nullable_to_non_nullable
as int?,episode: freezed == episode ? _self.episode : episode // ignore: cast_nullable_to_non_nullable
as int?,fullEpisodeId: freezed == fullEpisodeId ? _self.fullEpisodeId : fullEpisodeId // ignore: cast_nullable_to_non_nullable
as String?,movieName: freezed == movieName ? _self.movieName : movieName // ignore: cast_nullable_to_non_nullable
as String?,year: freezed == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as int?,episodes: freezed == episodes ? _self._episodes : episodes // ignore: cast_nullable_to_non_nullable
as List<Episode>?,episodeCount: freezed == episodeCount ? _self.episodeCount : episodeCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
