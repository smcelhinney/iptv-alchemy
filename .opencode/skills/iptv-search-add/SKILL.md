---
name: iptv-search-add
description: Use when the user wants to search for movies or TV series in the IPTV index, browse results, add them to their library, and download missing TMDB metadata. Handles single or multiple items. Also use when asked to add content to a collection.
parameters:
  - name: query
    required: true
    prompt: "What movie or TV series would you like to search for?"
---

# IPTV Search, Add to Library & Enrich Metadata

Search the IPTV Meilisearch index for movies or TV series, optionally add
them to the user's library, and attach TMDB metadata. Supports single or
multiple items.

## Modes

### Browse / Search Only

If the user just wants to search or browse (e.g. "find me some sci-fi movies",
"what Star Trek series are available"), run step 1 and present the results.
Do not add to library or fetch metadata unless explicitly asked.

### Full Pipeline (Search → Add → Enrich)

If the user wants to add content (e.g. "add Inception to my library",
"download Interstellar with metadata"), run all steps below.

## Requirements

This skill requires a `query` parameter — a movie or TV series title to
search for. If invoked without one, prompt the user:

> What movie or TV series would you like to search for?

Do not proceed until a query is provided.

## Workflow

For each movie or series the user requests:

### 1. Search the index

Use `iptv_search_indexes` with the title (and optional year/type hints) to
find matching content. The tool searches across movies, series, and live TV
indices.

If multiple results come back and the correct one isn't obvious, show the
top matches and ask the user which one they mean.

### 2. Add to library

Use `iptv_add_to_library` with:
- `doc_id`: the document ID from the search result
- `content_type`: `"movie"`, `"series"`, or `"tv"` depending on what was found

Before adding, optionally check `iptv_get_library_entry` to see if it's
already in the library. If it is, skip this step and let the user know.

### 3. Download / attach metadata

After adding to the library, fetch existing metadata to check what's
already stored:

- For movies: `iptv_get_movie_metadata` with the doc `id`
- For series: `iptv_get_series_metadata` with the doc `id`

If metadata is missing or incomplete, trigger a TMDB lookup:

- For movies: `iptv_add_metadata_to_movie` with the `movieId`
- For series: `iptv_add_metadata_to_series` with the `seriesId`

This searches TMDB and attaches the first result's metadata (poster,
synopsis, ratings, cast, etc.).

### 4. Collection (optional)

If the user asks to add the content to a collection:

1. Use `iptv_find_collection_by_name` to locate the collection by name
2. Use `iptv_add_to_collection` with the `collection_id` and `doc_id`

If the collection doesn't exist, let the user know and ask if they want
to create it (or handle via other means).

## Multiple items

When the user provides a list of titles, process each one sequentially
through the appropriate steps. Report results as a summary table at the end:

| Title | Type | Added | Metadata |
|-------|------|-------|----------|
| ...   | ...  | ...   | ...      |

## Tips

- Use year hints in search queries to disambiguate (e.g. "Dune 2021")
- If a search returns no results, suggest the user check the spelling or
  note that the content may not be in the IPTV provider's catalog
- Series metadata includes all seasons/episodes; movies include poster,
  backdrop, overview, rating, release date, genres, and cast
- For browse-only queries, present a concise list with title, type, and
  year — don't overload with metadata unless asked
