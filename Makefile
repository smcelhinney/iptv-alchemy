.PHONY: run download process setup clean help up down restart reindex reindex-listings logs logs-search logs-meilisearch api

# Default target
all: run

help:
	@echo "Available targets:"
	@echo "  run              - Setup venv (if needed) and run iptv-alchemy (download + process)"
	@echo "  download         - Setup venv (if needed) and only download iptv.m3u and iptv.xml"
	@echo "  process          - Setup venv (if needed) and only process existing files"
	@echo "  reindex          - Setup venv (if needed) and re-populate Meilisearch content index"
	@echo "  reindex-listings - Setup venv (if needed) and re-populate programme listings index"
	@echo "  setup            - Create venv and install dependencies"
	@echo "  clean            - Remove virtual environment"
	@echo "  help             - Show this help message"
	@echo "  api              - Setup venv (if needed) and start Flask REST API server"

# Setup target - create venv and install dependencies
setup:
	@if [ ! -d "venv" ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv venv; \
	fi
	@echo "Activating virtual environment..."
	@source venv/bin/activate && \
	 pip install -q -r requirements.txt

# Download only - fetch iptv.m3u and iptv.xml
download: setup
	@source venv/bin/activate && \
	 python -m iptv.main --download-only && \
	 deactivate

# Process only - work with existing files
process: setup
	@source venv/bin/activate && \
	 python -m iptv.main --process-only && \
	 deactivate

# Download and process - default behavior
run: setup
	@source venv/bin/activate && \
	 python -m iptv.main && \
	 deactivate

# Clean up virtual environment
clean:
	@echo "Removing virtual environment..."
	@rm -rf venv

api: setup	## Start Flask REST API server
	@source venv/bin/activate && \
		python -m iptv.api

# Docker targets
up:		## Start all services (Meilisearch + search UI)
	docker-compose up -d

down:		## Stop all services
	docker-compose down

restart:	## Restart all services
	docker-compose restart

reindex: setup	## Re-populate Meilisearch index from downloaded files
	@source venv/bin/activate && \
		python -m iptv.main --reindex-only && \
		deactivate

reindex-listings: setup	## Re-populate programme listings index from EPG/XML
	@source venv/bin/activate && \
		python -m iptv.main --reindex-listings && \
		deactivate

logs:		## Show logs from all services
	docker-compose logs -f

logs-search:	## Show logs from search UI only
	docker-compose logs -f iptv-search-ui

logs-meilisearch:	## Show logs from Meilisearch only
	docker-compose logs -f iptv-meilisearch
