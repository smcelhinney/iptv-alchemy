// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'library.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Library {

 List<Hit> get movies; List<Hit> get series;@JsonKey(name: 'tv_channels') List<Hit> get tvChannels;
/// Create a copy of Library
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LibraryCopyWith<Library> get copyWith => _$LibraryCopyWithImpl<Library>(this as Library, _$identity);

  /// Serializes this Library to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Library&&const DeepCollectionEquality().equals(other.movies, movies)&&const DeepCollectionEquality().equals(other.series, series)&&const DeepCollectionEquality().equals(other.tvChannels, tvChannels));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(movies),const DeepCollectionEquality().hash(series),const DeepCollectionEquality().hash(tvChannels));

@override
String toString() {
  return 'Library(movies: $movies, series: $series, tvChannels: $tvChannels)';
}


}

/// @nodoc
abstract mixin class $LibraryCopyWith<$Res>  {
  factory $LibraryCopyWith(Library value, $Res Function(Library) _then) = _$LibraryCopyWithImpl;
@useResult
$Res call({
 List<Hit> movies, List<Hit> series,@JsonKey(name: 'tv_channels') List<Hit> tvChannels
});




}
/// @nodoc
class _$LibraryCopyWithImpl<$Res>
    implements $LibraryCopyWith<$Res> {
  _$LibraryCopyWithImpl(this._self, this._then);

  final Library _self;
  final $Res Function(Library) _then;

/// Create a copy of Library
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? movies = null,Object? series = null,Object? tvChannels = null,}) {
  return _then(_self.copyWith(
movies: null == movies ? _self.movies : movies // ignore: cast_nullable_to_non_nullable
as List<Hit>,series: null == series ? _self.series : series // ignore: cast_nullable_to_non_nullable
as List<Hit>,tvChannels: null == tvChannels ? _self.tvChannels : tvChannels // ignore: cast_nullable_to_non_nullable
as List<Hit>,
  ));
}

}


/// Adds pattern-matching-related methods to [Library].
extension LibraryPatterns on Library {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Library value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Library() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Library value)  $default,){
final _that = this;
switch (_that) {
case _Library():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Library value)?  $default,){
final _that = this;
switch (_that) {
case _Library() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Hit> movies,  List<Hit> series, @JsonKey(name: 'tv_channels')  List<Hit> tvChannels)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Library() when $default != null:
return $default(_that.movies,_that.series,_that.tvChannels);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Hit> movies,  List<Hit> series, @JsonKey(name: 'tv_channels')  List<Hit> tvChannels)  $default,) {final _that = this;
switch (_that) {
case _Library():
return $default(_that.movies,_that.series,_that.tvChannels);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Hit> movies,  List<Hit> series, @JsonKey(name: 'tv_channels')  List<Hit> tvChannels)?  $default,) {final _that = this;
switch (_that) {
case _Library() when $default != null:
return $default(_that.movies,_that.series,_that.tvChannels);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Library implements Library {
  const _Library({required final  List<Hit> movies, required final  List<Hit> series, @JsonKey(name: 'tv_channels') required final  List<Hit> tvChannels}): _movies = movies,_series = series,_tvChannels = tvChannels;
  factory _Library.fromJson(Map<String, dynamic> json) => _$LibraryFromJson(json);

 final  List<Hit> _movies;
@override List<Hit> get movies {
  if (_movies is EqualUnmodifiableListView) return _movies;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_movies);
}

 final  List<Hit> _series;
@override List<Hit> get series {
  if (_series is EqualUnmodifiableListView) return _series;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_series);
}

 final  List<Hit> _tvChannels;
@override@JsonKey(name: 'tv_channels') List<Hit> get tvChannels {
  if (_tvChannels is EqualUnmodifiableListView) return _tvChannels;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tvChannels);
}


/// Create a copy of Library
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LibraryCopyWith<_Library> get copyWith => __$LibraryCopyWithImpl<_Library>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LibraryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Library&&const DeepCollectionEquality().equals(other._movies, _movies)&&const DeepCollectionEquality().equals(other._series, _series)&&const DeepCollectionEquality().equals(other._tvChannels, _tvChannels));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_movies),const DeepCollectionEquality().hash(_series),const DeepCollectionEquality().hash(_tvChannels));

@override
String toString() {
  return 'Library(movies: $movies, series: $series, tvChannels: $tvChannels)';
}


}

/// @nodoc
abstract mixin class _$LibraryCopyWith<$Res> implements $LibraryCopyWith<$Res> {
  factory _$LibraryCopyWith(_Library value, $Res Function(_Library) _then) = __$LibraryCopyWithImpl;
@override @useResult
$Res call({
 List<Hit> movies, List<Hit> series,@JsonKey(name: 'tv_channels') List<Hit> tvChannels
});




}
/// @nodoc
class __$LibraryCopyWithImpl<$Res>
    implements _$LibraryCopyWith<$Res> {
  __$LibraryCopyWithImpl(this._self, this._then);

  final _Library _self;
  final $Res Function(_Library) _then;

/// Create a copy of Library
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? movies = null,Object? series = null,Object? tvChannels = null,}) {
  return _then(_Library(
movies: null == movies ? _self._movies : movies // ignore: cast_nullable_to_non_nullable
as List<Hit>,series: null == series ? _self._series : series // ignore: cast_nullable_to_non_nullable
as List<Hit>,tvChannels: null == tvChannels ? _self._tvChannels : tvChannels // ignore: cast_nullable_to_non_nullable
as List<Hit>,
  ));
}


}

// dart format on
