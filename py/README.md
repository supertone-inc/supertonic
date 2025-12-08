# TTS ONNX Inference Examples

This guide provides examples for running TTS inference using `example_onnx.py`.

## 📰 Update News

**2025.11.30** - Added **MCP Server** support for LLM integration and an interactive **Streaming Audio Player** (`player.py`) with Jukebox mode and media key support.

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

## MCP Server & Streaming Player (New!)

This project now includes a Model Context Protocol (MCP) server to allow LLMs (like Claude Desktop or Cursor) to synthesize speech locally, and a companion player script for streaming playback.

### 1. Running the MCP Server

To expose the TTS engine to your LLM editor:

1.  Add the following configuration to your MCP settings (e.g., `cursor_settings.json` or `claude_desktop_config.json`):

    **Windows**:
    ```json
    {
      "mcpServers": {
        "supertonic-tts": {
          "command": "uv",
          "args": [
            "run",
            "python",
            "mcp_server.py"
          ],
          "cwd": "/path/to/supertonic/py"
        }
      }
    }
    ```

    **macOS/Linux**:
    ```json
    {
      "mcpServers": {
        "supertonic-tts": {
          "command": "uv",
          "args": [
            "run",
            "python",
            "mcp_server.py"
          ],
          "cwd": "/path/to/supertonic/py"
        }
      }
    }
    ```

2.  Restart your editor. The tool `speak` will now be available.

### 2. Interactive Player (`player.py`)

The player script supports **streaming playback** (playing audio as it is generated) and **Jukebox mode** (automatically switching to new files).

**Run the player:**
```bash
uv run python player.py
```

**Controls:**
-   **Ctrl + Right Arrow**:
    -   Short Press: Seek forward +2 seconds.
    -   Long Press (>1s): Fast Forward (Speed increases logarithmically).
-   **Ctrl + Left Arrow**:
    -   Short Press: Seek backward -2 seconds.
    -   Long Press (>1s): Fast Forward.

**Features:**
-   **Streaming**: If you start the player while the MCP server is generating audio, it will play the chunks in real-time.
-   **Jukebox Mode**: Leave the player running. Whenever a new audio file is generated in `results/`, the player will automatically detect it and switch to playing the new track.

## Basic Usage

### Example 1: Default Inference
Run inference with default settings:
```bash
uv run example_onnx.py
```

This will use:
- Voice style: `assets/voice_styles/M1.json`
- Text: "This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."
- Output directory: `results/`
- Total steps: 5
- Number of generations: 4

### Example 2: Batch Inference
Process multiple voice styles and texts at once:
```bash
uv run example_onnx.py \
  --voice-style assets/voice_styles/M1.json assets/voice_styles/F1.json \
  --text "The sun sets behind the mountains, painting the sky in shades of pink and orange." "The weather is beautiful and sunny outside. A gentle breeze makes the air feel fresh and pleasant." \
  --batch
```

This will:
- Use `--batch` flag to enable batch processing mode
- Generate speech for 2 different voice-text pairs
- Use male voice style (M1.json) for the first text
- Use female voice style (F1.json) for the second text
- Process both samples in a single batch (automatic text chunking disabled)

### Example 3: High Quality Inference
Increase denoising steps for better quality:
```bash
uv run example_onnx.py \
  --total-step 10 \
  --voice-style assets/voice_styles/M1.json \
  --text "Increasing the number of denoising steps improves the output's fidelity and overall quality."
```

This will:
- Use 10 denoising steps instead of the default 5
- Produce higher quality output at the cost of slower inference

### Example 4: Long-Form Inference
For long texts, the system automatically chunks the text into manageable segments and generates a single audio file:
```bash
uv run example_onnx.py \
  --voice-style assets/voice_styles/M1.json \
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
  --voice-style assets/voice_styles/F2.json \
  --text "This text will be synthesized at a faster pace." \
  --speed 1.2

# Slower speech (speed < 1.0)
uv run example_onnx.py \
  --voice-style assets/voice_styles/M2.json \
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
| `--onnx-dir` | str | `assets/onnx` | Path to ONNX model directory |
| `--total-step` | int | 5 | Number of denoising steps (higher = better quality, slower) |
| `--speed` | float | 1.05 | Speech speed factor (higher = faster, lower = slower) |
| `--n-test` | int | 4 | Number of times to generate each sample |
| `--voice-style` | str+ | `assets/voice_styles/M1.json` | Voice style file path(s) |
| `--text` | str+ | (long default text) | Text(s) to synthesize |
| `--save-dir` | str | `results` | Output directory |
| `--batch` | flag | False | Enable batch mode (disables automatic text chunking) |

## Notes

- **Batch Processing**: The number of `--voice-style` files must match the number of `--text` entries
- **Long-Form Inference**: Without `--batch` flag, long texts are automatically chunked and combined into a single audio file with natural pauses
- **Quality vs Speed**: Higher `--total-step` values produce better quality but take longer
- **GPU Support**: GPU mode is not supported yet
