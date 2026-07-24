# TTS ONNX Inference Examples

This guide provides examples for running TTS inference using `example_onnx`.

## Swift Implementation with CPU, GPU, and CoreML support

ONNX Runtime's **CoreML Execution Provider** delegates supported graph subgraphs to Apple's CoreML framework, which can dispatch operators to the CPU, GPU, or Neural Engine (ANE).

To get started, open a terminal and run `make setup`.

Prerequisites: [brew](https://brew.sh/) for installing `git-lfs`

After setup, run: `make run-release` to build and execute the optimized release version of the example.

Edit `./Sources/ExampleONNX.swift` to customize the input text, language, voice style, and other parameters. Adjust `makeORTSessionOptions` in `./Sources/Helper.swift` for different CoreML compute unit configurations. The `SchedulerBoost` class and `setTaskForegroundRole` method implement special optimizations for low-latency inference on Apple Silicon. 

### Performance

Measured on a Macbook Air M4:

```bash
=== Performance / Thermal Summary (4 runs) ===
  Compute units: ALL
  Denoising steps: 8
  Batch size: 1
  Intra-op threads: 2 (with spinning)
  RTF: avg=0.174  min=0.173  max=0.175
  RTF first-half avg: 0.174
  RTF second-half avg: 0.175
  RTF drift under load: +0.3%
  Process RAM: avg=541.5 MB  peak=544.4 MB
  Thermal: nominal → nominal (worst: nominal)  LowPower: no
  CPU: avg 2.00 cores (20% of 10 cores)
===================================================
```

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make setup` | Install git-lfs and download ONNX models/voice styles into `assets/` and `assets/voice_styles/` |
| `make build` | Build the project (debug configuration) |
| `make run` | Run TTS inference (debug build) |
| `make run-release` | Build and run inference (optimized for benchmarking) |
| `make clean` | Clears CoreML compiled model cache and build artifacts |

### Compute Units

| Value | Hardware Used | Description |
|-------|--------------|-------------|
| `ALL` | CPU + GPU + ANE | DEFAULT - CoreML freely chooses any available hardware. Maximum acceleration, but may be slower due to scheduling overhead. |
| `CPU` | CPU only | Pure CPU inference (no CoreML EP). It's quite fast and most reliable. |
| `CPUAndGPU` | CPU + GPU | CoreML may dispatch to CPU or GPU. Good balance of speed and compatibility. |
| `CPUAndNeuralEngine` | CPU + ANE | CoreML may dispatch to CPU or Neural Engine. Best for on-device ML workloads. |
| `CPUOnly` | CPU (via CoreML) | CoreML EP is registered but restricted to CPU operators only. Useful for testing CoreML graph partitioning without GPU/ANE. |

### Model Routing

Not all models benefit from CoreML. This implementation uses **smart model routing**:

| Model | Engine | Reason |
|-------|--------|--------|
| `duration_predictor` | CPU | Small model; CoreML partition overhead outweighs benefit |
| `text_encoder` | CPU | Runs once; CPU is fast enough |
| `vector_estimator` | CPU | **Runs inside the denoising loop** — CoreML overhead times `totalStep` |
| `vocoder` | CoreML (configurable) | Largest model; benefits most from GPU/ANE acceleration |

### Fallback Decision Flow

When a CoreML compute unit is requested, the system attempts session creation with automatic fallback:

```mermaid
flowchart TD
    A[User requests compute unit] --> B{computeUnits == "CPU"?}
    B -->|Yes| CPU[Create CPU-only session<br/>no CoreML EP]
    B -->|No| C{CoreML EP<br/>available?}
    C -->|No| WARN[Warning: CoreML not available<br/>Fallback to CPU]
    WARN --> CPU
    C -->|Yes| D[Try user-specified<br/>compute unit first]
    D --> E{Session<br/>created?}
    E -->|Yes| SUCCESS[✓ Using requested CoreML config]
    E -->|No| F[Try next fallback tier]
    F --> G{More tiers<br/>remaining?}
    G -->|Yes| D2[Try next compute unit]
    D2 --> E
    G -->|No| FALLBACK[Warning: All CoreML tiers failed<br/>Fallback to CPU]
    FALLBACK --> CPU
```

**Fallback tier order** (user-specified tier is always tried first):

1. User-specified compute unit (e.g., `CPUAndNeuralEngine`)
2. Remaining CoreML tiers: `CPUAndNeuralEngine` → `ALL` → `CPUAndGPU` → `CPUOnly`
3. Pure CPU (no CoreML EP)

### Usage Examples (Without Makefile)

```bash
# Default: ALL (CPU + GPU + ANE with smart routing)
.build/release/example_onnx

# CoreML on vocoder with CPU + GPU
.build/release/example_onnx --compute-units CPUAndGPU

# CoreML on vocoder with CPU + Apple Neural Engine
.build/release/example_onnx --compute-units CPUAndNeuralEngine

# Release build for benchmarking with many iterations
swift run -c release example_onnx --n-test 16
```

### Threading and QoS

The `--threads` flag controls ORT's `intra_op_num_threads` (parallelism inside each compute node). When set above `0`, thread spinning is also enabled for lower latency at the cost of higher CPU/power usage.

| Value | Behavior |
|-------|----------|
| `2` | (default) Best monitored value. |
| `0` (default) | ORT auto-selects based on physical cores. ORT doesn't do this right, so `2` is recommended. |

### Performance Tips

1. **Always benchmark with release builds and `powerWatts` disabled** — Also, when on low battery, macOS will disable the performance cores.
2. **Reduce `--total-step`** — The `vector_estimator` runs once per step, so latency scales near-linearly (16 → 8 steps ≈ 50% faster). 6 steps sound okayish still and drop RTF ~`1.35` on a Macbook Air M4.
3. **Clear CoreML cache** if you encounter `error code: -7` (corrupted compiled model):
   ```bash
   make clean
   ```
4. **Tune `--threads` carefully** - Maybe your setup diverges and benefits from more or less threads. 

## 📰 Update News

**2026.04.29** - 🎉 **Supertonic 3** released with 31-language support, improved reading accuracy, and v2-compatible public ONNX assets. [Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)

**2025.12.10** - Added [6 new voice styles](https://huggingface.co/Supertone/supertonic/tree/b10dbaf18b316159be75b34d24f740008fddd381) (M3, M4, M5, F3, F4, F5). See [Voices](https://supertone-inc.github.io/supertonic-py/voices/) for details

**2025.12.08** - Optimized ONNX models via [OnnxSlim](https://github.com/inisis/OnnxSlim) now available on [Hugging Face Models](https://huggingface.co/Supertone/supertonic)

**2025.11.23** - Enhanced text preprocessing with comprehensive normalization, emoji removal, symbol replacement, and punctuation handling for improved synthesis quality.

**2025.11.19** - Added `--speed` parameter to control speech synthesis speed (default: 1.05, recommended range: 0.9-1.5).

**2025.11.19** - Added automatic text chunking for long-form inference. Long texts are split into chunks and synthesized with natural pauses.

## Installation

This project uses Swift Package Manager (SPM) for dependency management.

### Prerequisites
- Swift 5.9 or later
- macOS 13.0 or later

### Build the project
```bash
swift build -c release
```

## Basic Usage

### Example 1: Default Inference
Run inference with default settings:
```bash
.build/release/example_onnx
```

This will use:
- Voice style: `../assets/voice_styles/M1.json`
- Text: "This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."
- Output directory: `results/`
- Total steps: 8
- Number of generations: 4

### Example 2: Batch Inference
Process multiple voice styles and texts at once:
```bash
.build/release/example_onnx \
  --batch \
  --voice-style ../assets/voice_styles/M1.json,../assets/voice_styles/F1.json \
  --text "The sun sets behind the mountains, painting the sky in shades of pink and orange.|오늘 아침에 공원을 산책했는데, 새소리와 바람 소리가 너무 기분 좋았어요." \
  --lang en,ko
```

This will:
- Generate speech for 2 different voice-text-language triplets
- Use male voice (M1.json) for the first English text
- Use female voice (F1.json) for the second Korean text
- Process both samples in a single batch

### Example 3: High Quality Inference
Increase denoising steps for better quality:
```bash
.build/release/example_onnx \
  --total-step 10 \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Increasing the number of denoising steps improves the output's fidelity and overall quality."
```

This will:
- Use 10 denoising steps instead of the default 8
- Produce higher quality output at the cost of slower inference

### Example 4: Long-Form Inference
The system automatically chunks long texts into manageable segments, synthesizes each segment separately, and concatenates them with natural pauses (0.3 seconds by default) into a single audio file. This happens by default when you don't use the `--batch` flag:

```bash
.build/release/example_onnx \
  --voice-style ../assets/voice_styles/M1.json \
  --text "This is a very long text that will be automatically split into multiple chunks. The system will process each chunk separately and then concatenate them together with natural pauses between segments. This ensures that even very long texts can be processed efficiently while maintaining natural speech flow and avoiding memory issues."
```

This will:
- Automatically split the text into chunks based on paragraph and sentence boundaries
- Synthesize each chunk separately
- Add 0.3 seconds of silence between chunks for natural pauses
- Concatenate all chunks into a single audio file

**Note**: Automatic text chunking is disabled when using `--batch` mode. In batch mode, each text is processed as-is without chunking.

## Available Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--compute-units` | str | `ALL` | CoreML compute units: `CPU`, `CPUAndGPU`, `CPUAndNeuralEngine`, `ALL`, `CPUOnly` |
| `--threads` | int | `2` | ORT intra-op threads. Default is 2. Spinning enabled when > 0. |
| `--onnx-dir` | str | `../assets/onnx` | Path to ONNX model directory |
| `--total-step` | int | 8 | Number of denoising steps (higher = better quality, slower) |
| `--speed` | float | 1.05 | Speech speed factor (higher = faster, lower = slower) |
| `--n-test` | int | 4 | Number of times to generate each sample |
| `--voice-style` | str+ | `../assets/voice_styles/M1.json` | Voice style file path(s) |
| `--text` | str+ | (long default text) | Text(s) to synthesize |
| `--lang` | str+ | `en` | Language(s) for synthesis; see the main README for all 31 codes |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | True | Enable batch mode (multiple text-style-lang triplets, disables automatic chunking) |

## Multilingual Support

Supertonic 3 supports 31 languages. Use the `--lang` argument to specify the language; see the main README for the full code list.

## Notes

- **Batch Processing**: When using `--batch`, the number of `--voice-style`, `--text`, and `--lang` entries must match
- **Automatic Chunking**: Without `--batch`, long texts are automatically split and concatenated with 0.3s pauses
- **Quality vs Speed**: Higher `--total-step` values produce better quality but take longer
- **CoreML Acceleration**: Use `--compute-units` to enable GPU/ANE acceleration for the vocoder model
