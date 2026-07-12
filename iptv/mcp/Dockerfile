FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastmcp>=3.0.0 \
    uvicorn>=0.30.0 \
    requests>=2.31.0

COPY server.py .

EXPOSE 8000

CMD ["python", "server.py"]
