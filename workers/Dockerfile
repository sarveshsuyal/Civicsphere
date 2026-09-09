FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends clamav-daemon clamav-freshclam clamav && rm -rf /var/lib/apt/lists/*
COPY workers/requirements.txt /app/workers/requirements.txt
RUN pip install --no-cache-dir -r workers/requirements.txt && useradd --uid 10001 --create-home civic
COPY workers /app/workers
USER civic
ENV PYTHONUNBUFFERED=1 PROJ_NETWORK=OFF
CMD ["python", "-m", "workers.gis.runner"]
