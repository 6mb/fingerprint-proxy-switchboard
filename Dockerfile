FROM node:20-alpine AS web-builder

WORKDIR /app/web-ui

COPY web-ui/package*.json ./
RUN npm ci

COPY web-ui/ ./
RUN npm run build

FROM python:3.9-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts
COPY --from=web-builder /app/web-ui/dist ./app/static

EXPOSE 6310

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "6310"]
