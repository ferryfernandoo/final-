---
name: docker-containers-ci-cd-pipeline
description: "Skill perancangan Dockerfile multi-stage yang ringan dan aman (non-root user), docker-compose.yml dengan healthcheck, serta pipeline CI/CD GitHub Actions untuk pengujian otomatis."
---

# Docker Multi-Stage Containers & CI/CD Pipeline Pro

## Template `Dockerfile` Python Produksi (Aman & Ringan)
```dockerfile
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
EXPOSE 8000
CMD ["python3", "-m", "app.main"]
```
