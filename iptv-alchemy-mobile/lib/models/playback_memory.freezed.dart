// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'playback_memory.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PlaybackMemory {

@JsonKey(name: 'position') double get positionSeconds;@JsonKey(name: 'duration') double get durationSeconds;@JsonKey(name: 'updated_at') int get updatedAt;
/// Create a copy of PlaybackMemory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PlaybackMemoryCopyWith<PlaybackMemory> get copyWith => _$PlaybackMemoryCopyWithImpl<PlaybackMemory>(this as PlaybackMemory, _$identity);

  /// Serializes this PlaybackMemory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PlaybackMemory&&(identical(other.positionSeconds, positionSeconds) || other.positionSeconds == positionSeconds)&&(identical(other.durationSeconds, durationSeconds) || other.durationSeconds == durationSeconds)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,positionSeconds,durationSeconds,updatedAt);

@override
String toString() {
  return 'PlaybackMemory(positionSeconds: $positionSeconds, durationSeconds: $durationSeconds, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $PlaybackMemoryCopyWith<$Res>  {
  factory $PlaybackMemoryCopyWith(PlaybackMemory value, $Res Function(PlaybackMemory) _then) = _$PlaybackMemoryCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'position') double positionSeconds,@JsonKey(name: 'duration') double durationSeconds,@JsonKey(name: 'updated_at') int updatedAt
});




}
/// @nodoc
class _$PlaybackMemoryCopyWithImpl<$Res>
    implements $PlaybackMemoryCopyWith<$Res> {
  _$PlaybackMemoryCopyWithImpl(this._self, this._then);

  final PlaybackMemory _self;
  final $Res Function(PlaybackMemory) _then;

/// Create a copy of PlaybackMemory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? positionSeconds = null,Object? durationSeconds = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
positionSeconds: null == positionSeconds ? _self.positionSeconds : positionSeconds // ignore: cast_nullable_to_non_nullable
as double,durationSeconds: null == durationSeconds ? _self.durationSeconds : durationSeconds // ignore: cast_nullable_to_non_nullable
as double,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [PlaybackMemory].
extension PlaybackMemoryPatterns on PlaybackMemory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PlaybackMemory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PlaybackMemory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PlaybackMemory value)  $default,){
final _that = this;
switch (_that) {
case _PlaybackMemory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PlaybackMemory value)?  $default,){
final _that = this;
switch (_that) {
case _PlaybackMemory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'position')  double positionSeconds, @JsonKey(name: 'duration')  double durationSeconds, @JsonKey(name: 'updated_at')  int updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PlaybackMemory() when $default != null:
return $default(_that.positionSeconds,_that.durationSeconds,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'position')  double positionSeconds, @JsonKey(name: 'duration')  double durationSeconds, @JsonKey(name: 'updated_at')  int updatedAt)  $default,) {final _that = this;
switch (_that) {
case _PlaybackMemory():
return $default(_that.positionSeconds,_that.durationSeconds,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'position')  double positionSeconds, @JsonKey(name: 'duration')  double durationSeconds, @JsonKey(name: 'updated_at')  int updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _PlaybackMemory() when $default != null:
return $default(_that.positionSeconds,_that.durationSeconds,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PlaybackMemory implements PlaybackMemory {
  const _PlaybackMemory({@JsonKey(name: 'position') required this.positionSeconds, @JsonKey(name: 'duration') required this.durationSeconds, @JsonKey(name: 'updated_at') required this.updatedAt});
  factory _PlaybackMemory.fromJson(Map<String, dynamic> json) => _$PlaybackMemoryFromJson(json);

@override@JsonKey(name: 'position') final  double positionSeconds;
@override@JsonKey(name: 'duration') final  double durationSeconds;
@override@JsonKey(name: 'updated_at') final  int updatedAt;

/// Create a copy of PlaybackMemory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PlaybackMemoryCopyWith<_PlaybackMemory> get copyWith => __$PlaybackMemoryCopyWithImpl<_PlaybackMemory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PlaybackMemoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PlaybackMemory&&(identical(other.positionSeconds, positionSeconds) || other.positionSeconds == positionSeconds)&&(identical(other.durationSeconds, durationSeconds) || other.durationSeconds == durationSeconds)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,positionSeconds,durationSeconds,updatedAt);

@override
String toString() {
  return 'PlaybackMemory(positionSeconds: $positionSeconds, durationSeconds: $durationSeconds, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$PlaybackMemoryCopyWith<$Res> implements $PlaybackMemoryCopyWith<$Res> {
  factory _$PlaybackMemoryCopyWith(_PlaybackMemory value, $Res Function(_PlaybackMemory) _then) = __$PlaybackMemoryCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'position') double positionSeconds,@JsonKey(name: 'duration') double durationSeconds,@JsonKey(name: 'updated_at') int updatedAt
});




}
/// @nodoc
class __$PlaybackMemoryCopyWithImpl<$Res>
    implements _$PlaybackMemoryCopyWith<$Res> {
  __$PlaybackMemoryCopyWithImpl(this._self, this._then);

  final _PlaybackMemory _self;
  final $Res Function(_PlaybackMemory) _then;

/// Create a copy of PlaybackMemory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? positionSeconds = null,Object? durationSeconds = null,Object? updatedAt = null,}) {
  return _then(_PlaybackMemory(
positionSeconds: null == positionSeconds ? _self.positionSeconds : positionSeconds // ignore: cast_nullable_to_non_nullable
as double,durationSeconds: null == durationSeconds ? _self.durationSeconds : durationSeconds // ignore: cast_nullable_to_non_nullable
as double,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
