# Supertonic — 极速、本地、精准的 TTS

[![v3 Demo](https://img.shields.io/badge/🤗%20v3-Demo-yellow)](https://huggingface.co/spaces/Supertone/supertonic-3)
[![v3 Models](https://img.shields.io/badge/🤗%20v3-Models-blue)](https://huggingface.co/Supertone/supertonic-3)
[![v2 Branch](https://img.shields.io/badge/v2-release%2Fsupertonic--2-lightgrey)](https://github.com/supertone-inc/supertonic/tree/release/supertonic-2)
[![v1 Demo](https://img.shields.io/badge/🤗%20v1%20(old)-Demo-lightgrey)](https://huggingface.co/spaces/Supertone/supertonic#interactive-demo)
[![v1 Models](https://img.shields.io/badge/🤗%20v1%20(old)-Models-lightgrey)](https://huggingface.co/Supertone/supertonic)

[English](README.md) | 简体中文

<p align="center">
  <img src="img/Supertonic3_HeroImage.png" alt="Supertonic 3 Banner">
</p>

**Supertonic** 是一套面向本地推理优化的极速文本转语音系统，开销极低。底层使用 ONNX Runtime，整套流程都在你自己的设备上完成——无需上云、无需调用 API,也不必担心隐私问题。

### 📰 更新动态

- **2026.04.29** - 🎉 **Supertonic 3** 发布，支持 **31 种语言**，朗读准确度提升，重复/漏字现象更少，并保留与 v2 兼容的公开 ONNX 资源。[Demo](https://huggingface.co/spaces/Supertone/supertonic-3) | [Models](https://huggingface.co/Supertone/supertonic-3)
- **2026.01.22** - **[Voice Builder](https://supertonic.supertone.ai/voice_builder)** 正式上线!可将自己的声音定制成可部署、可永久持有的端侧 TTS 模型。
- **2026.01.06** - 🎉 **Supertonic 2** 发布,支持 5 种语言。v2 代码路径保留在 [`release/supertonic-2`](https://github.com/supertone-inc/supertonic/tree/release/supertonic-2) 分支上。
- **2025.12.10** - 新增 `supertonic` PyPI 包!通过 `pip install supertonic` 即可安装。详情见 [supertonic-py 文档](https://supertone-inc.github.io/supertonic-py)。
- **2025.12.10** - 新增 [6 个新发音风格](https://huggingface.co/Supertone/supertonic/tree/b10dbaf18b316159be75b34d24f740008fddd381)(M3、M4、M5、F3、F4、F5)。详见 [Voices](https://supertone-inc.github.io/supertonic-py/voices/)。
- **2025.12.08** - 通过 [OnnxSlim](https://github.com/inisis/OnnxSlim) 优化后的 ONNX 模型已上线 [Hugging Face Models](https://huggingface.co/Supertone/supertonic)。
- **2025.11.24** - 新增 Flutter SDK 支持,适配 macOS。

## 快速开始

安装 Python SDK 即可立即生成语音。首次运行时,Supertonic 会自动从 Hugging Face 下载模型资源。

```bash
pip install supertonic
```

### Python

```python
from supertonic import TTS

# First run downloads the model from Hugging Face automatically.
tts = TTS(auto_download=True)

style = tts.get_voice_style(voice_name="M1")

text = "A gentle breeze moved through the open window while everyone listened to the story."
wav, duration = tts.synthesize(text, voice_style=style, lang="en")

tts.save_audio(wav, "output.wav")
print(f"Generated {duration:.2f}s of audio")
```

## 入门指南

首先克隆仓库:

```bash
git clone https://github.com/supertone-inc/supertonic.git
cd supertonic
```

### 前置准备

在运行示例之前,需要先下载 ONNX 模型和预设语音,并放入 `assets` 目录:

> **提示:** Hugging Face 仓库使用 Git LFS。在克隆或拉取大型模型文件之前,请先确认 Git LFS 已正确安装并初始化。
> - macOS: `brew install git-lfs && git lfs install`
> - 通用方式: 参考 `https://git-lfs.com` 的安装说明。

```bash
git lfs install
git clone https://huggingface.co/Supertone/supertonic-3 assets
```

部分语言示例还需要相应的本地运行时:
- **Go**: 安装 ONNX Runtime C 库。在 macOS 上执行 `brew install onnxruntime` 即可,Go 示例会自动检测 Homebrew 路径。
- **Java**: 需要 JDK,而不只是 JRE。在 macOS 上可以使用 `brew install openjdk@17`。
- **C#**: 目标框架为 .NET 9,且允许大版本向前兼容 (roll-forward),因此 .NET 9 或更新的运行时均可运行。

随后即可运行 Python 示例:

```bash
cd py
uv sync
uv run example_onnx.py
```

执行后会使用默认预设语音生成 `outputs/output.wav`。

### 其他运行时示例

<details>
<summary><b>在其他语言和平台上运行 Supertonic</b></summary>

**Node.js 示例** ([详情](nodejs/))
```bash
cd nodejs
npm install
npm start
```

**浏览器示例** ([详情](web/))
```bash
cd web
npm install
npm run dev
```

**Java 示例** ([详情](java/))
```bash
cd java
mvn clean install
mvn exec:java
```

**C++ 示例** ([详情](cpp/))
```bash
cd cpp
mkdir build && cd build
cmake .. && cmake --build . --config Release
./example_onnx
```

**C# 示例** ([详情](csharp/))
```bash
cd csharp
dotnet restore
dotnet run
```

**Go 示例** ([详情](go/))
```bash
cd go
go mod download
go run example_onnx.go helper.go
```

**Swift 示例** ([详情](swift/))
```bash
cd swift
swift build -c release
.build/release/example_onnx
```

**Rust 示例** ([详情](rust/))
```bash
cd rust
cargo build --release
./target/release/example_onnx
```

**iOS 示例** ([详情](ios/))
```bash
cd ios/ExampleiOSApp
xcodegen generate
open ExampleiOSApp.xcodeproj
```

在 Xcode 中: Targets → ExampleiOSApp → Signing 选择你的 Team,然后选择 iPhone 作为运行目标并构建。

</details>


### 技术细节

- **运行时**: 基于 ONNX Runtime,跨平台推理
- **浏览器支持**: 通过 onnxruntime-web 实现客户端推理
- **批处理**: 支持 batch 推理,提升吞吐量
- **音频输出**: 输出 16-bit WAV 文件

## 性能表现

Supertonic 3 面向真实的端侧推理场景设计:模型体积足够小、可以在本地跑起来,同时在指标上仍能与体量大得多的开源 TTS 系统正面比较。

### 朗读准确度

<p align="center">
  <img src="img/metrics/s3_vs_measured_wer_range_voxcpm2.png" alt="Supertonic 3 reading accuracy compared with measured model ranges and VoxCPM2">
</p>

在已测语种范围内,Supertonic 3 的 WER/CER 与 VoxCPM2 等更大体量的开源 TTS 模型保持在同一区间内,同时仍能维持轻量级的端侧部署路径。带星号的语种采用 CER 指标,其余语种采用 WER。

### Supertonic 2 与 Supertonic 3 对比

<p align="center">
  <img src="img/metrics/supertonic2_vs_3_comparison.png" alt="Supertonic 2 and Supertonic 3 comparison">
</p>

相较于 Supertonic 2,Supertonic 3 进一步降低了重复和漏字现象,在共同语种上的说话人相似度也有所提升,语种覆盖更是从 5 种扩展到 31 种。同时它仍然保留与 v2 兼容的公开 ONNX 接口,因此现有集成可以使用同一份推理契约平滑升级到 v3。

### 运行时占用

<p align="center">
  <img src="img/metrics/runtime_cpu_gpu_latency_memory.png" alt="Supertonic CPU runtime compared with GPU baselines">
</p>

Supertonic 3 即使只跑在 CPU 上,也能与运行在 A100 GPU 上的更大模型相比毫不逊色,而且占用的内存显著更少。开放权重的固定声线模式无需 GPU,这让本地部署、浏览器部署和边缘端部署都更易落地。

### 模型大小

<p align="center">
  <img src="img/metrics/model_size_comparison.png" alt="Model size comparison">
</p>

Supertonic 3 的公开 ONNX 资源参数量约为 99M,远小于 0.7B–2B 量级的开源 TTS 系统。模型更小,意味着下载体积、启动时间和端侧推理在工程上都更具优势。

## Demo

> **立即体验**: 在浏览器中通过 [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic-3) 试用 Supertonic,或从 [**Hugging Face Hub**](https://huggingface.co/Supertone/supertonic-3) 获取预训练模型。

### Raspberry Pi

观看 Supertonic 在 **Raspberry Pi** 上运行,演示真正的端侧、实时文本转语音合成:

https://github.com/user-attachments/assets/ea66f6d6-7bc5-4308-8a88-1ce3e07400d2

### 电子书阅读器

在 **Onyx Boox Go 6** 电子书阅读器的飞行模式下运行 Supertonic,平均 RTF 达到 0.3×,完全无需联网:

https://github.com/user-attachments/assets/64980e58-ad91-423a-9623-78c2ffc13680

### Chrome 扩展

把任意网页在一秒内变成可朗读的音频,极速、本地化、零网络依赖——免费、私密、用起来毫无负担:

https://github.com/user-attachments/assets/cc8a45fc-5c3e-4b2c-8439-a14c3d00d91c

## 为什么选择 Supertonic?

- **极致速度**: 针对低延迟、端侧语音生成做了优化,覆盖桌面、浏览器和边缘端等多种部署场景
- **轻量小巧**: ONNX 资源体积紧凑,适合本地高效执行
- **完全本地**: 100% 隐私可控,完全无网络依赖
- **朗读准确**: 朗读稳定性更好,重复和漏字明显减少
- **表情标签**: 支持 `<laugh>`、`<breath>`、`<sigh>` 等简单的表情标签
- **部署灵活**: 提供 Python、JavaScript、浏览器、移动端及多种原生运行时的开箱即用示例

## 语言支持

Supertonic 3 支持 31 种语言:

| Code | Language | Code | Language | Code | Language | Code | Language |
|------|----------|------|----------|------|----------|------|----------|
| `en` | English | `ko` | Korean | `ja` | Japanese | `ar` | Arabic |
| `bg` | Bulgarian | `cs` | Czech | `da` | Danish | `de` | German |
| `el` | Greek | `es` | Spanish | `et` | Estonian | `fi` | Finnish |
| `fr` | French | `hi` | Hindi | `hr` | Croatian | `hu` | Hungarian |
| `id` | Indonesian | `it` | Italian | `lt` | Lithuanian | `lv` | Latvian |
| `nl` | Dutch | `pl` | Polish | `pt` | Portuguese | `ro` | Romanian |
| `ru` | Russian | `sk` | Slovak | `sl` | Slovenian | `sv` | Swedish |
| `tr` | Turkish | `uk` | Ukrainian | `vi` | Vietnamese | | |

我们在多种语言/平台上提供了开箱即用的 TTS 推理示例:

| 语言 / 平台 | 路径 | 说明 |
|-------------------|------|-------------|
| [**Python**](py/) | `py/` | 基于 ONNX Runtime 的推理 |
| [**Node.js**](nodejs/) | `nodejs/` | 服务端 JavaScript |
| [**浏览器**](web/) | `web/` | WebGPU/WASM 推理 |
| [**Java**](java/) | `java/` | 跨平台 JVM |
| [**C++**](cpp/) | `cpp/` | 高性能 C++ |
| [**C#**](csharp/) | `csharp/` | .NET 生态 |
| [**Go**](go/) | `go/` | Go 实现 |
| [**Swift**](swift/) | `swift/` | macOS 应用 |
| [**iOS**](ios/) | `ios/` | 原生 iOS 应用 |
| [**Rust**](rust/) | `rust/` | 内存安全的系统编程 |
| [**Flutter**](flutter/) | `flutter/` | 跨平台移动应用 |

> 详细使用说明请查看每个语言子目录中的 README.md。

## 真实文本处理能力

Supertonic 在设计上就考虑了真实世界中各种复杂的文本输入,涵盖自然语句、标点、缩写以及专有名词。

> 🎧 **更方便地试听**: 推荐前往 [**Interactive Demo**](https://huggingface.co/spaces/Supertone/supertonic-3),可以更方便地浏览所有音频示例。

**测试场景概览:**

| 场景 | 主要难点 | Supertonic | ElevenLabs | OpenAI | Gemini | Microsoft |
|:--------:|:--------------:|:----------:|:----------:|:------:|:------:|:---------:|
| 金额表达 | 含小数的货币、缩写量级 (M、K)、货币符号、货币代码 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 电话号码 | 区号、连字符、分机号 (ext.) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 技术单位 | 含小数和单位的数字、缩写形式的技术记号 | ✅ | ❌ | ❌ | ❌ | ❌ |

<details>
<summary><b>示例 1: 金额表达</b></summary>

<br>

**文本:**
> "The startup secured **$5.2M** in venture capital, a huge leap from their initial **$450K** seed round."

**难点:**
- 货币中带小数点 ($5.2M 应读作 "five point two million")
- 缩写量级单位 (M 表示百万,K 表示千)
- 货币符号 ($) 需要正确读作 "dollars"

**音频示例:**

| 系统 | 结果 | 音频示例 |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1eancUOhiSXCVoTu9ddh4S-OcVQaWrPV-/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1-r2scv7XQ1crIDu6QOh3eqVl445W6ap_/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1MFDXMjfmsAVOqwPx7iveS0KUJtZvcwxB/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1dEHpNzfMUucFTJPQK0k4RcFZvPwQTt09/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1b69XWBQnSZZ0WZeR3avv7E8mSdoN6p6P/view?usp=sharing) |

</details>

<details>
<summary><b>示例 2: 电话号码</b></summary>

<br>

**文本:**
> "You can reach the hotel front desk at **(212) 555-0142 ext. 402** anytime."

**难点:**
- 圆括号中的区号需要按数字逐位朗读
- 含连字符的电话号码 (555-0142)
- 缩写形式的分机号记法 (ext.)
- 分机号 (402)

**音频示例:**

| 系统 | 结果 | 音频示例 |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1z-e5iTsihryMR8ll1-N1YXkB2CIJYJ6F/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1HAzVXFTZfZm0VEK2laSpsMTxzufcuaxA/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/15tjfAmb3GbjP_kmvD7zSdIWkhtAaCPOg/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1BCL8n7yligUZyso970ud7Gf5NWb1OhKD/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1c0c0YM_Qm7XxSk2uSVYLbITgEDTqaVzL/view?usp=sharing) |

</details>

<details>
<summary><b>示例 3: 技术单位</b></summary>

<br>

**文本:**
> "Our drone battery lasts **2.3h** when flying at **30kph** with full camera payload."

**难点:**
- 含小数的时间表达加缩写 (2.3h = two point three hours)
- 含单位的速度缩写 (30kph = thirty kilometers per hour)
- 技术缩写 (h 表示小时,kph 表示千米每小时)
- 工程语境下需要正确发音

**音频示例:**

| 系统 | 结果 | 音频示例 |
|--------|--------|--------------|
| **Supertonic** | ✅ | [🎧 Play Audio](https://drive.google.com/file/d/1kvOBvswFkLfmr8hGplH0V2XiMxy1shYf/view?usp=sharing) |
| ElevenLabs Flash v2.5 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1_SzfjWJe5YEd0t3R7DztkYhHcI_av48p/view?usp=sharing) |
| OpenAI TTS-1 | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1P5BSilj5xFPTV2Xz6yW5jitKZohO9o-6/view?usp=sharing) |
| Gemini 2.5 Flash TTS | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1GU82SnWC50OvC8CZNjhxvNZFKQb7I9_Y/view?usp=sharing) |
| VibeVoice Realtime 0.5B | ❌ | [🎧 Play Audio](https://drive.google.com/file/d/1lUTrxrAQy_viEK2Hlu3KLLtTCe8jvbdV/view?usp=sharing) |

</details>

> **说明:** 上述样例展示了各家系统在**无需任何预处理或音标标注**的情况下,如何处理文本归一化以及对复杂表达式的发音。

## 基于 Supertonic 构建的项目

| 项目 | 说明 | 链接 |
|---------|-------------|-------|
| **TLDRL** | 免费、本地化的 TTS 扩展,可朗读任意网页 | [Chrome](https://chromewebstore.google.com/detail/tldrl-lightning-tts-power/mdbiaajonlkomihpcaffhkagodbcgbme) |
| **Read Aloud** | 开源 TTS 浏览器扩展 | [Chrome](https://chromewebstore.google.com/detail/read-aloud-a-text-to-spee/hdhinadidafjejdhmfkjgnolgimiaplp) · [Edge](https://microsoftedge.microsoft.com/addons/detail/read-aloud-a-text-to-spe/pnfonnnmfjnpfgagnklfaccicnnjcdkm) · [GitHub](https://github.com/ken107/read-aloud) |
| **PageEcho** | 面向 iOS 的电子书阅读器应用 | [App Store](https://apps.apple.com/us/app/pageecho/id6755965837) |
| **VoiceChat** | 浏览器中本地运行的语音对语音 LLM 聊天机器人 | [Demo](https://huggingface.co/spaces/RickRossTN/ai-voice-chat) · [GitHub](https://github.com/irelate-ai/voice-chat) |
| **OmniAvatar** | 由照片和语音生成会说话的虚拟形象视频 | [Demo](https://huggingface.co/spaces/alexnasa/OmniAvatar) |
| **CopiloTTS** | 基于 ONNX Runtime 的 Kotlin Multiplatform TTS SDK | [GitHub](https://github.com/sigmadeltasoftware/CopiloTTS) |
| **Voice Mixer** | 用于混合和调整音色的 PyQt5 工具 | [GitHub](https://github.com/Topping1/Supertonic-Voice-Mixer) |
| **Supertonic MNN** | 基于 MNN 的轻量库 (fp32/fp16/int8) | [GitHub](https://github.com/vra/supertonic-mnn) · [PyPI](https://pypi.org/project/supertonic-mnn/) |
| **Transformers.js** | Hugging Face 官方 JS 库已支持 Supertonic | [GitHub PR](https://github.com/huggingface/transformers.js/pull/1459) · [Demo](https://huggingface.co/spaces/webml-community/Supertonic-TTS-WebGPU) |
| **Pinokio** | 适用于 Mac、Windows 和 Linux 的一键本地化云平台 | [Pinokio](https://pinokio.co/) · [GitHub](https://github.com/SUP3RMASS1VE/SuperTonic-TTS) |

## 引用

下列论文介绍了 Supertonic 所使用的核心技术。如果你在研究中使用了本系统,或者发现这些技术有用,欢迎引用对应论文:

### SupertonicTTS: 主体架构

该论文介绍了 SupertonicTTS 的整体架构,包括语音自编码器、基于流匹配 (flow matching) 的文本到隐空间模块,以及高效的设计选型。

```bibtex
@article{kim2025supertonic,
  title={SupertonicTTS: Towards Highly Efficient and Streamlined Text-to-Speech System},
  author={Kim, Hyeongju and Yang, Jinhyeok and Yu, Yechan and Ji, Seunghun and Morton, Jacob and Bous, Frederik and Byun, Joon and Lee, Juheon},
  journal={arXiv preprint arXiv:2503.23108},
  year={2025},
  url={https://arxiv.org/abs/2503.23108}
}
```

### Length-Aware RoPE: 文本-语音对齐

该论文提出了 Length-Aware Rotary Position Embedding (LARoPE),用于改进交叉注意力机制中的文本-语音对齐。

```bibtex
@article{kim2025larope,
  title={Length-Aware Rotary Position Embedding for Text-Speech Alignment},
  author={Kim, Hyeongju and Lee, Juheon and Yang, Jinhyeok and Morton, Jacob},
  journal={arXiv preprint arXiv:2509.11084},
  year={2025},
  url={https://arxiv.org/abs/2509.11084}
}
```

### Self-Purifying Flow Matching: 在含噪标签下的训练

该论文介绍了一种自净化技术,可在噪声或不可靠标签条件下稳健地训练流匹配模型。

```bibtex
@article{kim2025spfm,
  title={Training Flow Matching Models with Reliable Labels via Self-Purification},
  author={Kim, Hyeongju and Yu, Yechan and Yi, June Young and Lee, Juheon},
  journal={arXiv preprint arXiv:2509.19091},
  year={2025},
  url={https://arxiv.org/abs/2509.19091}
}
```

## 许可证

本项目的示例代码基于 MIT 协议开源,详情请见 [LICENSE](https://github.com/supertone-inc/supertonic?tab=MIT-1-ov-file)。

随附的模型基于 OpenRAIL-M 协议发布,详情请见 [LICENSE](https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE) 文件。

本模型在训练阶段使用了 PyTorch,PyTorch 基于 BSD 3-Clause 协议授权,但并未随本项目一起再分发,详情请见 [LICENSE](https://docs.pytorch.org/FBGEMM/general/License.html)。

Copyright (c) 2026 Supertone Inc.
