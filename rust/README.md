# TTS ONNX Inference Examples

This guide provides examples for running TTS inference using Rust.

## 📰 Update News

**2026.04.29** - 🎉 **Supertonic 3** released with 31-language support, improved reading accuracy, and v2-compatible public ONNX assets. [Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)

**2025.12.10** - Added [6 new voice styles](https://huggingface.co/Supertone/supertonic/tree/b10dbaf18b316159be75b34d24f740008fddd381) (M3, M4, M5, F3, F4, F5). See [Voices](https://supertone-inc.github.io/supertonic-py/voices/) for details

**2025.12.08** - Optimized ONNX models via [OnnxSlim](https://github.com/inisis/OnnxSlim) now available on [Hugging Face Models](https://huggingface.co/Supertone/supertonic)

**2025.11.23** - Enhanced text preprocessing with comprehensive normalization, emoji removal, symbol replacement, and punctuation handling for improved synthesis quality.

**2025.11.19** - Added `--speed` parameter to control speech synthesis speed (default: 1.05, recommended range: 0.9-1.5).

**2025.11.19** - Added automatic text chunking for long-form inference. Long texts are split into chunks and synthesized with natural pauses.

## Installation

This project uses [Cargo](https://doc.rust-lang.org/cargo/) for package management.

### Install Rust (if not already installed)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Build the project
```bash
cargo build --release
```

## Basic Usage

You can run the inference in two ways:
1. **Using cargo run** (builds if needed, then runs)
2. **Direct binary execution** (faster if already built)

### Example 1: Default Inference
Run inference with default settings:
```bash
# Using cargo run
cargo run --release --bin example_onnx

# Or directly execute the built binary (faster)
./target/release/example_onnx
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
# Using cargo run
cargo run --release --bin example_onnx -- \
  --batch \
  --voice-style ../assets/voice_styles/M1.json,../assets/voice_styles/F1.json \
  --text "The sun sets behind the mountains, painting the sky in shades of pink and orange.|오늘 아침에 공원을 산책했는데, 새소리와 바람 소리가 너무 기분 좋았어요." \
  --lang en,ko

# Or using the binary directly
./target/release/example_onnx \
  --batch \
  --voice-style ../assets/voice_styles/M1.json,../assets/voice_styles/F1.json \
  --text "The sun sets behind the mountains, painting the sky in shades of pink and orange.|오늘 아침에 공원을 산책했는데, 새소리와 바람 소리가 너무 기분 좋았어요." \
  --lang en,ko
```

This will:
- Generate speech for 2 different voice-text-language pairs
- Use male voice (M1.json) for the first text in English
- Use female voice (F1.json) for the second text in Korean
- Process both samples in a single batch

### Example 3: High Quality Inference
Increase denoising steps for better quality:
```bash
# Using cargo run
cargo run --release --bin example_onnx -- \
  --total-step 10 \
  --voice-style ../assets/voice_styles/M1.json \
  --text "Increasing the number of denoising steps improves the output's fidelity and overall quality."

# Or using the binary directly
./target/release/example_onnx \
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
# Using cargo run
cargo run --release --bin example_onnx -- \
  --voice-style ../assets/voice_styles/M1.json \
  --text "This is a very long text that will be automatically split into multiple chunks. The system will process each chunk separately and then concatenate them together with natural pauses between segments. This ensures that even very long texts can be processed efficiently while maintaining natural speech flow and avoiding memory issues."

# Or using the binary directly
./target/release/example_onnx \
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
| `--use-gpu` | flag | False | Use GPU for inference (default: CPU) |
| `--onnx-dir` | str | `../assets/onnx` | Path to ONNX model directory |
| `--total-step` | int | 8 | Number of denoising steps (higher = better quality, slower) |
| `--speed` | float | 1.05 | Speech speed factor (higher = faster, lower = slower) |
| `--n-test` | int | 4 | Number of times to generate each sample |
| `--voice-style` | str+ | `../assets/voice_styles/M1.json` | Voice style file path(s), comma-separated |
| `--text` | str+ | (long default text) | Text(s) to synthesize, pipe-separated |
| `--lang` | str+ | `en` | Language(s) for synthesis, comma-separated; see the main README for all 31 codes |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | False | Enable batch mode (multiple text-style pairs, disables automatic chunking) |

## Notes

- **Multilingual Support**: Use `--lang` to specify the language for each text. Available: 31 languages; see the main README for the full list
- **Batch Processing**: When using `--batch`, the number of `--voice-style`, `--text`, and `--lang` entries must match
- **Automatic Chunking**: Without `--batch`, long texts are automatically split and concatenated with 0.3s pauses
- **Quality vs Speed**: Higher `--total-step` values produce better quality but take longer
- **GPU Support**: GPU mode is not supported yet
- **Known Issues**: On some platforms (especially macOS), there might be a mutex cleanup warning during exit. This is a known ONNX Runtime issue and doesn't affect functionality. The implementation uses `libc::_exit()` and `mem::forget()` to bypass this issue.


