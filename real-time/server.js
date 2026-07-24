import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';

import {
  loadTextToSpeech,
  loadVoiceStyle,
} from '../nodejs/helper.js';

/**
 * Chunk text into manageable segments
 */
function chunkText(text, maxLen = 300) {
  if (typeof text !== 'string') {
    throw new Error(`chunkText expects a string, got ${typeof text}`);
  }

  // Split by paragraph (two or more newlines)
  const paragraphs = text.trim().split(/\n\s*\n+/).filter(p => p.trim());

  const chunks = [];

  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (!paragraph) continue;

    // Split by sentence boundaries (period, question mark, exclamation mark followed by space)
    // But exclude common abbreviations like Mr., Mrs., Dr., etc. and single capital letters like F.
    const sentences = paragraph.split(/(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/);

    let currentChunk = '';

    for (let sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= maxLen) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// ============================================================================
// Logging Utility
// ============================================================================
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL = process.env.LOG_LEVEL
  ? LogLevel[process.env.LOG_LEVEL.toUpperCase()] ?? LogLevel.INFO
  : LogLevel.INFO;

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, message, ...args) {
  const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  if (level <= LOG_LEVEL) {
    const prefix = `[${formatTimestamp()}] [${levelNames[level]}]`;
    const logMethod = level === LogLevel.ERROR ? console.error : console.log;
    logMethod(prefix, message, ...args);
  }
}

const logger = {
  error: (message, ...args) => log(LogLevel.ERROR, message, ...args),
  warn: (message, ...args) => log(LogLevel.WARN, message, ...args),
  info: (message, ...args) => log(LogLevel.INFO, message, ...args),
  debug: (message, ...args) => log(LogLevel.DEBUG, message, ...args),
};

// ============================================================================
// Error Handlers
// ============================================================================
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  if (reason instanceof Error) {
    logger.error('Stack:', reason.stack);
  }
});

// ============================================================================
// Middleware
// ============================================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
    return originalSend.call(this, body);
  };

  next();
});

// Configuration
// Assets are in the parent directory (../../assets relative to real-time)
const ONNX_DIR = path.resolve(__dirname, '../../assets/onnx');
const VOICE_STYLES_DIR = path.resolve(__dirname, '../../assets/voice_styles');
const DEFAULT_VOICE = 'M1.json';
const DEFAULT_STEPS = 3;
const DEFAULT_SPEED = 1.4;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11435';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// System prompt for the AI assistant
const DEFAULT_SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  `You are a friendly, helpful AI assistant with the ability to speak and hear. You can have natural, conversational interactions with users through voice.

Key capabilities:
- You can hear and understand what users say to you
- You can speak back to them with a natural voice
- You can have free-flowing conversations just like talking to a friend

Personality:
- Be warm, friendly, and conversational
- Speak naturally as if you're having a real conversation
- Be helpful, curious, and engaging
- Feel free to ask questions, share thoughts, and express yourself naturally
- Keep responses concise for voice conversations (2-3 sentences typically work best)

Remember: You're having a real-time voice conversation, so be natural, responsive, and engaging!`;

// Conversation history storage (in-memory, per session)
const conversations = new Map();

// Global TTS instance (loaded once at startup)
let textToSpeech = null;
let defaultStyle = null;

// Initialize TTS
async function initializeTTS() {
  try {
    logger.info('Loading TTS models...');
    const startTime = Date.now();

    textToSpeech = await loadTextToSpeech(ONNX_DIR, false);

    const defaultStylePath = path.join(VOICE_STYLES_DIR, DEFAULT_VOICE);
    defaultStyle = loadVoiceStyle([defaultStylePath], false);

    const loadTime = Date.now() - startTime;
    logger.info(`TTS models loaded successfully! (${loadTime}ms)`);
    return true;
  } catch (error) {
    logger.error('Failed to initialize TTS:', error);
    logger.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Convert audio samples to WAV buffer
 */
function audioToWavBuffer(audioData, sampleRate) {
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = (audioData.length * bitsPerSample) / 8;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write audio data
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Stream audio chunks as they're generated
 */
async function streamAudioChunks(text, style, totalStep, speed, res) {
  const chunks = chunkText(text, 0);
  let totalDuration = 0;
  let chunkIndex = 0;

  // Send initial metadata
  res.write(
    `data: ${JSON.stringify({ type: 'start', totalChunks: chunks.length })}\n\n`
  );

  for (let i = 0; i < chunks.length; i++) {
    try {
      // Generate audio for this chunk
      const result = await textToSpeech._infer(
        [chunks[i]],
        style,
        totalStep,
        speed
      );
      const duration = result.duration[0];
      const wavLen = Math.floor(textToSpeech.sampleRate * duration);
      const wavChunk = result.wav.slice(0, wavLen);

      // Convert to WAV buffer
      const wavBuffer = audioToWavBuffer(wavChunk, textToSpeech.sampleRate);

      // Send chunk metadata
      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          chunkIndex: i + 1,
          totalChunks: chunks.length,
          duration: duration,
          sampleRate: textToSpeech.sampleRate,
        })}\n\n`
      );

      // Send audio data as base64
      const audioBase64 = wavBuffer.toString('base64');
      res.write(
        `data: ${JSON.stringify({
          type: 'audio',
          chunkIndex: i + 1,
          data: audioBase64,
        })}\n\n`
      );

      totalDuration += duration;
      chunkIndex++;

      // Add silence between chunks (except for last chunk)
      if (i < chunks.length - 1) {
        const silenceDuration = 0.3;
        const silenceLen = Math.floor(
          silenceDuration * textToSpeech.sampleRate
        );
        const silence = new Array(silenceLen).fill(0);
        const silenceBuffer = audioToWavBuffer(
          silence,
          textToSpeech.sampleRate
        );
        const silenceBase64 = silenceBuffer.toString('base64');

        res.write(
          `data: ${JSON.stringify({
            type: 'silence',
            duration: silenceDuration,
            data: silenceBase64,
          })}\n\n`
        );

        totalDuration += silenceDuration;
      }
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error.message,
          chunkIndex: i + 1,
        })}\n\n`
      );
      break;
    }
  }

  // Send completion
  res.write(
    `data: ${JSON.stringify({
      type: 'end',
      totalDuration: totalDuration,
      totalChunks: chunkIndex,
    })}\n\n`
  );

  res.end();
}

/**
 * Stream text from Ollama and convert to speech in real-time
 */
async function streamOllamaToSpeech(
  userMessage,
  conversationId,
  model,
  style,
  steps,
  speed,
  systemPrompt,
  res
) {
  // Get or create conversation history
  let messages = conversations.get(conversationId) || [];

  // Use provided system prompt or default (ensure it's a string)
  const promptToUse =
    systemPrompt && typeof systemPrompt === 'string'
      ? systemPrompt
      : DEFAULT_SYSTEM_PROMPT;

  // Initialize with system prompt if this is a new conversation
  if (messages.length === 0) {
    messages.push({ role: 'system', content: promptToUse });
    logger.debug('Initialized new conversation with system prompt');
  }

  // Add user message to history
  messages.push({ role: 'user', content: userMessage });

  // Send start event
  res.write(
    `data: ${JSON.stringify({
      type: 'conversation_start',
      conversationId,
    })}\n\n`
  );

  try {
    // Check if Ollama is available first
    try {
      const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!healthCheck.ok) {
        throw new Error('Ollama is not running or not accessible');
      }
    } catch (healthError) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: `Ollama is not running! Please start Ollama: ollama serve (URL: ${OLLAMA_BASE_URL})`,
        })}\n\n`
      );
      res.end();
      return;
    }

    // Stream from Ollama
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(
        `Ollama API error (${ollamaResponse.status}): ${ollamaResponse.statusText}. ${errorText}`
      );
    }

    // node-fetch v3 uses Node.js streams, not ReadableStream with getReader()
    const decoder = new TextDecoder();
    let fullResponse = '';
    let currentSentence = '';
    let buffer = '';

    // Process Ollama stream using Node.js stream API
    for await (const chunk of ollamaResponse.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);

            if (data.message && data.message.content) {
              const content = data.message.content;
              fullResponse += content;
              currentSentence += content;

              // Send text chunk to client
              res.write(
                `data: ${JSON.stringify({
                  type: 'text_chunk',
                  text: content,
                  fullText: fullResponse,
                })}\n\n`
              );

              // Smart phrase detection for smooth, natural speech
              const sentenceEndings = /[.!?](?:\s+|$)/;
              const strongBoundaries = /[;:]\s+/;
              const weakBoundaries = /,\s+/;

              const minPhraseLength = 15;
              const maxPhraseLength = 80;

              let shouldGenerate = false;
              let phraseEnd = -1;

              // Priority 1: Sentence endings
              const sentenceMatches = [
                ...currentSentence.matchAll(sentenceEndings),
              ];
              if (sentenceMatches.length > 0) {
                const lastMatch = sentenceMatches[sentenceMatches.length - 1];
                phraseEnd = lastMatch.index + lastMatch[0].length;
                shouldGenerate = true;
              }

              // Priority 2: Strong boundaries
              if (!shouldGenerate) {
                const strongMatch = currentSentence.match(strongBoundaries);
                if (strongMatch) {
                  phraseEnd = strongMatch.index + strongMatch[0].length;
                  if (phraseEnd >= minPhraseLength * 0.7) {
                    shouldGenerate = true;
                  }
                }
              }

              // Priority 2.5: Word boundaries after minimum length
              if (
                !shouldGenerate &&
                currentSentence.length >= minPhraseLength
              ) {
                const lastSpace = currentSentence.lastIndexOf(' ');
                if (lastSpace >= minPhraseLength * 0.8) {
                  phraseEnd = lastSpace;
                  shouldGenerate = true;
                }
              }

              // Priority 3: Commas
              if (
                !shouldGenerate &&
                currentSentence.length >= minPhraseLength * 2
              ) {
                const commaMatch = currentSentence.match(weakBoundaries);
                if (commaMatch) {
                  phraseEnd = commaMatch.index + commaMatch[0].length;
                  if (phraseEnd >= minPhraseLength * 1.3) {
                    shouldGenerate = true;
                  }
                }
              }

              // Priority 4: Force generation if too much text
              if (
                !shouldGenerate &&
                currentSentence.length >= maxPhraseLength
              ) {
                const lastSpace = currentSentence.lastIndexOf(
                  ' ',
                  maxPhraseLength
                );
                if (lastSpace >= minPhraseLength) {
                  phraseEnd = lastSpace;
                  shouldGenerate = true;
                } else if (currentSentence.length >= maxPhraseLength * 1.3) {
                  phraseEnd = maxPhraseLength;
                  shouldGenerate = true;
                }
              }

              if (shouldGenerate && phraseEnd > 0) {
                const completePhrase = currentSentence
                  .substring(0, phraseEnd)
                  .replace(/^\s+/, '')
                  .replace(/\s+$/, ' ');
                currentSentence = currentSentence.substring(phraseEnd);

                if (completePhrase) {
                  try {
                    const result = await textToSpeech._infer(
                      [completePhrase],
                      style,
                      steps,
                      speed
                    );
                    const duration = result.duration[0];
                    const wavLen = Math.floor(
                      textToSpeech.sampleRate * duration
                    );
                    const wavChunk = result.wav.slice(0, wavLen);
                    const wavBuffer = audioToWavBuffer(
                      wavChunk,
                      textToSpeech.sampleRate
                    );
                    const audioBase64 = wavBuffer.toString('base64');

                    res.write(
                      `data: ${JSON.stringify({
                        type: 'audio',
                        text: completePhrase,
                        duration: duration,
                        sampleRate: textToSpeech.sampleRate,
                        data: audioBase64,
                      })}\n\n`
                    );
                  } catch (ttsError) {
                    logger.error('TTS error for phrase:', ttsError);
                  }
                }
              }
            }

            // Check if this is the final message
            if (data.done) {
              // Process any remaining text
              if (currentSentence.trim()) {
                try {
                  const result = await textToSpeech._infer(
                    [currentSentence.trim()],
                    style,
                    steps,
                    speed
                  );
                  const duration = result.duration[0];
                  const wavLen = Math.floor(textToSpeech.sampleRate * duration);
                  const wavChunk = result.wav.slice(0, wavLen);
                  const wavBuffer = audioToWavBuffer(
                    wavChunk,
                    textToSpeech.sampleRate
                  );
                  const audioBase64 = wavBuffer.toString('base64');

                  res.write(
                    `data: ${JSON.stringify({
                      type: 'audio',
                      text: currentSentence.trim(),
                      duration: duration,
                      sampleRate: textToSpeech.sampleRate,
                      data: audioBase64,
                    })}\n\n`
                  );
                } catch (ttsError) {
                  logger.error('TTS error for final sentence:', ttsError);
                }
              }

              // Add assistant response to history
              messages.push({ role: 'assistant', content: fullResponse });
              conversations.set(conversationId, messages);

              res.write(
                `data: ${JSON.stringify({
                  type: 'conversation_end',
                  fullResponse: fullResponse,
                })}\n\n`
              );
            }
          } catch (parseError) {
            continue;
          }
        }
      }
    }
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: error.message,
      })}\n\n`
    );
  }

  res.end();
}

/**
 * Stream Ollama to TTS via WebSocket
 */
async function streamOllamaToSpeechWebSocket(
  userMessage,
  conversationId,
  model,
  style,
  steps,
  speed,
  systemPrompt,
  ws
) {
  // Get or create conversation history
  let messages = conversations.get(conversationId) || [];

  // Use provided system prompt or default (ensure it's a string)
  const promptToUse =
    systemPrompt && typeof systemPrompt === 'string'
      ? systemPrompt
      : DEFAULT_SYSTEM_PROMPT;

  // Initialize with system prompt if this is a new conversation
  if (messages.length === 0) {
    messages.push({ role: 'system', content: promptToUse });
    logger.debug('Initialized new conversation with system prompt (WebSocket)');
  }

  messages.push({ role: 'user', content: userMessage });

  ws.send(JSON.stringify({ type: 'conversation_start', conversationId }));

  try {
    // Check if Ollama is available first
    try {
      const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!healthCheck.ok) {
        throw new Error('Ollama is not running or not accessible');
      }
    } catch (healthError) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: `Ollama is not running! Please start Ollama: ollama serve (URL: ${OLLAMA_BASE_URL})`,
        })
      );
      return;
    }

    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(
        `Ollama API error (${ollamaResponse.status}): ${ollamaResponse.statusText}. ${errorText}`
      );
    }

    // node-fetch v3 uses Node.js streams, not ReadableStream with getReader()
    const decoder = new TextDecoder();
    let fullResponse = '';
    let currentSentence = '';
    let buffer = '';

    // Process Ollama stream using Node.js stream API
    for await (const chunk of ollamaResponse.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);

            if (data.message && data.message.content) {
              const content = data.message.content;
              fullResponse += content;
              currentSentence += content;

              ws.send(
                JSON.stringify({
                  type: 'text_chunk',
                  text: content,
                  fullText: fullResponse,
                })
              );

              // Smart phrase detection (same logic as SSE version)
              const sentenceEndings = /[.!?](?:\s+|$)/;
              const strongBoundaries = /[;:]\s+/;
              const weakBoundaries = /,\s+/;

              const minPhraseLength = 15;
              const maxPhraseLength = 80;

              let shouldGenerate = false;
              let phraseEnd = -1;

              // Priority 1: Sentence endings
              const sentenceMatches = [
                ...currentSentence.matchAll(sentenceEndings),
              ];
              if (sentenceMatches.length > 0) {
                const lastMatch = sentenceMatches[sentenceMatches.length - 1];
                phraseEnd = lastMatch.index + lastMatch[0].length;
                shouldGenerate = true;
              }

              // Priority 2: Strong boundaries
              if (!shouldGenerate) {
                const strongMatch = currentSentence.match(strongBoundaries);
                if (strongMatch) {
                  phraseEnd = strongMatch.index + strongMatch[0].length;
                  if (phraseEnd >= minPhraseLength * 0.7) {
                    shouldGenerate = true;
                  }
                }
              }

              // Priority 2.5: Word boundaries
              if (
                !shouldGenerate &&
                currentSentence.length >= minPhraseLength
              ) {
                const lastSpace = currentSentence.lastIndexOf(' ');
                if (lastSpace >= minPhraseLength * 0.8) {
                  phraseEnd = lastSpace;
                  shouldGenerate = true;
                }
              }

              // Priority 3: Commas
              if (
                !shouldGenerate &&
                currentSentence.length >= minPhraseLength * 2
              ) {
                const commaMatch = currentSentence.match(weakBoundaries);
                if (commaMatch) {
                  phraseEnd = commaMatch.index + commaMatch[0].length;
                  if (phraseEnd >= minPhraseLength * 1.3) {
                    shouldGenerate = true;
                  }
                }
              }

              // Priority 4: Force generation
              if (
                !shouldGenerate &&
                currentSentence.length >= maxPhraseLength
              ) {
                const lastSpace = currentSentence.lastIndexOf(
                  ' ',
                  maxPhraseLength
                );
                if (lastSpace >= minPhraseLength) {
                  phraseEnd = lastSpace;
                  shouldGenerate = true;
                } else if (currentSentence.length >= maxPhraseLength * 1.3) {
                  phraseEnd = maxPhraseLength;
                  shouldGenerate = true;
                }
              }

              if (shouldGenerate && phraseEnd > 0) {
                const completePhrase = currentSentence
                  .substring(0, phraseEnd)
                  .replace(/^\s+/, '')
                  .replace(/\s+$/, ' ');
                currentSentence = currentSentence.substring(phraseEnd);

                if (completePhrase) {
                  try {
                    const result = await textToSpeech._infer(
                      [completePhrase],
                      style,
                      steps,
                      speed
                    );
                    const duration = result.duration[0];
                    const wavLen = Math.floor(
                      textToSpeech.sampleRate * duration
                    );
                    const wavChunk = result.wav.slice(0, wavLen);
                    const wavBuffer = audioToWavBuffer(
                      wavChunk,
                      textToSpeech.sampleRate
                    );
                    const audioBase64 = wavBuffer.toString('base64');

                    ws.send(
                      JSON.stringify({
                        type: 'audio',
                        text: completePhrase,
                        duration: duration,
                        sampleRate: textToSpeech.sampleRate,
                        data: audioBase64,
                      })
                    );
                  } catch (ttsError) {
                    logger.error('TTS error:', ttsError);
                  }
                }
              }
            }

            if (data.done) {
              if (currentSentence.trim()) {
                try {
                  const result = await textToSpeech._infer(
                    [currentSentence.trim()],
                    style,
                    steps,
                    speed
                  );
                  const duration = result.duration[0];
                  const wavLen = Math.floor(textToSpeech.sampleRate * duration);
                  const wavChunk = result.wav.slice(0, wavLen);
                  const wavBuffer = audioToWavBuffer(
                    wavChunk,
                    textToSpeech.sampleRate
                  );
                  const audioBase64 = wavBuffer.toString('base64');

                  ws.send(
                    JSON.stringify({
                      type: 'audio',
                      text: currentSentence.trim(),
                      duration: duration,
                      sampleRate: textToSpeech.sampleRate,
                      data: audioBase64,
                    })
                  );
                } catch (ttsError) {
                  logger.error('TTS error:', ttsError);
                }
              }

              messages.push({ role: 'assistant', content: fullResponse });
              conversations.set(conversationId, messages);

              ws.send(
                JSON.stringify({
                  type: 'conversation_end',
                  fullResponse: fullResponse,
                })
              );
            }
          } catch (parseError) {
            continue;
          }
        }
      }
    }
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}

// Health check
app.get('/health', async (req, res) => {
  let ollamaAvailable = false;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    ollamaAvailable = response.ok;
  } catch (error) {
    // Ollama not available
  }

  res.json({
    status: 'ok',
    ttsLoaded: textToSpeech !== null,
    ollamaAvailable: ollamaAvailable,
    ollamaUrl: OLLAMA_BASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Get available Ollama models
app.get('/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const models =
      data.models?.map((model) => ({
        name: model.name,
        size: model.size,
        modified: model.modified_at,
      })) || [];

    logger.info(`Retrieved ${models.length} Ollama models`);
    res.json({ models, defaultModel: DEFAULT_MODEL });
  } catch (error) {
    logger.error('Error fetching Ollama models:', error);
    res.status(503).json({
      error: 'Failed to fetch models from Ollama',
      message: error.message,
      ollamaUrl: OLLAMA_BASE_URL,
    });
  }
});

// Get available voice styles
app.get('/voices', (req, res) => {
  try {
    const files = fs
      .readdirSync(VOICE_STYLES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
    res.json({ voices: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SSE Streaming endpoint
app.post('/stream', async (req, res) => {
  if (!textToSpeech) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }

  const {
    text,
    voice = DEFAULT_VOICE,
    steps = DEFAULT_STEPS,
    speed = DEFAULT_SPEED,
  } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Load voice style
  let style;
  try {
    const voicePath = path.join(
      VOICE_STYLES_DIR,
      voice.endsWith('.json') ? voice : `${voice}.json`
    );
    if (!fs.existsSync(voicePath)) {
      return res.status(400).json({ error: `Voice style not found: ${voice}` });
    }
    style = loadVoiceStyle([voicePath], false);
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to load voice style: ${error.message}` });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Stream audio chunks
  await streamAudioChunks(text, style, steps, speed, res);
});

// Conversational endpoint (Ollama + TTS streaming)
app.post('/conversation', async (req, res) => {
  if (!textToSpeech) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }

  const {
    message,
    conversationId = `conv_${Date.now()}`,
    model = DEFAULT_MODEL,
    voice = DEFAULT_VOICE,
    steps = DEFAULT_STEPS,
    speed = DEFAULT_SPEED,
    systemPrompt,
  } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Load voice style
  let style;
  try {
    const voicePath = path.join(
      VOICE_STYLES_DIR,
      voice.endsWith('.json') ? voice : `${voice}.json`
    );
    if (!fs.existsSync(voicePath)) {
      return res.status(400).json({ error: `Voice style not found: ${voice}` });
    }
    style = loadVoiceStyle([voicePath], false);
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to load voice style: ${error.message}` });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Use custom system prompt if provided, otherwise use default
  const systemPromptToUse = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Stream Ollama response and convert to speech
  await streamOllamaToSpeech(
    message,
    conversationId,
    model,
    style,
    steps,
    speed,
    systemPromptToUse,
    res
  );
});

// Clear conversation history
app.delete('/conversation/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  conversations.delete(conversationId);
  res.json({ success: true, message: 'Conversation cleared' });
});

// Get conversation history
app.get('/conversation/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const messages = conversations.get(conversationId) || [];
  res.json({ conversationId, messages });
});

// WebSocket server for bidirectional streaming
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'synthesize') {
        const {
          text,
          voice = DEFAULT_VOICE,
          steps = DEFAULT_STEPS,
          speed = DEFAULT_SPEED,
        } = data;

        if (!textToSpeech) {
          ws.send(
            JSON.stringify({ type: 'error', message: 'TTS not initialized' })
          );
          return;
        }

        // Load voice style
        let style;
        try {
          const voicePath = path.join(
            VOICE_STYLES_DIR,
            voice.endsWith('.json') ? voice : `${voice}.json`
          );
          if (!fs.existsSync(voicePath)) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: `Voice style not found: ${voice}`,
              })
            );
            return;
          }
          style = loadVoiceStyle([voicePath], false);
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Failed to load voice style: ${error.message}`,
            })
          );
          return;
        }

        // Stream chunks
        const chunks = chunkText(text, 0);
        ws.send(JSON.stringify({ type: 'start', totalChunks: chunks.length }));

        for (let i = 0; i < chunks.length; i++) {
          try {
            const result = await textToSpeech._infer(
              [chunks[i]],
              style,
              steps,
              speed
            );
            const duration = result.duration[0];
            const wavLen = Math.floor(textToSpeech.sampleRate * duration);
            const wavChunk = result.wav.slice(0, wavLen);
            const wavBuffer = audioToWavBuffer(
              wavChunk,
              textToSpeech.sampleRate
            );
            const audioBase64 = wavBuffer.toString('base64');

            ws.send(
              JSON.stringify({
                type: 'chunk',
                chunkIndex: i + 1,
                totalChunks: chunks.length,
                duration: duration,
                sampleRate: textToSpeech.sampleRate,
                data: audioBase64,
              })
            );

            // Add silence between chunks
            if (i < chunks.length - 1) {
              const silenceDuration = 0.3;
              const silenceLen = Math.floor(
                silenceDuration * textToSpeech.sampleRate
              );
              const silence = new Array(silenceLen).fill(0);
              const silenceBuffer = audioToWavBuffer(
                silence,
                textToSpeech.sampleRate
              );
              const silenceBase64 = silenceBuffer.toString('base64');

              ws.send(
                JSON.stringify({
                  type: 'silence',
                  duration: silenceDuration,
                  data: silenceBase64,
                })
              );
            }
          } catch (error) {
            logger.error('WebSocket TTS error:', error);
            ws.send(
              JSON.stringify({
                type: 'error',
                message: error.message,
                chunkIndex: i + 1,
              })
            );
            break;
          }
        }

        ws.send(JSON.stringify({ type: 'end' }));
      } else if (data.type === 'conversation') {
        // Conversational mode: Ollama + TTS
        const {
          message,
          conversationId = `conv_${Date.now()}`,
          model = DEFAULT_MODEL,
          voice = DEFAULT_VOICE,
          steps = DEFAULT_STEPS,
          speed = DEFAULT_SPEED,
          systemPrompt,
        } = data;

        if (!textToSpeech) {
          ws.send(
            JSON.stringify({ type: 'error', message: 'TTS not initialized' })
          );
          return;
        }

        // Load voice style
        let style;
        try {
          const voicePath = path.join(
            VOICE_STYLES_DIR,
            voice.endsWith('.json') ? voice : `${voice}.json`
          );
          if (!fs.existsSync(voicePath)) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: `Voice style not found: ${voice}`,
              })
            );
            return;
          }
          style = loadVoiceStyle([voicePath], false);
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Failed to load voice style: ${error.message}`,
            })
          );
          return;
        }

        // Use custom system prompt if provided, otherwise use default
        const systemPromptToUse =
          systemPrompt && typeof systemPrompt === 'string'
            ? systemPrompt
            : DEFAULT_SYSTEM_PROMPT;

        // Stream Ollama + TTS
        await streamOllamaToSpeechWebSocket(
          message,
          conversationId,
          model,
          style,
          steps,
          speed,
          systemPromptToUse,
          ws
        );
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
});

// ============================================================================
// Error Handling Middleware (must be last)
// ============================================================================
app.use((err, req, res, next) => {
  logger.error('Express error handler:', err);
  logger.debug('Request that caused error:', {
    method: req.method,
    path: req.path,
    body: req.body ? JSON.stringify(req.body).substring(0, 200) : 'none',
  });

  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// ============================================================================
// Start server
// ============================================================================
const PORT = process.env.PORT || 3001;

async function startServer() {
  const initialized = await initializeTTS();
  if (!initialized) {
    logger.error('Failed to initialize TTS. Server will not start.');
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info(`\n🚀 Supertonic Real-Time TTS Server`);
    logger.info(`   Listening on http://localhost:${PORT}`);
    logger.info(`   SSE Endpoint: POST http://localhost:${PORT}/stream`);
    logger.info(`   Conversation: POST http://localhost:${PORT}/conversation`);
    logger.info(`   WebSocket: ws://localhost:${PORT}/ws`);
    logger.info(`   Health: http://localhost:${PORT}/health`);
    logger.info(`   Ollama: ${OLLAMA_BASE_URL} (Model: ${DEFAULT_MODEL})\n`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

