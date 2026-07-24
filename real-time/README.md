# Supertonic Real-Time Conversational TTS

A real-time voice-to-voice conversational AI system built with Supertonic TTS and Ollama. Have natural conversations with AI through voice input and output.

## Features

- 🚀 **Real-time Streaming**: Streams audio chunks as they're generated for low-latency speech
- 🤖 **Ollama Integration**: Real-time conversations with local LLMs
- 🎤 **Voice Input**: Live voice transcription for hands-free conversations
- 📡 **Multiple Protocols**: Supports both Server-Sent Events (SSE) and WebSocket
- ⚡ **Low Latency**: First audio chunk available within seconds
- 🎭 **Voice Styles**: Support for all voice presets (M1, M2, F1, F2)
- 🔧 **Configurable**: Adjustable denoising steps and speech speed
- 💬 **Conversation History**: Maintains context across multiple messages
- 🎯 **User Priority**: AI automatically stops speaking when user starts talking

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running with at least one model pulled
3. **Supertonic assets** (ONNX models and voice styles) in `../../assets/` (parent directory)
   - The assets folder should contain `onnx/` and `voice_styles/` directories
   - If missing, download from the parent directory: `git clone https://huggingface.co/Supertone/supertonic assets`

## Quick Start

```bash
# Install dependencies in nodejs directory (required for helper.js)
cd ../nodejs
npm install
cd ../real-time

# Install dependencies in real-time directory
npm install

# Start Ollama (if not already running)
ollama serve

# Pull a low-latency model (recommended for real-time conversations)
ollama pull llama3.2:1b

# Or for better quality with slightly higher latency:
# ollama pull llama3.2

# Start the server
npm start
```

The server will start on `http://localhost:3001`.

## Usage

### Basic TTS Streaming

Open `test-client.html` in your browser to test basic TTS streaming with text input.

### Voice Conversations

Open `conversation-client.html` in your browser to start a voice-to-voice conversation with the AI.

**Features:**

- 🎤 Voice input using Web Speech API
- 🤖 Real-time conversations with Ollama
- ⚡ Low-latency audio streaming
- 🎯 User priority - AI stops when you speak
- 🔄 Continuous listening mode
- 📱 Responsive design

**Controls:**

- **Model Selection**: Choose from available Ollama models
- **Voice**: Select voice style (M1, M2, F1, F2)
- **Steps**: Control TTS quality (1-20, default: 3)
- **Speed**: Control speech speed (0.5-2.0, default: 1.4)
- **Real-time Mode**: Enable continuous listening

## API Endpoints

- `POST /stream` - Basic TTS streaming (SSE)
- `POST /conversation` - Conversational AI with Ollama (SSE)
- `WS /ws` - WebSocket endpoint for bidirectional streaming
- `GET /health` - Health check
- `GET /models` - List available Ollama models
- `GET /voices` - List available voice styles

## Voice Transcription

### Browser-Based (Recommended - Works Immediately!)

The conversation client uses the **Web Speech API** for voice transcription, which works immediately in modern browsers (Chrome, Edge, Safari) without any additional setup. Just click the "🎤 Start Voice" button and grant microphone permissions.

### Server-Side Whisper Integration (Optional)

For server-side transcription with higher accuracy, you can integrate [whisper.cpp](https://github.com/ggerganov/whisper.cpp) or use the OpenAI Whisper API.

**Using whisper.cpp:**

1. Build whisper.cpp following the [official instructions](https://github.com/ggerganov/whisper.cpp#usage)
2. Download a model (e.g., `ggml-base.en.bin`)
3. Implement the `/transcribe` endpoint in `server.js` to call whisper.cpp

**Example integration:**

```javascript
// In server.js, add to /transcribe endpoint
const { exec } = require('child_process');
const whisperPath = '/path/to/whisper.cpp/bin/main';
const modelPath = '/path/to/models/ggml-base.en.bin';

// Process audio and return transcription
exec(`${whisperPath} -m ${modelPath} -f audio.wav`, (error, stdout, stderr) => {
  // Parse output and return transcription
});
```

**Note:** The conversation client already supports voice input using the browser Web Speech API, which works immediately without any server-side setup.

## License

MIT
