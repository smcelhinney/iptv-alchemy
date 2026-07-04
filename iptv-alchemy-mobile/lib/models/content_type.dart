enum ContentType {
  movie,
  series,
  liveTv,
}

extension ContentTypeName on ContentType {
  String get displayName {
    switch (this) {
      case ContentType.movie:
        return 'Movies';
      case ContentType.series:
        return 'Shows';
      case ContentType.liveTv:
        return 'Live TV';
    }
  }
}
