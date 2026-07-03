FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    requests>=2.31.0 \
    lxml>=4.9.0 \
    python-dotenv>=1.0.0 \
    meilisearch>=0.31.0 \
    flask>=3.0.0 \
    flask-cors>=4.0.0 \
    redis>=5.0.0

COPY . iptv/

EXPOSE 5555

CMD ["python", "-m", "iptv.api"]
