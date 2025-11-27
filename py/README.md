# Supertonic — Lightning Fast, On-Device TTS

[![Demo](https://img.shields.io/badge/🤗%20Hugging%20Face-Demo-yellow)](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo)
[![Models](https://img.shields.io/badge/🤗%20Hugging%20Face-Models-blue)](https://huggingface.co/Supertone/supertonic)

<p align="center">
  <img src="img/Supertonic_IMG_v02_4x.webp" alt="Supertonic Banner">
</p>

**Supertonic** is a lightning-fast, on-device text-to-speech system designed for **extreme performance** with minimal computational overhead. Powered by ONNX Runtime, it runs entirely on your device—no cloud, no API calls, no privacy concerns.

Watch Supertonic running on a **Raspberry Pi**—demonstrating on-device, real-time text-to-speech synthesis:

https://github.com/user-attachments/assets/ea66f6d6-7bc5-4308-8a88-1ce3e07400d2

> 🎧 **Try it now**: Experience Supertonic in your browser with our [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo), or get started with pre-trained models from [**Hugging Face Hub**](https://huggingface.co/Supertone/supertonic)


## Update for python version!
- support for GPU (For Cuda GPU and All GPU with directx 12 support) added! 

## How to run it 
first 

```bash
git clone https://github.com/supertone-inc/supertonic.git
cd supertonic
git clone https://huggingface.co/Supertone/supertonic assets
cd py
uv sync 
```
and activate the virtual enviornment.

then,

### For running the model in CPU 

```bash
uv add onnxruntime
```

### For running in any gpu with Directx 12

```bash
uv add onnxruntime-directml
```

### For running in Cuda GPU 

```bash
uv add onnxruntime-gpu
```

### Arguments

| Argument | Type | Default | Description |
|---|---|---|---|
| `--use-gpu` | flag | `False` | Use GPU for inference (default: CPU). |
| `--onnx-dir` | str | `assets/onnx` | Path to the directory containing the ONNX models. |
| `--total-step`| int | `5` | Number of denoising steps. |
| `--speed` | float | `1.05` | Speech speed. Higher is faster. |
| `--n-test` | int | `4` | Number of times to generate speech for each text. |
| `--batch` | flag | `False` | Enable batch processing for multiple texts and voice styles. |
| `--voice-style` | str(list) | `assets/voice_styles/M1.json` | Path to one or more voice style JSON files. |
| `--text` | str(list) | `"This morning, I took a walk in the park."` | One or more texts to synthesize. |
| `--save-dir` | str | `results` | The directory where the output audio files will be saved. |

### Example

To synthesize a single sentence with the default voice style:

```bash
python synthesize.py --use-gpu --text "Hello, this is a test."
```
