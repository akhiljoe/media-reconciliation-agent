FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5000

# System deps for OCR (tesseract) and PDF text fallback (poppler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Non-root user. Pre-create writable runtime dirs so the app does not need to
# create them at start (it does not have permission to make them under root-owned /tmp).
RUN useradd --create-home --uid 1000 --shell /bin/bash appuser \
    && mkdir -p /tmp/uploads /tmp/output \
    && chown -R appuser:appuser /tmp/uploads /tmp/output

WORKDIR /app

# Install Python deps first for better layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code with appuser ownership
COPY --chown=appuser:appuser . .

# Drop to non-root for runtime
USER appuser

EXPOSE 5000

# Healthcheck hits the public /api/health route
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request, sys; \
    sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=4).status == 200 else sys.exit(1)" \
    || exit 1

# 2 workers fits comfortably in 1 GiB. Each worker may load CrewAI on demand.
# Increase workers only if you also bump memory.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 app:app"]
