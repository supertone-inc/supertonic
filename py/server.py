import os
import sys

# Fix for missing CUDA DLLs (like cublas64_12.dll) on Windows
if os.name == 'nt':
    nvidia_base_path = os.path.join(sys.prefix, "Lib", "site-packages", "nvidia")
    if os.path.exists(nvidia_base_path):
        for dirpath, dirnames, filenames in os.walk(nvidia_base_path):
            if os.path.basename(dirpath) == "bin":
                try:
                    os.add_dll_directory(dirpath)
                except Exception:
                    pass
                os.environ["PATH"] = dirpath + os.pathsep + os.environ.get("PATH", "")

import io
import json
import uuid
import httpx
import uvicorn
import asyncio
import base64
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse
from pydantic import BaseModel
from typing import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor
from supertonic import TTS
from ru_preprocessor import RussianTTSPreprocessor
from faster_whisper import WhisperModel
from silero_vad import load_silero_vad, VADIterator

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Supertonic TTS & Live LLM Voice Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальная переменная для хранения контекста (базы знаний) вакансии, загружаемой через Web UI
GLOBAL_VACANCY_CONTEXT = ""

# Инициализируем наш препроцессор ударений
preprocessor = RussianTTSPreprocessor()

# Инициализируем TTS-движок Supertonic (в оффлайн-режиме, так как модели уже скачаны)
print("[TTS] Loading Supertonic model...")
tts = TTS(auto_download=False)

# Инициализируем STT-модель Faster-Whisper на GPU для мгновенного распознавания
print("[STT] Loading Faster-Whisper 'small' model on CUDA (float16)...")
stt_model = WhisperModel("small", device="cuda", compute_type="float16")

# Инициализируем Silero VAD для телефонии и WebRTC
print("[VAD] Loading Silero VAD model...")
vad_model = load_silero_vad()

# Пул потоков для выполнения тяжелого CPU-синтеза TTS, чтобы не блокировать Event Loop
executor = ThreadPoolExecutor(max_workers=4)

# Семафоры пулинга для многопоточного параллельного выполнения тяжелых операций ИИ без деградации CPU
tts_semaphore = asyncio.Semaphore(2)
stt_semaphore = asyncio.Semaphore(1) # STT лучше держать 1 потоком на GPU для минимизации VRAM

print("[TTS] Pre-generating backchanneling fillers...")
FILLERS = ["Ага...", "Так...", "Угу.", "Поняла.", "Секундочку..."]
FILLER_AUDIOS = []
try:
    voice_style = tts.get_voice_style(voice_name="F2")
    for filler in FILLERS:
        wav, _ = tts.synthesize(text=filler, lang="ru", voice_style=voice_style, total_steps=6, speed=1.15)
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, wav.squeeze(), tts.sample_rate, format='WAV')
        FILLER_AUDIOS.append({
            "text": filler,
            "audio": base64.b64encode(wav_buffer.getvalue()).decode("utf-8")
        })
    print(f"[TTS] Pre-generated {len(FILLER_AUDIOS)} fillers.")
except Exception as e:
    print(f"[TTS] Failed to pre-generate fillers: {e}")

MASTER_PROMPT = """Ты — Алиса, профессиональный HR-рекрутер, корпоративный психолог и специалист по внутренним коммуникациям.
Твоя задача — ПРОАКТИВНО "продавать" вакансию и проводить первичное собеседование. Веди диалог сама, не жди, пока кандидат будет вытягивать информацию. Если он интересуется условиями — сразу выдай привлекательный блок (график, зарплата, плюшки).
СЦЕНАРИЙ:
1. Поздороваться и узнать, на какую вакансию звонит человек.
2. Узнать его опыт работы (где работал, сколько лет).
3. Если есть опыт, спросить про обязанности. Если STT (распознавание речи) выдает странные слова, догадайся по смыслу и не переспрашивай.
4. Кратко, но "вкусно" рассказать условия работы (опираясь на контекст вакансии, если он есть) и спросить, готов ли он приехать на собеседование.
5. Попрощаться после согласия или отказа.

КРАЙНЕ ВАЖНЫЕ ПРАВИЛА:
1. ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ! Никаких английских слов без необходимости. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ КИТАЙСКИЕ ИЕРОГЛИФЫ И ДРУГИЕ ЯЗЫКИ! Это критическая ошибка.
2. ЕСЛИ КЛИЕНТ ВНЕЗАПНО ПОЗДОРОВАЛСЯ ("Алиса, привет") ИЛИ ПЕРЕБИЛ ВАС В СЕРЕДИНЕ ДИАЛОГА — НЕ НАЧИНАЙТЕ СЦЕНАРИЙ ЗАНОВО! Просто скажите "Да-да, я слушаю" и продолжите обсуждение текущей темы (опыт работы, график и т.д.).
3. Избегай списков, звездочек, сложного форматирования (markdown) — твой текст будет озвучен голосом.
4. Отвечай кратко, 1-3 предложения. Держи инициативу, всегда заканчивай свой ответ вопросом, двигающим диалог вперед.
5. Если твой предыдущий ответ помечен как [ПРЕРВАНО ПОЛЬЗОВАТЕЛЕМ], а пользователь проверяет связь ("Алло", "Вы тут?"), ПОДТВЕРДИ присутствие и ОБЯЗАТЕЛЬНО повтори свой предыдущий вопрос, чтобы вернуть его к прерванной мысли.
6. Для максимальной естественности диалога используй многоточия ("...") и длинные тире ("—") для пауз, как будто ты задумываешься. Используй разговорные вводные слова ("Знаете...", "Смотрите...", "Ага...").
"""

class ContextData(BaseModel):
    context: str

CONTEXT_FILE = "vacancy_context.txt"

# Попытка загрузить контекст из файла при старте
try:
    if os.path.exists(CONTEXT_FILE):
        with open(CONTEXT_FILE, "r", encoding="utf-8") as f:
            GLOBAL_VACANCY_CONTEXT = f.read()
        print(f"[RAG] Loaded context from {CONTEXT_FILE}. Length: {len(GLOBAL_VACANCY_CONTEXT)} chars")
except Exception as e:
    print(f"[RAG] Failed to load context from file: {e}")

@app.get("/api/context")
async def get_context():
    return {"context": GLOBAL_VACANCY_CONTEXT}

@app.post("/api/context")
async def update_context(data: ContextData):
    global GLOBAL_VACANCY_CONTEXT
    GLOBAL_VACANCY_CONTEXT = data.context
    try:
        with open(CONTEXT_FILE, "w", encoding="utf-8") as f:
            f.write(GLOBAL_VACANCY_CONTEXT)
        print(f"[RAG] Saved context to {CONTEXT_FILE}")
    except Exception as e:
        print(f"[RAG] Failed to save context to file: {e}")
    print(f"[RAG] Global context updated. Length: {len(GLOBAL_VACANCY_CONTEXT)} chars")
    return {"status": "ok"}


# Слайды голосов
VOICES = ["M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5"]

class ChatRequest(BaseModel):
    text: str
    voice: str = "F2"
    speed: float = 1.15
    steps: int = 6
    backend: str = "lm-studio" # vllm, lm-studio, ollama, gemini, mock
    api_url: str = None

# Вспомогательная функция для извлечения полных предложений из потока
def extract_sentences(buffer: str, is_final: bool = False, is_first: bool = False):
    sentences = []
    punctuation_marks = {'.', '!', '?', '\n'}
    i = 0
    last_cut = 0
    while i < len(buffer):
        char = buffer[i]
        if char in punctuation_marks:
            while i + 1 < len(buffer) and buffer[i + 1] in punctuation_marks:
                i += 1
            preceding_part = buffer[last_cut:i+1].strip()
            is_abbrev = False
            for abbrev in ["т.д.", "т.п.", "др.", "руб.", "тыс.", "млн."]:
                if preceding_part.lower().endswith(abbrev):
                    is_abbrev = True
                    break
            
            if not is_abbrev:
                sentence = buffer[last_cut:i+1].strip()
                if sentence:
                    sentences.append(sentence)
                last_cut = i + 1
        elif char in {',', ';'} and (i - last_cut) >= (15 if is_first else 20):
            # Сплитим на запятых/точках с запятой сверхагрессивно для мгновенного TTFA
            if i + 1 < len(buffer) and buffer[i + 1] == ' ':
                sentence = buffer[last_cut:i+1].strip()
                if sentence:
                    sentences.append(sentence)
                last_cut = i + 1
        elif char == ' ' and (i - last_cut) >= (40 if is_first else 60):
            # Если предложение без запятых слишком длинное, принудительно рубим по пробелу
            # для сверхнизкого TTFA первую фразу рубим уже на 40 символах
            sentence = buffer[last_cut:i].strip()
            if sentence:
                sentences.append(sentence)
            last_cut = i + 1
        i += 1
        
    if is_final:
        sentence = buffer[last_cut:].strip()
        if sentence:
            sentences.append(sentence)
        remaining = ""
    else:
        remaining = buffer[last_cut:]
        
    return sentences, remaining

# Стриминг из OpenAI-совместимых бэкендов (vLLM, LM Studio)
async def stream_from_openai(url: str, messages: list, model: str = "local-model") -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(trust_env=False) as client:
        try:
            async with client.stream(
                "POST",
                f"{url}/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "presence_penalty": 0.5,
                    "frequency_penalty": 1.0,
                    "repetition_penalty": 1.15,
                    "max_tokens": 100,
                    "stream": True
                },
                timeout=15.0
            ) as response:
                if response.status_code != 200:
                    print(f"[LLM Stream] Server returned status {response.status_code}")
                    return
                
                # Fallback buffer for non-streaming responses
                full_json_buffer = ""
                
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            choice = data.get("choices", [{}])[0]
                            delta = choice.get("delta", choice.get("message", {}))
                            if "content" in delta and delta["content"]:
                                yield delta["content"]
                        except Exception as e:
                            print(f"[LLM Stream] JSON Parse/Key Error: {e} | Raw data: {data_str}")
                    else:
                        print(f"[LLM Stream] Non-data line received: {line}")
        except Exception as e:
            print(f"[LLM Stream] Connection error: {e}")

# Фоновая задача для сжатия контекста диалога (Level 3 Memory)
async def update_context_summary(history: list, session_state: dict, url: str):
    try:
        print("[Memory] Starting background context summarization...")
        # Собираем текстовое представление истории
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-8:]])
        
        prompt = (
            "Сделай краткую выжимку фактов из этого диалога в 2-3 предложениях. "
            "Опиши, о чем рассказывает кандидат и какие вопросы задавал рекрутер. "
            "Пиши от третьего лица."
        )
        if session_state.get("summary"):
            prompt += f" Прошлая выжимка: {session_state['summary']}."
            
        messages = [
            {"role": "system", "content": "Ты - аналитик, который делает сухие выжимки фактов из диалогов."},
            {"role": "user", "content": f"{prompt}\n\nДиалог:\n{history_text}"}
        ]
        
        async with httpx.AsyncClient(trust_env=False) as client:
            response = await client.post(
                f"{url}/chat/completions",
                json={
                    "model": "local-model",
                    "messages": messages,
                    "temperature": 0.1,
                    "max_tokens": 100
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                new_summary = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if new_summary:
                    session_state["summary"] = new_summary
                    print(f"[Memory] Context updated: {new_summary}")
    except Exception as e:
        print(f"[Memory Error] Failed to update context summary: {e}")

# Вспомогательная функция для получения быстрой и доступной модели в Ollama
async def get_active_ollama_model(client: httpx.AsyncClient, url: str) -> str:
    try:
        response = await client.get(f"{url}/api/tags", timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            if models:
                # Ищем легкие модели в приоритете
                for m in models:
                    m_lower = m.lower()
                    if any(fast in m_lower for fast in ["0.5b", "1.5b", "qwen", "phi", "mini"]):
                        print(f"[Ollama] Autodetected super-fast model: {m}")
                        return m
                # Иначе берем первую доступную
                print(f"[Ollama] Selected first available model: {models[0]}")
                return models[0]
    except Exception as e:
        print(f"[Ollama] Failed to fetch active models: {e}")
    return "llama3"

# Стриминг из Ollama с оптимизацией скорости и поддержкой полной истории сообщений
async def stream_from_ollama(url: str, messages: list) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(trust_env=False) as client:
        model_name = await get_active_ollama_model(client, url)
        try:
            async with client.stream(
                "POST",
                f"{url}/api/chat",
                json={
                    "model": model_name,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "num_predict": 45,       # Жесткий лимит токенов для сверхбыстрого Real-Time
                        "num_ctx": 2048,         # Оптимальный контекст для истории диалога
                        "temperature": 0.5,      # Сниженная температура для стабильности и скорости
                        "top_k": 10,
                        "top_p": 0.5,
                        "num_thread": 4,         # Принудительное использование 4 ядер CPU для скорости
                        "mirostat": 0            # Отключение сложного сэмплирования для ускорения
                    }
                },
                timeout=15.0
            ) as response:
                if response.status_code != 200:
                    print(f"[Ollama Stream] Server returned status {response.status_code}")
                    return
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                        if data.get("done", False):
                            break
                    except Exception:
                        pass
        except Exception as e:
            print(f"[Ollama Stream] Connection error: {e}")

# Стриминг из Gemini с полной поддержкой истории диалога
async def stream_from_gemini(messages: list) -> AsyncGenerator[str, None]:
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        print("[Gemini Stream] API Key not found")
        return
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        
        # Собираем промпт из истории сообщений
        prompt = ""
        for msg in messages:
            if msg["role"] == "system":
                continue
            role = "Пользователь" if msg["role"] == "user" else "Ассистент"
            prompt += f"{role}: {msg['content']}\n"
        prompt += "Ассистент:"
        
        system_instruction = next((m["content"] for m in messages if m["role"] == "system"), None)
        if system_instruction:
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_instruction)
        else:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
        response = await model.generate_content_async(prompt, stream=True)
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"[Gemini Stream] Error: {e}")

# Стриминг из заглушки
async def stream_mock(text: str) -> AsyncGenerator[str, None]:
    witty_responses = {
        "привет": "Привет! Рада слышать тебя. О чем сегодня поговорим?",
        "как дела": "У меня всё отлично, летаю на антигравитации! А как твои успехи?",
        "кто ты": "Я твой голосовой собеседник, озвученный моделью Supertonic.",
        "велосипед": "О, велосипед — это круто! Помню, мы недавно обсуждали, как держать тридцать километров в час.",
    }
    user_lower = text.lower()
    ai_text = "Я услышала тебя! Давай пообщаемся о чем-нибудь интересном сегодня."
    for key, val in witty_responses.items():
        if key in user_lower:
            ai_text = val
            break
    words = ai_text.split(" ")
    for word in words:
        yield word + " "
        await asyncio.sleep(0.08)

# WebSocket-эндпоинт для настоящей телефонии (SIP / WebRTC) со встроенным Silero VAD и Barge-in
@app.websocket("/ws/phone")
async def websocket_phone(websocket: WebSocket):
    await websocket.accept()
    print("[Phone WS] Caller connected")
    
    # Дефолтные настройки для телефонии (потоковость и скорость критически важны)
    voice = "F2"
    speed = 1.15
    steps = 6  # 6 шагов Supertonic дают идеальное качество и снижают время синтеза на 25%
    backend = "vllm" # vllm (SGLang), lm-studio, ollama, gemini, mock
    api_url = None
    
    # Инициализируем VADIterator для частоты 16кГц (размер кадра 512 отсчетов)
    vad_iterator = VADIterator(
        vad_model,
        threshold=0.5,
        sampling_rate=16000,
        min_silence_duration_ms=250, # 250 мс тишины - признак конца реплики (выигрыш 350 мс!)
        speech_pad_ms=30
    )
    
    # Буферы для звука
    byte_buffer = b""
    speech_chunks = []
    
    # Флаги состояний
    is_speaking = False
    speech_task = None
    pending_interruption = False
    speech_frame_count = 0
    
    # История диалога в рамках сессии
    chat_history = []
    session_state = {"summary": "", "messages_since_summary": 0}
    session_state = {"summary": "", "messages_since_summary": 0}
    
    # Системный промпт для телефона (сверхкратко и динамично для мгновенного первого токена)
    system_prompt = MASTER_PROMPT + "\n\nОТВЕЧАЙ КРАЙНЕ КРАТКО (строго одна-две фразы, не более 15 слов), чтобы речь звучала динамично, как по телефону."
    
    # Асинхронная функция генерации и отправки ответа
    async def run_voice_pipeline(user_text: str):
        nonlocal speech_task
        try:
            print(f"[Phone LLM] User text: {user_text}")
            # Добавляем приписку к сообщению пользователя, чтобы модель не забывала язык
            chat_history.append({"role": "user", "content": user_text + " (Отвечай строго на русском, коротко, без китайских иероглифов!)"})
            
            # Ограничиваем контекст последними 6 сообщениями (чтобы не перегружать окно)
            recent_history = chat_history[-6:]
            
            # Внедряем глобальную память
            dynamic_prompt = system_prompt
            if GLOBAL_VACANCY_CONTEXT.strip():
                dynamic_prompt += f"\n\n[БАЗА ЗНАНИЙ (ВАКАНСИЯ): {GLOBAL_VACANCY_CONTEXT}]"
            if session_state.get("summary"):
                dynamic_prompt += f"\n\n[КОНТЕКСТ ДИАЛОГА (ПАМЯТЬ): {session_state['summary']}]"
                
            messages = [{"role": "system", "content": dynamic_prompt}] + recent_history
            
            # Определяем источник стриминга
            import random
            
            # Zero-Latency Backchanneling
            if FILLER_AUDIOS and random.random() < 0.4:
                filler_item = random.choice(FILLER_AUDIOS)
                await websocket.send_json({
                    "type": "audio",
                    "text": filler_item["text"],
                    "audio": filler_item["audio"]
                })
                
            stream_gen = None
            effective_api_url = api_url
            if effective_api_url:
                effective_api_url = effective_api_url.strip().replace("localhost", "127.0.0.1")

            if backend == "vllm":
                url = effective_api_url if effective_api_url else "http://127.0.0.1:8000/v1"
                print(f"[Phone LLM] Connecting to VLLM backend at: {url}")
                stream_gen = stream_from_openai(url, messages, model="Qwen/Qwen2.5-14B-Instruct-AWQ")
            elif backend == "lm-studio":
                url = effective_api_url if effective_api_url else "http://127.0.0.1:1234/v1"
                print(f"[Phone LLM] Connecting to LM-Studio backend at: {url}")
                stream_gen = stream_from_openai(url, messages, model="local-model")
            elif backend == "ollama":
                url = effective_api_url if effective_api_url else "http://127.0.0.1:11434"
                stream_gen = stream_from_ollama(url, messages)
            elif backend == "gemini":
                stream_gen = stream_from_gemini(messages)
            else:
                stream_gen = stream_mock(user_text)
                
            buffer = ""
            full_ai_response = ""
            voice_style = tts.get_voice_style(voice_name=voice)
            loop = asyncio.get_running_loop()
            is_first_sentence = True
            
            async for token in stream_gen:
                buffer += token
                full_ai_response += token
                # Отправляем текстовый токен для логов/дебага
                await websocket.send_json({"type": "token", "text": token})
                
                # Пробуем выделить предложения
                sentences, buffer = extract_sentences(buffer, is_final=False, is_first=is_first_sentence)
                for sentence in sentences:
                    sentence_clean = sentence.strip()
                    if not sentence_clean:
                        continue
                        
                    is_first_sentence = False
                    processed_text = preprocessor.apply_rules(sentence_clean)
                    print(f"[Phone TTS] Synthesizing: {processed_text}")
                    
                    # Эмоциональный пейсинг
                    current_speed = speed
                    if sentence_clean.endswith('?'):
                        current_speed = max(0.8, speed - 0.10)
                    elif len(sentence_clean.split()) <= 3:
                        current_speed = min(1.5, speed + 0.05)

                    # Синтез в пуле потоков с семафором
                    async with tts_semaphore:
                        wav, _ = await loop.run_in_executor(
                            executor,
                            lambda: tts.synthesize(
                                text=processed_text,
                                lang="ru",
                                voice_style=voice_style,
                                total_steps=steps,
                                speed=current_speed
                            )
                        )
                    
                    # Конвертируем numpy WAV в байты в памяти (без дискового IO)
                    wav_buffer = io.BytesIO()
                    sf.write(wav_buffer, wav.squeeze(), tts.sample_rate, format='WAV')
                    wav_bytes = wav_buffer.getvalue()
                            
                    audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
                    await websocket.send_json({
                        "type": "audio",
                        "text": sentence_clean,
                        "audio": audio_b64
                    })
                    
            if buffer.strip():
                sentences, _ = extract_sentences(buffer, is_final=True)
                for sentence in sentences:
                    sentence_clean = sentence.strip()
                    if not sentence_clean:
                        continue
                    processed_text = preprocessor.apply_rules(sentence_clean)
                    print(f"[Phone TTS Final] Synthesizing: {processed_text}")
                    
                    current_speed = speed
                    if sentence_clean.endswith('?'):
                        current_speed = max(0.8, speed - 0.10)
                    elif len(sentence_clean.split()) <= 3:
                        current_speed = min(1.5, speed + 0.05)

                    async with tts_semaphore:
                        wav, _ = await loop.run_in_executor(
                            executor,
                            lambda: tts.synthesize(
                                text=processed_text,
                                lang="ru",
                                voice_style=voice_style,
                                total_steps=steps,
                                speed=current_speed
                            )
                        )
                    
                    # Конвертируем numpy WAV в байты в памяти (без дискового IO)
                    wav_buffer = io.BytesIO()
                    sf.write(wav_buffer, wav.squeeze(), tts.sample_rate, format='WAV')
                    wav_bytes = wav_buffer.getvalue()
                            
                    audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
                    await websocket.send_json({
                        "type": "audio",
                        "text": sentence_clean,
                        "audio": audio_b64
                    })
                    
            if full_ai_response.strip():
                chat_history.append({"role": "assistant", "content": full_ai_response.strip()})
                session_state["messages_since_summary"] += 2
                
                if session_state["messages_since_summary"] >= 6:
                    url = effective_api_url if effective_api_url else "http://127.0.0.1:8000/v1"
                    asyncio.create_task(update_context_summary(chat_history.copy(), session_state, url))
                    session_state["messages_since_summary"] = 0
                    
            await websocket.send_json({"type": "done"})
        except asyncio.CancelledError:
            print("[Phone Task] Pipeline was cancelled due to user interruption (Barge-in)!")
            if full_ai_response.strip():
                # Уровень 2: Сохранение контекста при прерывании
                chat_history.append({"role": "assistant", "content": full_ai_response.strip() + " [ПРЕРВАНО ПОЛЬЗОВАТЕЛЕМ]"})
                session_state["messages_since_summary"] += 2
        except Exception as err:
            print(f"[Phone Task Error] {err}")
            
    try:
        while True:
            # WebSocket может прислать как текстовое (JSON с настройками), так и бинарное сообщение (аудио-пакет)
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                print("[Phone WS] Client disconnected cleanly")
                break
            
            # 1. Текстовое сообщение (Настройки бэкенда/голоса от АТС или клиента)
            if "text" in message:
                data_json = message["text"]
                req_data = json.loads(data_json)
                voice = req_data.get("voice", voice)
                speed = float(req_data.get("speed", speed))
                backend = req_data.get("backend", backend)
                api_url = req_data.get("api_url", api_url)
                print(f"[Phone WS] Applied config: voice={voice}, backend={backend}, speed={speed}")
                
            # 2. Бинарное сообщение (Аудио-пакет от SIP-телефонии или WebRTC-клиента)
            elif "bytes" in message:
                audio_bytes = message["bytes"]
                if not audio_bytes:
                    continue
                
                # Добавляем в буфер
                byte_buffer += audio_bytes
                
                # Размер кадра для VAD на 16кГц: 512 отсчетов * 2 байта (для int16) = 1024 байта
                FRAME_SIZE_BYTES = 1024
                
                while len(byte_buffer) >= FRAME_SIZE_BYTES:
                    frame = byte_buffer[:FRAME_SIZE_BYTES]
                    byte_buffer = byte_buffer[FRAME_SIZE_BYTES:]
                    
                    # Декодируем 16-битный PCM в float32 numpy-массив
                    audio_chunk_int16 = np.frombuffer(frame, dtype=np.int16)
                    audio_chunk_float32 = audio_chunk_int16.astype(np.float32) / 32768.0
                    
                    # Проверяем активность речи
                    speech_dict = vad_iterator(audio_chunk_float32, return_seconds=False)
                    
                    if speech_dict:
                        # А. Обнаружено начало речи! (Пользователь начал говорить)
                        if "start" in speech_dict:
                            print("[Phone VAD] Speech started! User is speaking...")
                            is_speaking = True
                            speech_chunks = []
                            
                            # Настраиваем интеллектуальное прерывание (Smart Barge-in)
                            if speech_task and not speech_task.done():
                                pending_interruption = True
                                speech_frame_count = 0
                        
                        # Б. Обнаружен конец речи! (Пользователь закончил фразу)
                        elif "end" in speech_dict:
                            print("[Phone VAD] Speech ended. Analyzing...")
                            is_speaking = False
                            pending_interruption = False
                            speech_frame_count = 0
                            
                            # Если у нас есть записанные фрагменты голоса
                            if speech_chunks:
                                # Объединяем все чанки в один непрерывный аудио-массив
                                full_audio = np.concatenate(speech_chunks, axis=0)
                                print(f"[Phone VAD] Audio length for STT: {len(full_audio)/16000:.2f} seconds")
                                
                                # Отправляем сигнал "Распознаю"
                                await websocket.send_json({"type": "status", "status": "processing"})
                                
                                # Распознаем речь с семафором пулинга
                                async with stt_semaphore:
                                    def _do_stt():
                                        segs, _ = stt_model.transcribe(full_audio, language="ru", beam_size=1, initial_prompt="Алиса, привет.", condition_on_previous_text=False)
                                        return "".join(segment.text for segment in segs).strip()
                                    
                                    loop = asyncio.get_running_loop()
                                    text = await loop.run_in_executor(executor, _do_stt)
                                
                                if text:
                                    text_lower = text.lower().strip().replace('.', '').replace(',', '').replace('?', '').replace('!', '')
                                    
                                    # Фильтрация галлюцинаций Whisper в тишине
                                    hallucinations = ["добро пожаловать", "подписывайтесь", "на канал", "спасибо за просмотр", "продолжение следует", "уважаемые зрители", "субтитры"]
                                    if any(h in text_lower for h in hallucinations):
                                        print(f"[Phone VAD] Ignored hallucinated STT phrase: {text}")
                                        await websocket.send_json({"type": "status", "status": "ready"})
                                        speech_chunks = []
                                        continue
                                        
                                    # Фильтрация коротких "угу" (Active Listening)
                                    is_uh_huh = text_lower in ["ага", "угу", "да", "ну", "так", "понятно", "угум", "хорошо"] and (len(full_audio)/16000) < 1.5
                                    
                                    if is_uh_huh and speech_task and not speech_task.done():
                                        print(f"[Phone VAD] Ignored active listening (uh-huh) while bot is speaking: {text}")
                                        await websocket.send_json({"type": "status", "status": "ready"})
                                    else:
                                        print(f"[Phone User] {text}")
                                        await websocket.send_json({"type": "recognized", "text": text})
                                        
                                        # Если мы все-таки решили отвечать на новый текст, отменяем старый таск (на всякий случай)
                                        if speech_task and not speech_task.done():
                                            print("[Phone VAD] Cancelling previous speech task...")
                                            speech_task.cancel()
                                            try:
                                                await speech_task # Ждем реального завершения таска, чтобы избежать гонки токенов
                                            except asyncio.CancelledError:
                                                pass
                                            # Отправляем сигнал клиенту (UI/PBX) остановить воспроизведение старого аудио
                                            await websocket.send_json({"type": "interrupt"})
                                            
                                        # Запускаем генерацию и озвучку в фоне
                                        speech_task = asyncio.create_task(run_voice_pipeline(text))
                                else:
                                    print("[Phone STT] Speech was empty or not recognized.")
                                    await websocket.send_json({"type": "status", "status": "ready"})
                                    
                            speech_chunks = []
                            
                    # Если пользователь сейчас говорит, накапливаем аудиоданные
                    if is_speaking:
                        speech_chunks.append(audio_chunk_float32.copy())
                        if pending_interruption:
                            speech_frame_count += 1
                            # Если непрерывная речь длится более 20 кадров (~640 мс), подтверждаем прерывание (защита от ложных срабатываний и вздохов)
                            if speech_frame_count >= 20:
                                if speech_task and not speech_task.done():
                                    speech_task.cancel()
                                    print("[Phone VAD] Confirmed Smart Barge-in! Interrupted after 640ms of user speech.")
                                    await websocket.send_json({"type": "interruption"})
                                pending_interruption = False
                                
    except WebSocketDisconnect:
        print("[Phone WS] Caller disconnected")
        if speech_task and not speech_task.done():
            speech_task.cancel()
    except Exception as e:
        print(f"[Phone WS Error] {e}")
        if speech_task and not speech_task.done():
            speech_task.cancel()
    finally:
        vad_iterator.reset_states()
        print("[Phone WS] Cleaned up VAD states and resources cleanly")

# WebSocket endpoint для real-time низкозадержечного общения
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Client connected")
    
    # In-memory история диалога для текущей сессии
    chat_history = []
    session_state = {"summary": "", "messages_since_summary": 0}
    chat_task = None
    
    async def run_chat_pipeline(req_data: dict):
        user_text = req_data.get("text", "").strip()
        voice = req_data.get("voice", "F2")
        speed = float(req_data.get("speed", 1.15))
        steps = int(req_data.get("steps", 6))
        backend = req_data.get("backend", "vllm")
        api_url = req_data.get("api_url", None)
        
        print(f"[WS] Received user input: {user_text}")
        # Добавляем приписку к сообщению пользователя, чтобы модель не забывала язык
        chat_history.append({"role": "user", "content": user_text + " (Отвечай строго на русском, коротко, без китайских иероглифов!)"})
        
        system_prompt = MASTER_PROMPT + "\n\nОТВЕЧАЙ КРАТКО (до 3 предложений), чтобы поддерживать динамичный текстовый диалог."
        if GLOBAL_VACANCY_CONTEXT.strip():
            system_prompt += f"\n\n[БАЗА ЗНАНИЙ (ВАКАНСИЯ): {GLOBAL_VACANCY_CONTEXT}]"
        if session_state.get("summary"):
            system_prompt += f"\n\n[КОНТЕКСТ ДИАЛОГА (ПАМЯТЬ): {session_state['summary']}]"
        
        recent_history = chat_history[-8:]
        messages = [{"role": "system", "content": system_prompt}] + recent_history
        
        stream_gen = None
        if backend == "vllm":
            url = api_url.strip() if api_url else "http://localhost:8000/v1"
            stream_gen = stream_from_openai(url, messages, model="local-model")
        elif backend == "lm-studio":
            url = api_url.strip() if api_url else "http://localhost:1234/v1"
            stream_gen = stream_from_openai(url, messages, model="local-model")
        elif backend == "ollama":
            url = api_url.strip() if api_url else "http://localhost:11434"
            stream_gen = stream_from_ollama(url, messages)
        elif backend == "gemini":
            stream_gen = stream_from_gemini(messages)
        else:
            stream_gen = stream_mock(user_text)
            
        buffer = ""
        full_ai_response = ""
        voice_style = tts.get_voice_style(voice_name=voice if voice in VOICES else "F2")
        loop = asyncio.get_running_loop()
        is_first_sentence = True
        
        try:
            async for token in stream_gen:
                buffer += token
                full_ai_response += token
                await websocket.send_json({"type": "token", "text": token})
                
                sentences, buffer = extract_sentences(buffer, is_final=False, is_first=is_first_sentence)
                for sentence in sentences:
                    sentence_clean = sentence.strip()
                    if not sentence_clean:
                        continue
                        
                    is_first_sentence = False
                    processed_text = preprocessor.apply_rules(sentence_clean).strip()
                    
                    if not processed_text or not any(c.isalpha() for c in processed_text):
                        print(f"[WS Sentence] Skipped empty/non-text chunk: '{sentence_clean}'")
                        continue
                        
                    print(f"[WS Sentence] Synthesizing: {processed_text}")
                    current_speed = speed
                    if sentence_clean.endswith('?'):
                        current_speed = max(0.8, speed - 0.10)
                    elif len(sentence_clean.split()) <= 3:
                        current_speed = min(1.5, speed + 0.05)

                    try:
                        async with tts_semaphore:
                            wav, _ = await loop.run_in_executor(
                                executor,
                                lambda: tts.synthesize(
                                    text=processed_text,
                                    lang="ru",
                                    voice_style=voice_style,
                                    total_steps=steps,
                                    speed=current_speed
                                )
                            )
                        
                        # Конвертируем numpy WAV в байты в памяти (без дискового IO)
                        wav_buffer = io.BytesIO()
                        sf.write(wav_buffer, wav.squeeze(), tts.sample_rate, format='WAV')
                        wav_bytes = wav_buffer.getvalue()
                                
                        audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
                        await websocket.send_json({
                            "type": "audio",
                            "text": sentence_clean,
                            "audio": audio_b64
                        })
                    except Exception as tts_err:
                        print(f"[WS TTS Error] {tts_err}")
                        
            if buffer.strip():
                sentences, _ = extract_sentences(buffer, is_final=True)
                for sentence in sentences:
                    sentence_clean = sentence.strip()
                    if not sentence_clean:
                        continue
                    processed_text = preprocessor.apply_rules(sentence_clean).strip()
                    
                    if not processed_text or not any(c.isalpha() for c in processed_text):
                        print(f"[WS Final Sentence] Skipped empty/non-text chunk: '{sentence_clean}'")
                        continue
                        
                    print(f"[WS Final Sentence] Synthesizing: {processed_text}")
                    current_speed = speed
                    if sentence_clean.endswith('?'):
                        current_speed = max(0.8, speed - 0.10)
                    elif len(sentence_clean.split()) <= 3:
                        current_speed = min(1.5, speed + 0.05)

                    try:
                        async with tts_semaphore:
                            wav, _ = await loop.run_in_executor(
                                executor,
                                lambda: tts.synthesize(
                                    text=processed_text,
                                    lang="ru",
                                    voice_style=voice_style,
                                    total_steps=steps,
                                    speed=current_speed
                                )
                            )
                        
                        # Конвертируем numpy WAV в байты в памяти (без дискового IO)
                        wav_buffer = io.BytesIO()
                        sf.write(wav_buffer, wav.squeeze(), tts.sample_rate, format='WAV')
                        wav_bytes = wav_buffer.getvalue()
                                
                        audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
                        await websocket.send_json({
                            "type": "audio",
                            "text": sentence_clean,
                            "audio": audio_b64
                        })
                    except Exception as tts_err:
                        print(f"[WS TTS Error] {tts_err}")
                        
            if full_ai_response.strip():
                chat_history.append({"role": "assistant", "content": full_ai_response.strip()})
                session_state["messages_since_summary"] += 2
                
                if session_state["messages_since_summary"] >= 6:
                    url = api_url.strip() if api_url else "http://127.0.0.1:8000/v1"
                    asyncio.create_task(update_context_summary(chat_history.copy(), session_state, url))
                    session_state["messages_since_summary"] = 0
                
            await websocket.send_json({"type": "done"})
            
        except asyncio.CancelledError:
            print("[WS Chat] Pipeline cancelled due to user interruption (Barge-in)!")
            if full_ai_response.strip():
                chat_history.append({"role": "assistant", "content": full_ai_response.strip() + " [ПРЕРВАНО ПОЛЬЗОВАТЕЛЕМ]"})
                session_state["messages_since_summary"] += 2
        except Exception as e:
            print(f"[WS Chat Error] {e}")

    try:
        while True:
            data_json = await websocket.receive_text()
            req_data = json.loads(data_json)
            
            # Если пользователь прислал новое сообщение, прерываем текущую генерацию
            if chat_task and not chat_task.done():
                chat_task.cancel()
                
            user_text = req_data.get("text", "").strip()
            if not user_text:
                continue
                
            chat_task = asyncio.create_task(run_chat_pipeline(req_data))
            
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
        if chat_task and not chat_task.done():
            chat_task.cancel()
    except Exception as e:
        print(f"[WS Error] {e}")
        if chat_task and not chat_task.done():
            chat_task.cancel()

# Оставляем существующий REST API /api/chat для совместимости
@app.post("/api/chat")
async def chat_and_synthesize(req: ChatRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    ai_text = ""
    system_prompt = MASTER_PROMPT + "\n\nОТВЕЧАЙ КРАТКО (одна-две фразы)."
    
    if req.backend == "vllm":
        url = req.api_url.strip() if req.api_url else "http://localhost:8000/v1"
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{url}/chat/completions",
                    json={
                        "model": "local-model",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": req.text}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 150
                    },
                    timeout=10.0
                )
                if res.status_code == 200:
                    ai_text = res.json()["choices"][0]["message"]["content"].strip()
                else:
                    print(f"[vLLM] returned status {res.status_code}")
        except Exception as e:
            print(f"[vLLM] Connection error")

    if not ai_text and req.backend == "lm-studio":
        url = req.api_url.strip() if req.api_url else "http://localhost:1234/v1"
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{url}/chat/completions",
                    json={
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": req.text}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 150
                    },
                    timeout=10.0
                )
                if res.status_code == 200:
                    ai_text = res.json()["choices"][0]["message"]["content"].strip()
                else:
                    print(f"[LM Studio] returned status {res.status_code}")
        except Exception as e:
            print(f"[LM Studio] Connection error")
            
    # Резервный бэкенд: Ollama
    if not ai_text and (req.backend == "ollama" or req.backend == "lm-studio"):
        url = req.api_url.strip() if req.api_url else "http://localhost:11434"
        try:
            async with httpx.AsyncClient() as client:
                model_name = await get_active_ollama_model(client, url)
                res = await client.post(
                    f"{url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": f"{system_prompt}\n\nПользователь: {req.text}\nАссистент:",
                        "stream": False,
                        "options": {
                            "num_predict": 45,
                            "num_ctx": 1024,
                            "temperature": 0.7,
                            "top_k": 20,
                            "top_p": 0.9
                        }
                    },
                    timeout=10.0
                )
                if res.status_code == 200:
                    ai_text = res.json().get("response", "").strip()
        except Exception as e:
            print(f"[Ollama] Connection error: {e}")

    # Резервный бэкенд: Gemini API
    if not ai_text and req.backend == "gemini":
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(f"{system_prompt}\n\nПользователь: {req.text}")
                ai_text = response.text
            except Exception as e:
                print(f"[Gemini] API error")

    # Полный фоллбэк (если нет сети или запущенных локальных ИИ)
    if not ai_text:
        witty_responses = {
            "привет": "Привет! Рада слышать тебя. О чем сегодня поговорим?",
            "как дела": "У меня всё отлично, летаю на антигравитации! А как твои успехи?",
            "кто ты": "Я твой голосовой собеседник, озвученный моделью Supertonic.",
            "велосипед": "О, велосипед — это круто! Помню, мы недавно обсуждали, как держать тридцать километров в час.",
        }
        user_lower = req.text.lower()
        for key, val in witty_responses.items():
            if key in user_lower:
                ai_text = val
                break
        if not ai_text:
            ai_text = "Я услышала тебя, но сейчас у меня нет связи с локальным ИИ в LM Studio или Ollama. Проверь, запущены ли они!"

    print(f"[AI] Response (safe log): {ai_text.encode('ascii', errors='backslashreplace').decode('ascii')}")
    
    # 2. Нормализация текста препроцессором (правильные ударения)
    processed_text = preprocessor.apply_rules(ai_text)
    print(f"[Normalized] Text (safe log): {processed_text.encode('ascii', errors='backslashreplace').decode('ascii')}")
    
    # 3. Синтез через Supertonic TTS
    try:
        voice_style = tts.get_voice_style(voice_name=req.voice if req.voice in VOICES else "F2")
        async with tts_semaphore:
            wav, _ = await asyncio.get_running_loop().run_in_executor(
                executor,
                lambda: tts.synthesize(
                    text=processed_text,
                    lang="ru",
                    voice_style=voice_style,
                    total_steps=req.steps,
                    speed=req.speed
                )
            )
        
        # Сохраняем во временный WAV файл
        temp_file = "temp_response.wav"
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass
                
        tts.save_audio(wav, temp_file)
        
        return FileResponse(
            temp_file,
            media_type="audio/wav",
            headers={
                "X-Response-Text": ai_text.encode("utf-8").decode("latin1") # Обходим ограничение HTTP-заголовков на не-ascii
            }
        )
        
    except Exception as e:
        print(f"[TTS] Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed")

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Читаем содержимое файла
        audio_bytes = await file.read()
        
        # Сохраняем во временный файл
        temp_filename = "temp_recording.webm"
        with open(temp_filename, "wb") as f:
            f.write(audio_bytes)
            
        # Транскрибируем с помощью faster-whisper с семафором пулинга
        # Beam size = 5 дает отличное качество, language="ru" форсирует русский язык
        async with stt_semaphore:
            segments, info = stt_model.transcribe(
                temp_filename, 
                language="ru", 
                beam_size=5, 
                initial_prompt="Алиса. Привет, Алиса! Это голосовой ассистент Алиса. Скажи, пожалуйста."
            )
            text = "".join(segment.text for segment in segments).strip()
        
        # Удаляем временный файл
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except Exception:
                pass
            
        print(f"[STT] Transcribed text: {text}")
        return {"text": text}
    except Exception as e:
        print(f"[STT] Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Монтируем внешние статические ресурсы (модели и голоса)
assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Монтируем статические файлы для фронтенда
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
