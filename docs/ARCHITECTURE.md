# Supertonic Architecture

## Overview

Supertonic is a text-to-speech (TTS) synthesis system based on a non-autoregressive architecture. It is designed for high performance on consumer hardware using ONNX Runtime.

The pipeline consists of four main models:

1.  **Text Encoder**: Converts input phonemes/text into a latent text embedding.
2.  **Duration Predictor**: Predicts the duration of each phoneme (how long it should be spoken).
3.  **Vector Estimator (Diffusion/Flow)**: A denoising model that iteratively refines a noisy latent representation into a clean acoustic representation (mel-spectrogram or similar latent feature), conditioned on the text embedding and style.
4.  **Vocoder**: Converts the clean latent representation into a raw audio waveform.

## Pipeline Steps

### 1. Text Preprocessing
*   **Input**: Raw UTF-8 text.
*   **Normalization**: Unicode normalization (NFKD), emoji removal, symbol replacement, and punctuation fixing.
*   **Tokenization**: Maps characters to integer IDs using a `unicode_indexer.json`.

### 2. Duration Prediction
*   **Input**: Text IDs, Style Embedding (DP).
*   **Output**: Duration values for each token (in frames).
*   **Logic**: The system predicts how many audio frames correspond to each text token. This determines the total length of the generated speech.

### 3. Latent Generation (Vector Estimator)
*   **Input**: Noisy Latent (random noise), Text Embeddings, Style Embedding (TTL), Step count.
*   **Process**:
    *   The system starts with Gaussian noise shaped according to the predicted duration.
    *   It applies a multi-step denoising process (Diffusion-based).
    *   The `total_step` parameter controls the number of iterations (default 5). Fewer steps = faster generation, More steps = potentially higher quality.
*   **Output**: "Clean" latent features.

### 4. Waveform Generation (Vocoder)
*   **Input**: Clean latent features.
*   **Output**: Raw audio samples (floating point).

## Voice Styles

Voice styles are defined in JSON files (e.g., `M1.json`, `F1.json`). They contain learned embeddings that condition the model to produce specific timbres and prosody.

*   **Style TTL**: Conditions the Vector Estimator (Text-to-Latent).
*   **Style DP**: Conditions the Duration Predictor.

## Technical Stack

*   **Runtime**: ONNX Runtime (`ort` crate).
*   **Language**: Rust (with `ndarray` for tensor manipulation).
*   **Audio**: `hound` for WAV writing.
