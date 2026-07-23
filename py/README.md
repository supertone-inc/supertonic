# TTS ONNX Inference Examples

This guide provides examples for running TTS inference using `example_onnx.py`.

## 📰 Update News

**2026.04.29** - 🎉 **Supertonic 3** released with 31-language support, improved reading accuracy, and v2-compatible public ONNX assets. [Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)

**2025.12.10** - Added `supertonic` PyPI package! Install via `pip install supertonic` for a streamlined experience. This is a separate usage method from the ONNX examples in this directory. For more details, visit [supertonic-py documentation](https://supertone-inc.github.io/supertonic-py) and see `example_pypi.py` for usage.

**2025.12.10** - Added [6 new voice styles](https://huggingface.co/Supertone/supertonic/tree/b10dbaf18b316159be75b34d24f740008fddd381) (M3, M4, M5, F3, F4, F5). See [Voices](https://supertone-inc.github.io/supertonic-py/voices/) for details

**2025.12.08** - Optimized ONNX models via [OnnxSlim](https://github.com/inisis/OnnxSlim) now available on [Hugging Face Models](https://huggingface.co/Supertone/supertonic)

**2025.11.23** - Enhanced text preprocessing with comprehensive normalization, emoji removal, symbol replacement, and punctuation handling for improved synthesis quality.

**2025.11.19** - Added `--speed` parameter to control speech synthesis speed. Adjust the speed factor to make speech faster or slower while maintaining natural quality.

**2025.11.19** - Added automatic text chunking for long-form inference. Long texts are split into chunks and synthesized with natural pauses.

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

## Basic Usage

### Example 1: Default Inference
Run inference with default settings:
```bash
uv run example_onnx.py
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
uv run example_onnx.py \
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
- Process both samples in a single batch (automatic text chunking disabled)

### Example 3: High Quality Inference
Increase denoising steps for better quality:
```bash
uv run example_onnx.py \
  --total-step 10 \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Increasing the number of denoising steps improves the output's fidelity and overall quality."
```

This will:
- Use 10 denoising steps instead of the default 8
- Produce higher quality output at the cost of slower inference

### Example 4: Long-Form Inference
For long texts, the system automatically chunks the text into manageable segments and generates a single audio file:
```bash
uv run example_onnx.py \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Once upon a time, in a small village nestled between rolling hills, there lived a young artist named Clara. Every morning, she would wake up before dawn to capture the first light of day. The golden rays streaming through her window inspired countless paintings. Her work was known throughout the region for its vibrant colors and emotional depth. People from far and wide came to see her gallery, and many said her paintings could tell stories that words never could."
```

This will:
- Automatically split the long text into smaller chunks (max 300 characters by default)
- Process each chunk separately while maintaining natural speech flow
- Insert brief silences (0.3 seconds) between chunks for natural pacing
- Combine all chunks into a single output audio file

**Note**: When using batch mode (`--batch`), automatic text chunking is disabled. Use non-batch mode for long-form text synthesis.

### Example 5: Adjusting Speech Speed
Control the speed of speech synthesis:
```bash
# Faster speech (speed > 1.0)
uv run example_onnx.py \
  --voice-style ../assets/voice_styles/F2.json \
  --text "This text will be synthesized at a faster pace." \
  --speed 1.2

# Slower speech (speed < 1.0)
uv run example_onnx.py \
  --voice-style ../assets/voice_styles/M2.json \
  --text "This text will be synthesized at a slower, more deliberate pace." \
  --speed 0.9
```

This will:
- Use `--speed 1.2` to generate faster speech
- Use `--speed 0.9` to generate slower speech
- Default speed is 1.05 if not specified
- Recommended speed range is between 0.9 and 1.5 for natural-sounding results

## Available Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--use-gpu` | flag | False | Use GPU for inference (with CPU fallback) |
| `--onnx-dir` | str | `../assets/onnx` | Path to ONNX model directory |
| `--total-step` | int | 8 | Number of denoising steps, 1-50 (higher = better quality, slower) |
| `--speed` | float | 1.05 | Speech speed factor, 0.5-2.0 (higher = faster, lower = slower) |
| `--n-test` | int | 4 | Number of times to generate each sample, 1-10 |
| `--voice-style` | str+ | `../assets/voice_styles/M1.json` | Voice style file path(s) |
| `--text` | str+ | (long default text) | Text(s) to synthesize; batch items and generated chunks are limited to 5,000 characters each |
| `--lang` | str+ | `en` | Language(s) for text(s); see the main README for all 31 codes |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | False | Enable batch mode (disables automatic text chunking) |

## Notes

- **Input Bounds**: Batch mode accepts up to 8 texts, batch items and generated chunks are limited to 5,000 characters each, `--total-step` is limited to 1-50, `--speed` to 0.5-2.0, and `--n-test` to 1-10
- **Batch Processing**: The number of `--voice-style`, `--text`, and `--lang` entries must match
- **Multilingual Support**: Use `--lang` to specify language(s). Available: 31 languages; see the main README for the full list
- **Long-Form Inference**: Without `--batch` flag, raw text can exceed 5,000 characters; generated chunks are validated individually and combined into a single audio file with natural pauses
- **Quality vs Speed**: Higher `--total-step` values produce better quality but take longer
- **GPU Support**: GPU mode is not supported yet
