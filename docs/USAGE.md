# Supertonic Usage Guide

## Installation

### Prerequisites

1.  **Rust Toolchain**: [Install Rust](https://rustup.rs/).
2.  **Assets**: Run `python3 download_assets.py` to fetch models and voices.

### Building

```bash
cargo build --release
```

The binary will be available at `./target/release/tts`.

## CLI Reference

### Basic Synthesis

Generate speech using the default voice (M1) and settings:

```bash
./target/release/tts --text "Hello world"
```

This saves the output to `results/`.

### Changing Voices

Use the `--voice-style` argument to point to a JSON style file:

```bash
./target/release/tts \
  --voice-style assets/voice_styles/F1.json \
  --text "Hello from the female voice."
```

### Adjusting Speed

The `--speed` parameter controls the speaking rate. Higher values mean faster speech.

*   **Slower**: `--speed 0.8`
*   **Faster**: `--speed 1.2`

```bash
./target/release/tts --speed 1.2 --text "I am speaking quickly."
```

### Adjusting Quality (Steps)

The `--total-step` parameter controls the number of denoising steps.

*   **Default**: 5 steps (Balanced)
*   **Fast**: 2 steps (Lower quality, very fast)
*   **High Quality**: 10-20 steps (Higher quality, slower)

```bash
./target/release/tts --total-step 10 --text "High quality generation."
```

### Batch Processing

You can generate multiple files at once. The number of texts must match the number of styles provided (or use one style for all if the code supports broadcasting, though currently it requires matching counts for batch mode).

```bash
./target/release/tts --batch \
  --voice-style assets/voice_styles/M1.json,assets/voice_styles/F1.json \
  --text "Hello form M1.|Hello from F1."
```

**Note**: In batch mode, texts are delimited by `|` by default.

### Long Text Handling

The system automatically chunks long text into sentences/paragraphs.

```bash
./target/release/tts --text "This is the first sentence. This is the second sentence. The system will handle the pauses naturally."
```

## Advanced Configuration

### GPU Acceleration

To use GPU (if supported/compiled):

```bash
./target/release/tts --use-gpu
```

*(Note: GPU support currently requires specific ONNX Runtime providers to be available)*

### Custom Output Directory

```bash
./target/release/tts --save-dir my_outputs --text "Test"
```
