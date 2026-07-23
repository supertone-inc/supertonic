FROM python:3.11-slim
RUN pip install --no-cache-dir 'supertonic[serve]'
RUN supertonic download
EXPOSE 7788
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7788/v1/health')" || exit 1
CMD ["supertonic", "serve", "--host", "0.0.0.0", "--port", "7788"]