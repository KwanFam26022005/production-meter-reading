FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Pinned PaddleOCR inference source to verified deterministic commit
RUN git clone https://github.com/PaddlePaddle/PaddleOCR.git /opt/PaddleOCR \
    && cd /opt/PaddleOCR \
    && git checkout 2661c7c0ef5c613e8f93c6e93b2e052399f0f854

# Create non-root runtime user
RUN useradd -u 10001 -m -d /home/appuser appuser

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY backend/app /app/app

# Change ownership of application directory to non-root user
RUN chown -R appuser:appuser /app /opt/PaddleOCR

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
