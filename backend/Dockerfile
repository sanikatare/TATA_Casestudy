# Backend Dockerfile for AUTOSAR HLD Analysis Assistant
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (build-essential, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY backend /app/backend
COPY data /app/data

ENV PYTHONPATH=/app
ENV PORT=8000
ENV BACKEND_HOST=0.0.0.0

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
