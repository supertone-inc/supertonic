# Automotive Board Benchmark Container

This image runs only the Python Vietnamese text-normalization benchmark. Model assets are mounted from the host so the image stays small.

Build:

```bash
docker build -f Dockerfile.automotive -t supertonic-automotive-bench .
```

Run with constrained board-like resources. This is the recommended shared-board profile when ASR and an LLM also need CPU/RAM headroom:

```bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --cpus=2 \
  --memory=768m \
  --memory-swap=768m \
  --pids-limit=96 \
  -e OPENBLAS_NUM_THREADS=1 \
  -e MKL_NUM_THREADS=1 \
  -e NUMEXPR_NUM_THREADS=1 \
  -v "$PWD/assets:/app/assets:ro" \
  -v "$PWD/py/results:/app/py/results" \
  supertonic-automotive-bench \
  --config configs/vietnamese_text_normalization_automotive_low_memory.yaml
```

Run a fast smoke test:

```bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --cpus=2 \
  --memory=768m \
  --memory-swap=768m \
  --pids-limit=96 \
  -v "$PWD/assets:/app/assets:ro" \
  -v "$PWD/py/results:/app/py/results" \
  supertonic-automotive-bench \
  --config configs/vietnamese_text_normalization_automotive_low_memory.yaml \
  --max-cases 4
```

Run the latency/RTF profile if TTS is allowed to use more transient CPU/thread resources:

```bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --cpus=2 \
  --memory=768m \
  --memory-swap=768m \
  --pids-limit=96 \
  -v "$PWD/assets:/app/assets:ro" \
  -v "$PWD/py/results:/app/py/results" \
  supertonic-automotive-bench \
  --config configs/vietnamese_text_normalization_automotive_latency_rtf.yaml
```

Outputs are written under `py/results/vietnamese_tn_benchmark/`. The default output name includes a config fingerprint, so changing the benchmark config creates a different CSV/JSON/audio set.

Measured low-memory full run (`--cpus=2 --memory=768m`, 100 expanded cases):

- `cgroup_memory_after_max_mb`: about `443.6 MB`
- `rss_after_max_mb`: about `475 MB`
- `threads_after_max`: `1`
- `rtf_mean`: about `0.536`

The 1 CPU / 512 MB profile also runs, but RTF is worse and leaves less safety margin for OS/container accounting. Use it only as a fallback:

```bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --cpus=1 \
  --memory=512m \
  --memory-swap=512m \
  --pids-limit=64 \
  -v "$PWD/assets:/app/assets:ro" \
  -v "$PWD/py/results:/app/py/results" \
  supertonic-automotive-bench \
  --config configs/vietnamese_text_normalization_automotive_low_memory.yaml
```
