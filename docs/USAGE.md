# Supertonic TTS Usage Guide

## Prerequisites

1.  **Rust Toolchain**: Ensure you have Rust installed (via `rustup`).
2.  **Assets**: You must download the ONNX models and voice styles.
    ```bash
    python3 download_assets.py
    ```

## CLI Usage

The primary way to use Supertonic is through the `tts` binary.

### Basic Synthesis

Generate speech from a simple text string using the default voice style (M1).

```bash
cargo run --release -- --text "Hello, world! This is Supertonic."
```

This will save the output to the `results/` directory.

### Selecting a Voice Style

You can specify a different voice style using the `--voice-style` argument.

```bash
cargo run --release -- --text "I am speaking with a different voice." --voice-style assets/voice_styles/F1.json
```

Available styles (after downloading assets):
*   `M1.json` (Male 1)
*   `M2.json` (Male 2)
*   `F1.json` (Female 1)
*   `F2.json` (Female 2)

### Adjusting Speed and Quality

*   **Speed**: Use `--speed` to control the speaking rate. Higher is faster. Default is `1.05`.
*   **Quality**: Use `--total-step` to control the number of denoising steps. Higher values generally result in better quality but take longer. Default is `5`.

```bash
cargo run --release -- --text "Slow and high quality." --speed 0.8 --total-step 10
```

### Batch Processing

You can generate multiple outputs at once.

```bash
cargo run --release -- \
  --batch \
  --text "First sentence.|Second sentence." \
  --voice-style "assets/voice_styles/M1.json,assets/voice_styles/F1.json"
```

Note: In batch mode, the number of texts must match the number of voice styles provided.

### Configuration

*   **ONNX Directory**: If your models are in a different location, use `--onnx-dir`.
*   **Output Directory**: Change the output folder with `--save-dir`.

```bash
cargo run --release -- --text "Saving elsewhere." --save-dir my_outputs
```

## Library Usage

Add `supertonic-tts` to your `Cargo.toml`.

```rust
use supertonic_tts::{load_text_to_speech, load_voice_style};

fn main() -> anyhow::Result<()> {
    // 1. Load the engine
    let mut tts = load_text_to_speech("assets/onnx", false)?;

    // 2. Load a style
    let style = load_voice_style(&["assets/voice_styles/M1.json".to_string()], false)?;

    // 3. Synthesize
    let text = "Hello from the library code.";
    let (wav, duration) = tts.call(text, &style, 5, 1.0, 0.3)?;

    // 4. Save or process 'wav' (Vec<f32>)
    // ...
    Ok(())
}
```
