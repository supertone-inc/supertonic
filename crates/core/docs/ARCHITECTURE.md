# Supertonic TTS Architecture

## Overview

Supertonic is a high-performance, on-device Text-to-Speech (TTS) system implemented in Rust. It utilizes the ONNX Runtime for efficient inference of neural network models. The system is designed to be modular, separating the core inference logic from the CLI interface.

## Components

### 1. Library (`supertonic_tts`)

The core library handles the loading of models, text processing, and audio synthesis.

*   **`src/lib.rs`**: The entry point of the library, exporting public modules and functions.
*   **`src/model.rs`**: Contains the `TextToSpeech` struct which manages the ONNX Runtime sessions (`dp_ort`, `text_enc_ort`, `vector_est_ort`, `vocoder_ort`). It handles the inference pipeline.
*   **`src/text.rs`**: Handles text preprocessing and Unicode processing. It converts input text into token IDs suitable for the model.
*   **`src/audio.rs`**: Provides utilities for handling audio data, such as writing WAV files.
*   **`src/config.rs`**: Manages configuration loading for the models.
*   **`src/utils.rs`**: General utility functions like timers and filename sanitization.

### 2. CLI (`src/bin/tts.rs`)

The Command Line Interface (CLI) provides a user-friendly way to interact with the library. It parses command-line arguments, loads resources, and drives the synthesis process.

### 3. ONNX Models

The system relies on four ONNX models:

1.  **Duration Predictor (`duration_predictor.onnx`)**: Predicts the duration of each phoneme/token.
2.  **Text Encoder (`text_encoder.onnx`)**: Encodes the text tokens into a latent representation.
3.  **Vector Estimator (`vector_estimator.onnx`)**: A diffusion-based model (or similar) that iteratively refines the latent representation (denoising).
4.  **Vocoder (`vocoder.onnx`)**: Converts the final latent representation into an audio waveform.

### 4. Voice Styles

Voice styles are defined in JSON files (e.g., `M1.json`, `F1.json`). These files contain style embeddings (`style_ttl`, `style_dp`) that control the characteristics of the generated voice.

## Data Flow

1.  **Input**: Text string and Voice Style JSON.
2.  **Text Processing**: Text is normalized and converted to token IDs.
3.  **Duration Prediction**: The model predicts how long each token should be spoken.
4.  **Text Encoding**: Text tokens are encoded.
5.  **Latent Sampling**: A noisy latent representation is initialized.
6.  **Denoising (Vector Estimator)**: The noisy latent is iteratively refined over `total_step` steps, conditioned on the text encoding and style.
7.  **Vocoding**: The refined latent is converted to a waveform.
8.  **Output**: WAV audio file.

## Threading and Performance

*   **ONNX Runtime**: Handles parallelism for matrix operations.
*   **Rayon** (if used): Can be used for parallel processing of batches (though currently, the CLI handles batching sequentially or with simple loops).
*   **Memory Management**: The system currently uses `mem::forget` and `libc::_exit` to workaround known ONNX Runtime cleanup issues on some platforms.
