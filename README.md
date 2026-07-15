# Supertonic — Lightning Fast, On-Device, Accurate TTS

<p align="center">
  <img src="img/Supertonic3_HeroImage.png" alt="Supertonic 3 Banner">
</p>

[![GitHub | Official Repo](https://img.shields.io/badge/GitHub-Official%20Repo-black?logo=github)](https://github.com/supertone-inc/supertonic)
[![Models](https://img.shields.io/badge/🤗%20Hugging%20Face-Models-blue)](https://huggingface.co/Supertone/supertonic-3)
[![Runs Locally via WebGPU](https://img.shields.io/badge/🤗%20Hugging%20Face-Demo-yellow)](https://huggingface.co/spaces/Supertone/supertonic-3)
[![DemoPage | Audio Samples](https://img.shields.io/badge/DemoPage-Audio%20Samples-F5D90A?labelColor=0B0C0E)](https://supertonic3.github.io/)
[![Voice Builder | Cloning Demo](https://img.shields.io/badge/Voice%20Builder-Cloning%20Demo-3457D5?logo=soundcloud&logoColor=white)](https://supertonic.supertone.ai/voice-builder)
[![GitHub | Python Package](https://img.shields.io/badge/GitHub-Python%20Package-black?logo=github)](https://github.com/supertone-inc/supertonic-py)
[![Docs | Python PyPI](https://img.shields.io/badge/Docs-Python%20PyPI-blue?logo=readthedocs&logoColor=white)](https://supertone-inc.github.io/supertonic-py/)

<p align="center">
  <a href="https://trendshift.io/repositories/15657" target="_blank"><img src="https://trendshift.io/api/badge/repositories/15657" alt="supertone-inc%2Fsupertonic | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

**Supertonic** is a lightning-fast, on-device multilingual text-to-speech system designed for local inference with minimal overhead. Powered by ONNX Runtime, it runs entirely on your device—no cloud, no API calls, no privacy concerns.

### ✨ Highlights

- ⚡ **Blazingly Fast** — Low-latency, real-time synthesis across desktop, browser, mobile, and edge — fast enough to turn an entire webpage into audio in under a second
- 🌍 **31-Language Multilingual** — Synthesize directly from text across 31 languages, or pass `lang="na"` to let Supertonic process the text language-agnostically when you don't know the input language — no separate language adapters needed
- 🪶 **99M-Parameter Open-Weight Model** — A compact, fully open-weight checkpoint — a fraction of the size of 0.7B–2B class open TTS systems — for smaller downloads, faster cold starts, and lower memory footprint
- 📱 **Edge-Device Ready** — Runs locally on desktop, mobile, browsers, and resource-constrained hardware like Raspberry Pi or e-readers, with zero network dependency, complete privacy, and no GPU required
- 🔊 **44.1kHz High-Quality Audio** — Outputs studio-grade 44.1kHz 16-bit WAV directly, ready for production playback without any external upsampler
- 🎭 **Expression Tags** — 10 inline tags (e.g. `<laugh>`, `<breath>`, `<sigh>`) bring natural human nuance into generated speech without prompt engineering or reference audio
- 🛠️ **Multi-Runtime SDKs** — Ready-to-use examples through ONNX Runtime across Python, Node.js, Browser (WebGPU), Java, C++, C#, Go, Swift, iOS, Rust, and Flutter

### 🌍 Supported Languages (31)

Arabic (`ar`), Bulgarian (`bg`), Croatian (`hr`), Czech (`cs`), Danish (`da`), Dutch (`nl`), English (`en`), Estonian (`et`), Finnish (`fi`), French (`fr`), German (`de`), Greek (`el`), Hindi (`hi`), Hungarian (`hu`), Indonesian (`id`), Italian (`it`), Japanese (`ja`), Korean (`ko`), Latvian (`lv`), Lithuanian (`lt`), Polish (`pl`), Portuguese (`pt`), Romanian (`ro`), Russian (`ru`), Slovak (`sk`), Slovenian (`sl`), Spanish (`es`), Swedish (`sv`), Turkish (`tr`), Ukrainian (`uk`), Vietnamese (`vi`)

> **Not sure which language your text is in?** Pass `lang="na"` and Supertonic will handle the input in a language-agnostic way — no explicit language tag required.

### 📰 Update News

- **2026.05.20** - **Supertonic 3** is now officially supported in **[Supertone Play](https://play.supertone.ai/)** and the **[Supertone API](https://www.supertone.ai/ko/api)**. Visit Play or the API if you want a managed content creation workflow with diverse preset voices and zero-shot voice cloning.
- **2026.05.18** - Python SDK v1.3.1 adds **`supertonic serve`**, a local HTTP server with native `/v1/tts` and OpenAI-compatible `/v1/audio/speech` endpoints. See the [serve documentation](https://supertone-inc.github.io/supertonic-py/cli/serve/).
- **2026.05.18** - **[Voice Builder](https://supertonic.supertone.ai/voice-builder)** now supports **Supertonic 3**. Create a permanent custom voice profile for Supertonic and download version-specific JSON files for both Supertonic 2 and Supertonic 3. If you already created a Supertonic 2 voice, the matching Supertonic 3 JSON is now available from [My Page](https://supertonic.supertone.ai/my-page).
- **2026.04.29** - 🎉 **Supertonic 3** released with **31-language support**, improved reading accuracy, fewer repeat/skip failures, and v2-compatible public ONNX assets. [Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)
- **2026.01.22** - **[Voice Builder](https://supertonic.supertone.ai/voice-builder)** is now live! Turn your voice into a deployable, edge-native TTS with permanent ownership.
- **2026.01.06** - 🎉 **Supertonic 2** released with 5-language support. The v2 code path is preserved on the [`release/supertonic-2`](https://github.com/supertone-inc/supertonic/tree/release/supertonic-2) branch.
- **2025.12.10** - Added `supertonic` PyPI package! Install via `pip install supertonic`. For details, visit [supertonic-py documentation](https://supertone-inc.github.io/supertonic-py)
- **2025.12.10** - Added [6 new voice styles](https://huggingface.co/Supertone/supertonic/tree/b10dbaf18b316159be75b34d24f740008fddd381) (M3, M4, M5, F3, F4, F5). See [Voices](https://supertone-inc.github.io/supertonic-py/voices/) for details
- **2025.12.08** - Optimized ONNX models via [OnnxSlim](https://github.com/inisis/OnnxSlim) now available on [Hugging Face Models](https://huggingface.co/Supertone/supertonic)
- **2025.11.24** - Added Flutter SDK support with macOS compatibility

---

## Quick Start

Install the Python SDK and generate speech immediately. On the first run, Supertonic downloads the model assets from Hugging Face automatically.

```bash
pip install supertonic
```

### Python

```python
from supertonic import TTS

# First run downloads the model from Hugging Face automatically.
tts = TTS(auto_download=True)

style = tts.get_voice_style(voice_name="M1")

text = "Supertonic is a lightning fast, on-device TTS system."

wav, duration = tts.synthesize(
    text=text,
    lang="en",                      # Language code (e.g., "en", "ko", "na" for language-agnostic)
    voice_style=style,              # Voice style object
    total_steps=8,                  # Quality: 5 (low) to 12 (high), default 8 (medium)
    speed=1.05,                     # Speed: 0.7 (slow) to 2.0 (fast)
)
# wav: numpy array of shape (1, num_samples,) with dtype=np.float32, sampled at 44100 Hz
# duration: numpy array of shape (1,) containing the duration of the generated audio in seconds

tts.save_audio(wav, "output.wav")
# import soundfile as sf
# sf.write("output.wav", wav.squeeze(), 44100)

print(f"Generated {duration[0]:.2f}s of audio")
```

### Local HTTP Server

The Python SDK can also run Supertonic as a local HTTP service. This is useful when you want to call Supertonic from tools that already speak HTTP, such as local agents, browser extensions, Electron apps, workflow automation tools, or OpenAI-compatible audio clients.

```bash
pip install 'supertonic[serve]'
supertonic serve --host 127.0.0.1 --port 7788
```

Once running, use the native `POST /v1/tts` endpoint or the OpenAI-compatible `POST /v1/audio/speech` endpoint. The server also exposes interactive OpenAPI docs at `http://127.0.0.1:7788/docs`. See the [supertonic-py serve guide](https://supertone-inc.github.io/supertonic-py/cli/serve/) for request examples, batch synthesis, and custom Voice Builder JSON import.

## Getting Started

First, clone the repository:

```bash
git clone https://github.com/supertone-inc/supertonic.git
cd supertonic
```

### Prerequisites

Before running the examples, download the ONNX models and preset voices, and place them in the `assets` directory:

> **Note:** The Hugging Face repository uses Git LFS. Please ensure Git LFS is installed and initialized before cloning or pulling large model files.
> - macOS: `brew install git-lfs && git lfs install`
> - Generic: see `https://git-lfs.com` for installers

```bash
git lfs install
git clone https://huggingface.co/Supertone/supertonic-3 assets
```

Some language examples need native runtimes:
- **Go**: install the ONNX Runtime C library. On macOS, `brew install onnxruntime` is enough; the Go example auto-detects Homebrew paths.
- **Java**: use a JDK, not just a JRE. On macOS, `brew install openjdk@17` works.
- **C#**: targets .NET 9 and allows major-version roll-forward, so .NET 9 or newer runtimes can run it.

Then run the Python example:

```bash
cd py
uv sync
uv run example_onnx.py
```

This generates `outputs/output.wav` using the default preset voice.

### Other Runtime Examples

<details>
<summary><b>Run Supertonic in other languages and platforms</b></summary>

**Node.js Example** ([Details](nodejs/))
```bash
cd nodejs
npm install
npm start
```

**Browser Example** ([Details](web/))
```bash
cd web
npm install
npm run dev
```

**Java Example** ([Details](java/))
```bash
cd java
mvn clean install
mvn exec:java
```

**C++ Example** ([Details](cpp/))
```bash
cd cpp
mkdir build && cd build
cmake .. && cmake --build . --config Release
./example_onnx
```

**C# Example** ([Details](csharp/))
```bash
cd csharp
dotnet restore
dotnet run
```

**Go Example** ([Details](go/))
```bash
cd go
go mod download
go run example_onnx.go helper.go
```

**Swift Example** ([Details](swift/))
```bash
cd swift
swift build -c release
.build/release/example_onnx
```

**Rust Example** ([Details](rust/))
```bash
cd rust
cargo build --release
./target/release/example_onnx
```

**iOS Example** ([Details](ios/))
```bash
cd ios/ExampleiOSApp
xcodegen generate
open ExampleiOSApp.xcodeproj
```

In Xcode: Targets → ExampleiOSApp → Signing: select your Team, then choose your iPhone as run destination and build.

</details>

---

### Technical Details

- **Runtime**: ONNX Runtime for cross-platform inference
- **Browser Support**: onnxruntime-web for client-side inference
- **Batch Processing**: Supports batch inference for improved throughput
- **Audio Output**: Outputs 44.1kHz 16-bit WAV files

## Performance Highlights

Supertonic 3 is designed for practical on-device inference: compact enough to run locally, while staying competitive with much larger open TTS systems.

### Reading Accuracy

<p align="center">
  <img src="img/metrics/s3_vs_measured_wer_range_voxcpm2.png" alt="Supertonic 3 reading accuracy compared with measured model ranges and VoxCPM2">
</p>

Evaluated on the **[Minimax-MLS-test](https://huggingface.co/datasets/MiniMaxAI/TTS-MLS-Test) benchmark**, Supertonic 3 stays within a competitive WER/CER range against much larger open TTS models such as VoxCPM2, while preserving a lightweight on-device deployment path. Asterisked languages (`*`) use CER; the others use WER.

<details>
<summary><b>📊 Detailed per-language results (WER / CER*)</b></summary>

<br>

| Lang | VoxCPM2 | OmniVoice | Qwen3-TTS | Supertonic 2 | **Supertonic 3** |
|---|:---:|:---:|:---:|:---:|:---:|
| arabic\*   | 4.14  | 1.74  | —    | —    | **2.14**  |
| czech      | 23.73 | 2.40  | —    | —    | **3.02**  |
| dutch      | 0.84  | 0.77  | —    | —    | **1.47**  |
| english    | 2.11  | 2.02  | 2.25 | 2.52 | **2.06**  |
| finnish    | 2.29  | 3.94  | —    | —    | **5.40**  |
| french     | 4.41  | 4.74  | 3.82 | 5.09 | **4.89**  |
| german     | 0.85  | 0.96  | 0.52 | —    | **0.86**  |
| greek      | 3.22  | 2.96  | —    | —    | **3.54**  |
| hindi\*    | 5.85  | 5.14  | —    | —    | **5.34**  |
| indonesian | 1.25  | 1.67  | —    | —    | **1.34**  |
| italian    | 1.74  | 1.29  | 1.40 | —    | **1.75**  |
| japanese\* | 3.35  | 3.81  | 3.67 | —    | **4.61**  |
| korean\*   | 4.70  | 3.22  | 4.07 | 3.65 | **3.26**  |
| polish     | 1.30  | 0.64  | —    | —    | **1.63**  |
| portuguese | 1.74  | 1.40  | 1.21 | 1.52 | **2.48**  |
| romanian   | 22.39 | 2.29  | —    | —    | **2.19**  |
| russian    | 3.31  | 4.53  | 4.48 | —    | **3.99**  |
| spanish    | 1.34  | 0.99  | 0.75 | 1.81 | **1.13**  |
| turkish    | 0.88  | 2.18  | —    | —    | **1.00**  |
| ukrainian  | 5.85  | 0.71  | —    | —    | **1.23**  |
| vietnamese | 1.48  | 0.79  | —    | —    | **4.49**  |

> Lower is better. `*` indicates CER (character error rate); all other rows use WER (word error rate). Dashes (`—`) indicate the model does not officially support the language or no result is available.

</details>

### Supertonic 2 to Supertonic 3

<p align="center">
  <img src="img/metrics/supertonic2_vs_3_comparison.png" alt="Supertonic 2 and Supertonic 3 comparison">
</p>

Compared with Supertonic 2, Supertonic 3 reduces repeat and skip failures, improves speaker similarity across the shared-language set, and expands language coverage from 5 to 31 languages. It keeps the v2-compatible public ONNX interface, so existing integrations can move to v3 with the same inference contract.

### Runtime Footprint

<p align="center">
  <img src="img/metrics/runtime_cpu_gpu_latency_memory.png" alt="Supertonic CPU runtime compared with GPU baselines">
</p>

Supertonic 3 runs fast on CPU, even compared with larger baselines measured on A100 GPU, and uses substantially less memory. The open-weight fixed-voice setting does not require a GPU, which makes local, browser, and edge deployment much easier.

### Model Size

<p align="center">
  <img src="img/metrics/model_size_comparison.png" alt="Model size comparison">
</p>

At about 99M parameters across the public ONNX assets, Supertonic 3 is much smaller than 0.7B to 2B class open TTS systems. The smaller model size is a practical advantage for download size, startup time, and on-device inference.

## Voice Cloning

This open-weight repository focuses on fixed-voice, local TTS and does not include an official voice-cloning pipeline. If you want to bring your own voice to local Supertonic deployment, [Voice Builder](https://supertonic.supertone.ai/voice-builder) turns a short reference recording into version-specific JSON files for Supertonic 2 and Supertonic 3, so the same custom voice can move with you across supported Supertonic versions.

For a managed creation workflow, **Supertonic 3 is now officially available in [Supertone Play](https://play.supertone.ai/) and the [Supertone API](https://www.supertone.ai/ko/api)**. Use them when you want hosted content creation tools, diverse commercially usable preset voices, zero-shot voice cloning, or API-based integration without managing local model files. You can also listen to Supertonic 3 zero-shot samples on the [official showcase](https://supertonic3.github.io/).

## Demo

> **Try it now**: Experience Supertonic in your browser with our [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic-3), or get started with pre-trained models from [**Hugging Face Hub**](https://huggingface.co/Supertone/supertonic-3)

### Raspberry Pi

Watch Supertonic running on a **Raspberry Pi**, demonstrating on-device, real-time text-to-speech synthesis:

https://github.com/user-attachments/assets/ea66f6d6-7bc5-4308-8a88-1ce3e07400d2

### E-Reader

Experience Supertonic on an **Onyx Boox Go 6** e-reader in airplane mode, achieving an average RTF of 0.3× with zero network dependency:

https://github.com/user-attachments/assets/64980e58-ad91-423a-9623-78c2ffc13680

### Chrome Extension

Turns any webpage into audio in under one second, delivering lightning-fast, on-device text-to-speech with zero network dependency—free, private, and effortless:

https://github.com/user-attachments/assets/cc8a45fc-5c3e-4b2c-8439-a14c3d00d91c

## Programming Language Support

We provide ready-to-use TTS inference examples across multiple ecosystems:

| Language/Platform | Path | Description |
|-------------------|------|-------------|
| [**Python**](py/) | `py/` | ONNX Runtime inference |
| [**Node.js**](nodejs/) | `nodejs/` | Server-side JavaScript |
| [**Browser**](web/) | `web/` | WebGPU/WASM inference |
| [**Java**](java/) | `java/` | Cross-platform JVM |
| [**C++**](cpp/) | `cpp/` | High-performance C++ |
| [**C#**](csharp/) | `csharp/` | .NET ecosystem |
| [**Go**](go/) | `go/` | Go implementation |
| [**Swift**](swift/) | `swift/` | macOS applications |
| [**iOS**](ios/) | `ios/` | Native iOS apps |
| [**Rust**](rust/) | `rust/` | Memory-safe systems |
| [**Flutter**](flutter/) | `flutter/` | Cross-platform apps |

> For detailed usage instructions, please refer to the README.md in each language directory.

## Natural Text Handling

Supertonic is designed to handle complex, real-world text inputs that contain natural prose, punctuation, abbreviations, and proper nouns.

> 🎧 **View audio samples more easily**: Check out our [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic-3) for a better viewing experience of all audio examples

**Overview of Test Cases:**

| Category | Key Challenges | Supertonic | ElevenLabs | OpenAI | Gemini | Microsoft |
|:--------:|:--------------:|:----------:|:----------:|:------:|:------:|:---------:|
| Financial Expression | Decimal currency, abbreviated magnitudes (M, K), currency symbols, currency codes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Phone Number | Area codes, hyphens, extensions (ext.) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Technical Unit | Decimal numbers with units, abbreviated technical notations | ✅ | ❌ | ❌ | ❌ | ❌ |

<details>
<summary><b>Example 1: Financial Expression</b></summary>

<br>

**Text:**
> "The startup secured **$5.2M** in venture capital, a huge leap from their initial **$450K** seed round."

**Challenges:**
- Decimal point in currency ($5.2M should be read as "five point two million")
- Abbreviated magnitude units (M for million, K for thousand)
- Currency symbol ($) that needs to be properly pronounced as "dollars"

**Audio Samples:**

| System | Result | Audio Sample |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1eancUOhiSXCVoTu9ddh4S-OcVQaWrPV-/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1-r2scv7XQ1crIDu6QOh3eqVl445W6ap_/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1MFDXMjfmsAVOqwPx7iveS0KUJtZvcwxB/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1dEHpNzfMUucFTJPQK0k4RcFZvPwQTt09/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1b69XWBQnSZZ0WZeR3avv7E8mSdoN6p6P/view?usp=sharing) |

</details>

<details>
<summary><b>Example 2: Phone Number</b></summary>

<br>

**Text:**
> "You can reach the hotel front desk at **(212) 555-0142 ext. 402** anytime."

**Challenges:**
- Area code in parentheses that should be read as separate digits
- Phone number with hyphen separator (555-0142)
- Abbreviated extension notation (ext.)
- Extension number (402)

**Audio Samples:**

| System | Result | Audio Sample |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1z-e5iTsihryMR8ll1-N1YXkB2CIJYJ6F/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1HAzVXFTZfZm0VEK2laSpsMTxzufcuaxA/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/15tjfAmb3GbjP_kmvD7zSdIWkhtAaCPOg/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1BCL8n7yligUZyso970ud7Gf5NWb1OhKD/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1c0c0YM_Qm7XxSk2uSVYLbITgEDTqaVzL/view?usp=sharing) |

</details>

<details>
<summary><b>Example 3: Technical Unit</b></summary>

<br>

**Text:**
> "Our drone battery lasts **2.3h** when flying at **30kph** with full camera payload."

**Challenges:**
- Decimal time duration with abbreviation (2.3h = two point three hours)
- Speed unit with abbreviation (30kph = thirty kilometers per hour)
- Technical abbreviations (h for hours, kph for kilometers per hour)
- Technical/engineering context requiring proper pronunciation

**Audio Samples:**

| System | Result | Audio Sample |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1kvOBvswFkLfmr8hGplH0V2XiMxy1shYf/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1_SzfjWJe5YEd0t3R7DztkYhHcI_av48p/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1P5BSilj5xFPTV2Xz6yW5jitKZohO9o-6/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1GU82SnWC50OvC8CZNjhxvNZFKQb7I9_Y/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1lUTrxrAQy_viEK2Hlu3KLLtTCe8jvbdV/view?usp=sharing) |

</details>

> **Note:** These samples demonstrate how each system handles text normalization and pronunciation of complex expressions **without requiring pre-processing or phonetic annotations**.

## Built with Supertonic

| Project | Description | Links |
|---------|-------------|-------|
| **TLDRL** | Free, on-device TTS extension for reading any webpage | [Chrome](https://chromewebstore.google.com/detail/tldrl-lightning-tts-power/mdbiaajonlkomihpcaffhkagodbcgbme) |
| **Read Aloud** | Open-source TTS browser extension | [Chrome](https://chromewebstore.google.com/detail/read-aloud-a-text-to-spee/hdhinadidafjejdhmfkjgnolgimiaplp) · [Edge](https://microsoftedge.microsoft.com/addons/detail/read-aloud-a-text-to-spe/pnfonnnmfjnpfgagnklfaccicnnjcdkm) · [GitHub](https://github.com/ken107/read-aloud) |
| **PageEcho** | E-Book reader app for iOS | [App Store](https://apps.apple.com/us/app/pageecho/id6755965837) |
| **VoiceChat** | On-device voice-to-voice LLM chatbot in the browser | [Demo](https://huggingface.co/spaces/RickRossTN/ai-voice-chat) · [GitHub](https://github.com/irelate-ai/voice-chat) |
| **OmniAvatar** | Talking avatar video generator from photo + speech | [Demo](https://huggingface.co/spaces/alexnasa/OmniAvatar) |
| **CopiloTTS** | Kotlin Multiplatform TTS SDK via ONNX Runtime | [GitHub](https://github.com/sigmadeltasoftware/CopiloTTS) |
| **Aftertone** | Local post-reply TTS for Cursor & Claude Code (Supertonic 3 ONNX, on-device daemon) | [GitHub](https://github.com/omarelkhal/aftertone) · [Demo](https://github.com/omarelkhal/aftertone/releases/download/demo-asset/demo.mp4) |
| **Voice Mixer** | PyQt5 tool for mixing and modifying voice styles | [GitHub](https://github.com/Topping1/Supertonic-Voice-Mixer) |
| **Supertonic MNN** | Lightweight library based on MNN (fp32/fp16/int8) | [GitHub](https://github.com/vra/supertonic-mnn) · [PyPI](https://pypi.org/project/supertonic-mnn/) |
| **Transformers.js** | Hugging Face's JS library with Supertonic support | [GitHub PR](https://github.com/huggingface/transformers.js/pull/1459) · [Demo](https://huggingface.co/spaces/webml-community/Supertonic-TTS-WebGPU) |
| **Pinokio** | 1-click localhost cloud for Mac, Windows, and Linux | [Pinokio](https://pinokio.co/) · [GitHub](https://github.com/SUP3RMASS1VE/SuperTonic-TTS) |

## Models & Versions

|  | **Supertonic 3** | Supertonic 2 | Supertonic 1 |
|---|:---:|:---:|:---:|
| **Status** | 🟢 Latest | Stable | Legacy |
| **Parameters** | ~99M | ~66M | ~66M |
| **Languages** | 31 | 5 | 1 (en) |
| **Expression Tags** | ✅ 10 tags | — | — |
| **Code** | [main](https://github.com/supertone-inc/supertonic) | [release/supertonic-2](https://github.com/supertone-inc/supertonic/tree/release/supertonic-2) | — |
| **Weights** | [🤗 HF](https://huggingface.co/Supertone/supertonic-3) | [🤗 HF](https://huggingface.co/Supertone/supertonic-2) | [🤗 HF](https://huggingface.co/Supertone/supertonic) |
| **Interactive Demo** | [🤗 Space](https://huggingface.co/spaces/Supertone/supertonic-3) | [🤗 Space](https://huggingface.co/spaces/Supertone/supertonic-2) | [🤗 Space](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo) |
| **Audio Samples** | [DemoPage](https://supertonic3.github.io/) | — | [DemoPage](https://supertonictts.github.io/) |

## Citation

The following papers describe the core technologies used in Supertonic. If you use this system in your research or find these techniques useful, please consider citing the relevant papers:

### SupertonicTTS: Main Architecture

This paper introduces the overall architecture of SupertonicTTS, including the speech autoencoder, flow-matching based text-to-latent module, and efficient design choices.

```bibtex
@article{kim2025supertonic,
  title={SupertonicTTS: Towards Highly Efficient and Streamlined Text-to-Speech System},
  author={Kim, Hyeongju and Yang, Jinhyeok and Yu, Yechan and Ji, Seunghun and Morton, Jacob and Bous, Frederik and Byun, Joon and Lee, Juheon},
  journal={arXiv preprint arXiv:2503.23108},
  year={2025},
  url={https://arxiv.org/abs/2503.23108}
}
```

### Length-Aware RoPE: Text-Speech Alignment

This paper presents Length-Aware Rotary Position Embedding (LARoPE), which improves text-speech alignment in cross-attention mechanisms.

```bibtex
@article{kim2025larope,
  title={Length-Aware Rotary Position Embedding for Text-Speech Alignment},
  author={Kim, Hyeongju and Lee, Juheon and Yang, Jinhyeok and Morton, Jacob},
  journal={arXiv preprint arXiv:2509.11084},
  year={2025},
  url={https://arxiv.org/abs/2509.11084}
}
```

### Self-Purifying Flow Matching: Training with Noisy Labels

This paper describes the self-purification technique for training flow matching models robustly with noisy or unreliable labels.

```bibtex
@article{kim2025spfm,
  title={Training Flow Matching Models with Reliable Labels via Self-Purification},
  author={Kim, Hyeongju and Yu, Yechan and Yi, June Young and Lee, Juheon},
  journal={arXiv preprint arXiv:2509.19091},
  year={2025},
  url={https://arxiv.org/abs/2509.19091}
}
```

### RobustSpeechFlow: Learning Robust Text-to-Speech Trajectories via Augmentation-based Contrastive Flow Matching

This paper describes the RobustSpeechFlow technique for improving the robustness and quality of text-to-speech generation by optimizing flow-matching trajectories against data variability

```bibtex
@misc{yang2026robustspeechflowlearningrobusttexttospeech,
      title={RobustSpeechFlow: Learning Robust Text-to-Speech Trajectories via Augmentation-based Contrastive Flow Matching}, 
      author={Jinhyeok Yang and Hyeongju Kim and Yechan Yu and Joon Byun and Frederik Bous and Juheon Lee},
      year={2026},
      eprint={2605.22083},
      archivePrefix={arXiv},
      primaryClass={cs.SD},
      url={https://arxiv.org/abs/2605.22083}, 
}
```

## License

This project's sample code is released under the MIT License. - see the [LICENSE](https://github.com/supertone-inc/supertonic?tab=MIT-1-ov-file) for details.

The accompanying model is released under the OpenRAIL-M License. - see the [LICENSE](https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE) file for details.

This model was trained using PyTorch, which is licensed under the BSD 3-Clause License but is not redistributed with this project. - see the [LICENSE](https://docs.pytorch.org/FBGEMM/general/License.html) for details.

Copyright (c) 2026 Supertone Inc.
