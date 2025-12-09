# Supertonic — Lightning Fast, On-Device TTS

[![Demo](https://img.shields.io/badge/🤗%20Hugging%20Face-Demo-yellow)](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo)
[![Models](https://img.shields.io/badge/🤗%20Hugging%20Face-Models-blue)](https://huggingface.co/Supertone/supertonic)

**Supertonic** is a lightning-fast, on-device text-to-speech system designed for **extreme performance** with minimal computational overhead. Powered by ONNX Runtime, it runs entirely on your device—no cloud, no API calls, no privacy concerns.

This repository contains the **Rust** implementation, offering a memory-safe, high-performance CLI and library.

## Demo

> 🎧 **Try it now**: Experience Supertonic in your browser with our [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo), or get started with pre-trained models from [**Hugging Face Hub**](https://huggingface.co/Supertone/supertonic)

## Installation

### Prerequisites

1.  **Install Rust**:
    ```bash
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```

2.  **Download Assets**:
    The project requires ONNX models and voice style files. You can download them using the included script (requires Python) or manually.

    ```bash
    # Using the included script (creates assets/ directory)
    python3 download_assets.py
    ```

    Or manually download from [Hugging Face](https://huggingface.co/Supertone/supertonic) into `assets/`.

### Build

```bash
cargo build --release
```

## Usage

The project provides a CLI binary `tts` and a library `supertonic_tts`.

### Basic CLI Usage

Run inference with default settings:

```bash
# Using cargo run
cargo run --release --bin tts

# Or directly execute the built binary
./target/release/tts
```

This will use:
- Voice style: `assets/voice_styles/M1.json`
- Default text
- Output directory: `results/`

### Custom Text and Voice

```bash
cargo run --release --bin tts -- \
  --voice-style assets/voice_styles/F1.json \
  --text "Hello, this is a test of the Supertonic TTS system."
```

### Batch Inference

Process multiple voice styles and texts at once:

```bash
cargo run --release --bin tts -- \
  --batch \
  --voice-style assets/voice_styles/M1.json,assets/voice_styles/F1.json \
  --text "Text for male voice.|Text for female voice."
```

### Long-Form Inference

The system automatically chunks long texts into manageable segments and concatenates them with natural pauses.

```bash
cargo run --release --bin tts -- \
  --text "This is a very long text... (full text)"
```

### Available Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--use-gpu` | flag | False | Use GPU for inference (default: CPU) |
| `--onnx-dir` | str | `assets/onnx` | Path to ONNX model directory |
| `--total-step` | int | 5 | Number of denoising steps |
| `--speed` | float | 1.05 | Speech speed factor (higher = faster) |
| `--n-test` | int | 4 | Number of times to generate each sample |
| `--voice-style` | str+ | `M1.json` | Voice style file path(s) |
| `--text` | str+ | (default) | Text(s) to synthesize |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | False | Enable batch mode |

## Performance

We evaluated Supertonic's performance (with 2 inference steps) using two key metrics across input texts of varying lengths.

### Characters per Second
| System | Short (59 chars) | Mid (152 chars) | Long (266 chars) |
|--------|-----------------|----------------|-----------------|
| **Supertonic** (M4 pro - CPU) | 912 | 1048 | 1263 |
| **Supertonic** (M4 pro - WebGPU) | 996 | 1801 | 2509 |
| **Supertonic** (RTX4090) | 2615 | 6548 | 12164 |

### Real-time Factor (RTF)
| System | Short (59 chars) | Mid (152 chars) | Long (266 chars) |
|--------|-----------------|----------------|-----------------|
| **Supertonic** (M4 pro - CPU) | 0.015 | 0.013 | 0.012 |
| **Supertonic** (M4 pro - WebGPU) | 0.014 | 0.007 | 0.006 |
| **Supertonic** (RTX4090) | 0.005 | 0.002 | 0.001 |

## Citation

```bibtex
@article{kim2025supertonic,
  title={SupertonicTTS: Towards Highly Efficient and Streamlined Text-to-Speech System},
  author={Kim, Hyeongju and Yang, Jinhyeok and Yu, Yechan and Ji, Seunghun and Morton, Jacob and Bous, Frederik and Byun, Joon and Lee, Juheon},
  journal={arXiv preprint arXiv:2503.23108},
  year={2025}
}
```

## License

This project's sample code is released under the MIT License.
The accompanying model is released under the OpenRAIL-M License.
