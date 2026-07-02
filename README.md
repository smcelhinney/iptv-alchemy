# iptv-alchemy

> **Status: beta (v0.0.1)** — this is an early pre-release. Expect rough edges
> and breaking changes before 1.0. Bug reports and PRs are welcome!

iptv-alchemy downloads M3U playlists and XMLTV EPG data from an
[Xtream Codes](https://xtream-ui.org/) compatible provider, filters channels
by category, builds a searchable catalog of live TV / movies / series, and can
generate `.strm` files so media servers (Emby, Jellyfin) can index and play
the on-demand content.

## Features

- Downloads and ETag-caches M3U + XMLTV from your Xtream provider
- Filters live TV by category, exposes a clean filtered `output.m3u`/`output.xml`
- Full-text search over channels, VOD and EPG listings via [Meilisearch](https://www.meilisearch.com/)
- REST API (Flask) driving an asynchronous task runner
- React + Vite search UI (InstantSearch)
- Optional integrations: TMDB metadata, OpenSubtitles, Emby/Jellyfin library refresh
- Docker Compose stack for one-command bring-up

---

## Prerequisites

Make sure the following are installed before you start.

| Tool | Minimum | Why | Check |
| --- | --- | --- | --- |
| **Docker** (with Compose v2) | 24.x | Runs Meilisearch, Redis, API and UI containers | `docker --version` |
| **Docker Compose** | v2.20+ | Orchestrates the stack | `docker compose version` |
| **Git** | 2.30+ | Clone the repo | `git --version` |

That's all you need for the **Docker** path, which is recommended.

### Running locally without Docker

If you want to run the Python processor or Flask API directly on your host:

| Tool | Minimum | Why |
| --- | --- | --- |
| **Python** | 3.11 | Processor + API runtime |
| **pip** | 23.x | Install Python deps |
| **Redis** | 7.x | Config & category cache |
| **Meilisearch** | 1.12 | Search backend |
| **Node.js** | 20.x | Only if building the UI from source |
| **npm** | 10.x | Only if building the UI from source |

An **Xtream Codes** account with a provider is required for any of this to be
useful — you need a server URL, username and password from your provider.

---

## Quick start (Docker)

1. **Clone the repo**

   ```bash
   git clone https://github.com/smcelhinney/iptv-alchemy.git
   cd iptv-alchemy
   ```

2. **Create your `.env` file**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in **at minimum**:

   ```env
   XTREAM_SERVER_URL=http://your-provider.example.com
   XTREAM_USERNAME=your_username
   XTREAM_PASSWORD=your_password
   MEILISEARCH_KEY=iptv-alchemy-default-key
   ```

   See `.env.example` for all supported variables (TMDB, OpenSubtitles,
   Emby/Jellyfin, host-mount paths, Docker tuning, proxy network, etc.).
   These are seed values only — once the store is populated they can be managed
   via Admin → Configuration in the UI.

3. **(Optional) Point the API at your media library**

   By default `.strm` files are written under `./media/...` inside the
   container. To have them land in your existing Emby/Jellyfin library, set
   these in `.env`:

   ```env
   MOVIES_DIR=/path/to/your/movies
   TV_DIR=/path/to/your/tv
   PRIVATE_DIR=/path/to/your/private
   ```

4. **Build and start the stack**

   ```bash
   docker compose up -d --build
   ```

   This starts four services:

   | Service | Port | Purpose |
   | --- | --- | --- |
   | `iptv-meilisearch` | 7700 | Search backend |
   | `iptv-redis` | — | Config, categories & user settings |
   | `iptv-api` | 5555 | Flask REST API + processor |
   | `iptv-search-ui` | 80 | React UI served by nginx |

5. **Open the UI and finish onboarding**

   Visit `http://localhost/` (or the `iptv-search-ui` container's host/port).
   The first-run wizard will guide you through validating your Xtream
   credentials, choosing output directories, selecting categories and running
   the initial download + index.

---

## Running the processor manually

The Python processor can be invoked directly (useful for cron jobs or one-off
runs), independent of the API/UI.

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download + extract categories + reindex + rebuild output files
python -m iptv.main

# Or run individual stages:
python -m iptv.main --download-only         # just fetch iptv.m3u / iptv.xml
python -m iptv.main --process-only          # rebuild output files from cache
python -m iptv.main --extract-categories    # refresh Redis category cache
python -m iptv.main --reindex-only          # rebuild all Meilisearch indices
python -m iptv.main --reindex-listings      # rebuild EPG listings index only
```

A Makefile wraps the most common flows: `make run`, `make download`,
`make process`, `make reindex`, `make api`, `make up`, `make down`.

### Flask API standalone

```bash
python -m iptv.api          # listens on 0.0.0.0:5555 (override with API_PORT)
```

---

## Configuration

Configuration is split into two Redis-backed namespaces:

| Namespace | Prefix | Managed from | Purpose |
| --- | --- | --- | --- |
| **Config** | `config:` | `.env` seed + Admin → Configuration | Server-wide operational settings (XTREAM, Meilisearch, media servers, TMDB, OpenSubtitles, output dirs) |
| **Settings** | `settings:` | User settings drawer | Per-viewer preferences (subtitle size, subtitle offset) |

On API startup the **config store** is seeded with sensible defaults (overlaid
with any values found in `.env`) if it is empty. Runtime changes made via the
UI or Admin API write straight back to Redis. The **settings store** is empty
by default — each key falls back to a client-side default (`normal` for
subtitle size, `0ms` for offset).

Onboarding is automatically bypassed if valid Xtream credentials
(`XTREAM_SERVER_URL` + `XTREAM_USERNAME` + `XTREAM_PASSWORD`) are already
present in the store — handy for pre-configured or headless deployments.

### Config layers

1. **`.env`** — credentials and host settings (seed source only). Copied from
   `.env.example`. Each key is written with `SETNX` so already-populated values
   are never overwritten. Once seeded, the `.env` is no longer read in the
   container (manage via Admin → Configuration instead).
2. **Redis config store** — the single source of truth at runtime. Edited via
   the onboarding wizard, Admin → Configuration, or `PUT /api/config`.

### Notable config keys

| Key | Default | Editable via UI |
| --- | --- | --- |
| `should_overwrite_output` | `1` | — |
| `output_directory` | `./output` | Yes |
| `tv_output_directory` | `./output/media/tv` | Yes |
| `movies_output_directory` | `./output/media/movies` | Yes |

Other keys (`epg_guide_prev_days`, `epg_guide_next_days`, `livetv_categories`,
`exclude_categories`) are seeded with sensible defaults but are not surfaced
in the UI — override them via `PUT /api/config` if needed.

---

## Project layout

```
.
├── iptv/                 # Python package: processor, API, indexers
│   ├── main.py           # CLI entrypoint + orchestrator
│   ├── api.py            # Flask REST API
│   ├── Dockerfile        # API container image
│   └── ...
├── search-ui/            # React + Vite + InstantSearch front-end
│   └── Dockerfile
├── docker-compose.yml    # Meilisearch + Redis + API + UI
├── requirements.txt
└── .env.example          # Copy to .env and fill in
```

Generated at runtime (all gitignored):

- `output/` — downloaded M3U/XMLTV, generated `output.m3u` / `output.xml`,
  and `.strm` files under `output/media/...`
- `data/` — SQLite config cache
- `meilisearch_data/`, `redis_data/` — service volumes

---

## Caching

Downloads use HTTP `ETag` headers so unchanged files are skipped on subsequent
runs. To force a fresh download, delete the cache:

```bash
rm output/.etags.json
```

---

## Troubleshooting

- **Onboarding doesn't appear / missing credentials** — confirm `env_file: .env`
  is present in `docker-compose.yml` and that you restarted with
  `docker compose up -d`. Xtream credentials can also be set directly via
  Admin → Configuration after onboarding.
- **UI loads but search returns nothing** — onboarding hasn't finished a
  download + reindex yet. Trigger both from the UI, or run
  `docker compose exec iptv-api python -m iptv.main`.
- **Permission denied writing `.strm` files** — the host path mounted at
  `/external/*` isn't writable by the container. Re-check `MOVIES_DIR` /
  `TV_DIR` / `PRIVATE_DIR` and the mount permissions.
- **`Redis not available`** — make sure the `redis` container is healthy
  (`docker compose ps`) and `REDIS_URL` points at it.

---

## Contributing

This is a beta release — issues and pull requests are very welcome. Please
open an issue first to discuss any significant change before sending a PR.

## License

[MIT](LICENSE).
