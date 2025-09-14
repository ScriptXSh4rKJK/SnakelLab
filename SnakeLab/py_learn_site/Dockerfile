# syntax=docker/dockerfile:1
FROM python:3.13-slim

# Set workdir
WORKDIR /app

# System deps (optional, keep minimal)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Environment
ENV PYTHONUNBUFFERED=1 \
    PORT=8080

# Expose port (for local runs; platforms like Fly/Cloud Run map dynamically)
EXPOSE 8080

# Run the app. Our app reads PORT env and binds 0.0.0.0
CMD ["python", "app.py"]
