FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/data /app/cache
ENV PYTHONPATH="/app/node-agent:/app/control-plane:/app/api-gateway:/app"
CMD ["sh", "-c", "cd /app/node-agent && uvicorn agent.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
