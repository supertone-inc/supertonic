# TTS OpenVINO Inference Examples

This guide provides examples for running TTS inference using `example_openvino.py` with Intel OpenVINO for optimized CPU and GPU performance.

## 📰 Update News

**2026.05.18** - 🎉 **OpenVINO Backend** released with support for Intel CPU/GPU acceleration, FP16/FP32 precision, and multi-device execution.

**2026.04.29** - 🎉 **Supertonic 3** released with 31-language support, improved reading accuracy, and v2-compatible public ONNX assets. [Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)

## Features

- **Intel CPU Optimization**: Leverages OpenVINO's optimizations for Intel CPUs
- **Intel GPU Support**: Run inference on Intel integrated/discrete GPUs
- **Multi-Device Execution**: Distribute workload across CPU and GPU
- **Precision Control**: FP16 for speed, FP32 for accuracy
- **Same API**: Compatible interface with the ONNX version

## Installation

This project uses [uv](https://docs.astral.sh/uv/) for fast package management.

### Install uv (if not already installed)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Install dependencies
```bash
uv sync
```

Or if you prefer using traditional pip with requirements.txt:
```bash
pip install -r requirements.txt
```

### Clone the model weights
Go to the root directory of the repo and clone the weights using Git LFS:
```
git lfs install
git clone https://huggingface.co/Supertone/supertonic-3 assets
```

### Convert ONNX Models to OpenVINO (Required)

Before running inference, convert the ONNX models to OpenVINO IR format:

```bash
# Using the conversion script (from EdgeAI/Supertonic)
python convert_to_ov.py --input-dir ../assets/onnx --output-dir ../assets/openvino --precision fp16
```

Or manually using OpenVINO Model Converter:
```bash
ovc ../assets/onnx/duration_predictor.onnx --output_model ../assets/openvino/duration_predictor --compress_to_fp16
ovc ../assets/onnx/text_encoder.onnx --output_model ../assets/openvino/text_encoder --compress_to_fp16
ovc ../assets/onnx/vector_estimator.onnx --output_model ../assets/openvino/vector_estimator --compress_to_fp16
ovc ../assets/onnx/vocoder.onnx --output_model ../assets/openvino/vocoder --compress_to_fp16
```

## Basic Usage

### Example 1: Default Inference (CPU)
Run inference with default settings:
```bash
uv run example_openvino.py
```

This will use:
- Device: CPU
- Voice style: `../assets/voice_styles/M1.json`
- Text: "This morning, I took a walk in the park..."
- Output directory: `results/`
- Total steps: 8
- Number of generations: 4

### Example 2: GPU Inference
Run inference on Intel GPU:
```bash
uv run example_openvino.py --device GPU
```

For maximum accuracy on GPU, force FP32 precision:
```bash
uv run example_openvino.py --device GPU --force-fp32
```

### Example 3: Multi-Device Inference
Distribute workload across CPU and GPU:
```bash
uv run example_openvino.py --device "MULTI:CPU,GPU"
```

Or let OpenVINO automatically select the best device:
```bash
uv run example_openvino.py --device AUTO
```

### Example 4: Batch Inference
Process multiple voice styles and texts at once:
```bash
uv run example_openvino.py \
  --voice-style ../assets/voice_styles/M1.json ../assets/voice_styles/F1.json \
  --text "The sun sets behind the mountains, painting the sky in shades of pink and orange." "오늘 아침에 공원을 산책했는데, 새소리와 바람 소리가 너무 좋아서 한참을 멈춰 서서 들었어요." \
  --lang en ko \
  --batch
```

This will:
- Use `--batch` flag to enable batch processing mode
- Generate speech for 2 different voice-text pairs
- Use male voice style (M1.json) for the first English text
- Use female voice style (F1.json) for the second Korean text

### Example 5: High Quality Inference
Increase denoising steps for better quality:
```bash
uv run example_openvino.py \
  --total-step 10 \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Increasing the number of denoising steps improves the output's fidelity and overall quality."
```

### Example 6: Long-Form Inference
For long texts, the system automatically chunks the text into manageable segments:
```bash
uv run example_openvino.py \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Once upon a time, in a small village nestled between rolling hills, there lived a young artist named Clara. Every morning, she would wake up before dawn to capture the first light of day. The golden rays streaming through her window inspired countless paintings. Her work was known throughout the region for its vibrant colors and emotional depth."
```

### Example 7: Adjusting Speech Speed
Control the speed of speech synthesis:
```bash
# Faster speech (speed > 1.0)
uv run example_openvino.py \
  --voice-style ../assets/voice_styles/F2.json \
  --text "This text will be synthesized at a faster pace." \
  --speed 1.2

# Slower speech (speed < 1.0)
uv run example_openvino.py \
  --voice-style ../assets/voice_styles/M2.json \
  --text "This text will be synthesized at a slower, more deliberate pace." \
  --speed 0.9
```

## Available Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--device` | str | `CPU` | OpenVINO device (CPU, GPU, AUTO, MULTI:CPU,GPU) |
| `--force-fp32` | flag | False | Force FP32 precision on GPU for accuracy |
| `--model-dir` | str | `../assets/openvino` | Path to OpenVINO model directory |
| `--config-dir` | str | `../assets/onnx` | Path to config directory (tts.json, unicode_indexer.json) |
| `--total-step` | int | 8 | Number of denoising steps (higher = better quality, slower) |
| `--speed` | float | 1.05 | Speech speed factor (higher = faster, lower = slower) |
| `--n-test` | int | 4 | Number of times to generate each sample |
| `--voice-style` | str+ | `../assets/voice_styles/M1.json` | Voice style file path(s) |
| `--text` | str+ | (long default text) | Text(s) to synthesize |
| `--lang` | str+ | `en` | Language(s) for text(s); see the main README for all 31 codes |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | False | Enable batch mode (disables automatic text chunking) |

## Device Options

| Device | Description |
|--------|-------------|
| `CPU` | Intel CPU with OpenVINO optimizations |
| `GPU` | Intel integrated or discrete GPU |
| `AUTO` | Automatically select the best available device |
| `MULTI:CPU,GPU` | Distribute inference across multiple devices |

## Performance Tips

1. **CPU Inference**: Best for compatibility and consistent performance
2. **GPU Inference**: Use `--device GPU` for Intel GPUs; add `--force-fp32` if you notice quality degradation
3. **FP16 vs FP32**: FP16 models are smaller and faster on GPU; FP32 provides maximum accuracy
4. **Diffusion Steps**: Lower steps (4-8) are faster, higher (16-32) are better quality
5. **Batch Processing**: Use `--batch` for multiple samples to improve throughput

## Troubleshooting

### OpenVINO not found
```bash
pip install openvino --upgrade
```

### GPU not detected
```bash
# Check available devices
python -c "from openvino.runtime import Core; print(Core().available_devices)"

# Install Intel compute runtime (Ubuntu/Debian)
sudo apt-get install intel-opencl-icd
```

### Model files not found
Ensure you've converted the ONNX models to OpenVINO format:
```bash
python convert_to_ov.py --input-dir ../assets/onnx --output-dir ../assets/openvino
```

## Notes

- **Model Conversion**: OpenVINO IR models must be converted from ONNX before use
- **Batch Processing**: The number of `--voice-style` files must match the number of `--text` entries
- **Multilingual Support**: Use `--lang` to specify language(s). Available: 31 languages
- **Long-Form Inference**: Without `--batch` flag, long texts are automatically chunked
- **Quality vs Speed**: Higher `--total-step` values produce better quality but take longer
