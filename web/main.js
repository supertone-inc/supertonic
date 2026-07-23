import {
    loadTextToSpeech,
    loadVoiceStyle,
    writeWavFile
} from './helper.js';

// Конфигурация по умолчанию
const DEFAULT_VOICE_STYLE_PATH = 'assets/voice_styles/F2.json';

// Вспомогательная функция для извлечения имени файла из пути
function getFilenameFromPath(path) {
    return path.split('/').pop();
}

function getVoiceNameFromPath(path) {
    const filename = getFilenameFromPath(path);
    return filename.split('.')[0];
}

// Вычисление базовых адресов бэкенда Python (порт 8001 по умолчанию)
function getBackendBaseUrl() {
    if (window.location.port === "3000" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://127.0.0.1:8001";
    }
    return window.location.origin;
}

function getWebSocketBaseUrl() {
    const base = getBackendBaseUrl();
    return base.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

// Глобальное состояние
let textToSpeech = null;
let cfgs = null;
let currentStyle = null;
let currentStylePath = DEFAULT_VOICE_STYLE_PATH;

// Элементы интерфейса
const textInput = document.getElementById('text');
const voiceStyleSelect = document.getElementById('voiceStyleSelect');
const voiceStyleInfo = document.getElementById('voiceStyleInfo');
const langSelect = document.getElementById('langSelect');
const speedRange = document.getElementById('speed-range');
const speedVal = document.getElementById('speed-val');
const stepsRange = document.getElementById('steps-range');
const stepsVal = document.getElementById('steps-val');
const generateBtn = document.getElementById('generateBtn');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const backendBadge = document.getElementById('backendBadge');
const resultsContainer = document.getElementById('results');
const errorBox = document.getElementById('error');

// Вкладки
const tabTts = document.getElementById('tab-tts');
const tabAlisa = document.getElementById('tab-alisa');
const panelTts = document.getElementById('panel-tts');
const panelAlisa = document.getElementById('panel-alisa');
const alisaSettings = document.getElementById('alisa-settings');

// Элементы интерактивной Алисы
const recordBtn = document.getElementById("record-btn");
const micIcon = document.getElementById("mic-icon");
const hintText = document.getElementById("hint-text");
const chatContainer = document.getElementById("chat-container");
const audioPlayer = document.getElementById("audio-player");
const canvas = document.getElementById("orb-waves");
const ctx = canvas ? canvas.getContext("2d") : null;
const chatInputForm = document.getElementById("chat-input-form");
const chatTextInput = document.getElementById("chat-text-input");

// Селекторы настроек Алисы
const brainSelect = document.getElementById("brain-select");
const modeSelect = document.getElementById("mode-select");
const sttSelect = document.getElementById("stt-select");
const apiUrlInput = document.getElementById("api-url-input");
const apiUrlGroup = document.getElementById("api-url-group");

// Состояние вызовов Алисы
let isRecording = false;
let isSpeaking = false;
let recognition = null;
let animationFrameId = null;

// Анализатор аудио
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let frequencyData = new Uint8Array(0);

// Очередь WebSocket аудио
let ws = null;
let currentAssistantMessageElement = null;
let audioQueue = [];
let isPlayingAudio = false;
let currentSourceNode = null;
let serverDone = false;

// Real-Time (Свободные руки) аудиопоток
let streamCtx = null;
let streamSource = null;
let streamProcessor = null;
let realTimeWs = null;
let micStream = null;

// RAG элементы
const ragDropZone = document.getElementById("rag-drop-zone");
const ragFileInput = document.getElementById("rag-file-input");
const ragTextarea = document.getElementById("rag-context-textarea");
const btnSaveRag = document.getElementById("btn-save-rag");
const ragStatus = document.getElementById("rag-status");

/* ---------------------------------------------------- */
/* ОБЩИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И СТАТУСЫ */
/* ---------------------------------------------------- */

function showStatus(message, type = 'info') {
    statusText.innerHTML = message;
    statusBox.className = 'status-box';
    if (type === 'success') {
        statusBox.classList.add('success');
    } else if (type === 'error') {
        statusBox.classList.add('error');
    }
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('active');
}

function hideError() {
    errorBox.classList.remove('active');
}

function showBackendBadge() {
    backendBadge.classList.add('visible');
}

// Загрузка голосового стиля из JSON
async function loadStyleFromJSON(stylePath) {
    try {
        const style = await loadVoiceStyle([stylePath], true);
        return style;
    } catch (error) {
        console.error('Ошибка загрузки стиля голоса:', error);
        throw error;
    }
}

/* ---------------------------------------------------- */
/* ТАБЫ И НАСТРОЙКИ СЛАЙДЕРОВ */
/* ---------------------------------------------------- */

if (speedRange && speedVal) {
    speedRange.addEventListener('input', (e) => {
        speedVal.textContent = e.target.value;
    });
}

if (stepsRange && stepsVal) {
    stepsRange.addEventListener('input', (e) => {
        stepsVal.textContent = e.target.value;
    });
}

// Автоподстановка API URL
if (brainSelect && apiUrlInput && apiUrlGroup) {
    brainSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "vllm") {
            apiUrlGroup.classList.remove("hidden");
            apiUrlInput.value = "http://127.0.0.1:8000/v1";
        } else if (val === "lm-studio") {
            apiUrlGroup.classList.remove("hidden");
            apiUrlInput.value = "http://127.0.0.1:1234/v1";
        } else if (val === "ollama") {
            apiUrlGroup.classList.remove("hidden");
            apiUrlInput.value = "http://127.0.0.1:11434";
        } else {
            apiUrlGroup.classList.add("hidden");
        }
    });
}

// Переключение табов
if (tabTts && tabAlisa && panelTts && panelAlisa && alisaSettings) {
    tabTts.addEventListener('click', () => {
        tabTts.classList.add('active');
        tabAlisa.classList.remove('active');
        panelTts.classList.remove('hidden');
        panelAlisa.classList.add('hidden');
        alisaSettings.classList.add('hidden');
        
        stopRealTimeCallState();
        stopSpeaking();
    });

    tabAlisa.addEventListener('click', () => {
        tabAlisa.classList.add('active');
        tabTts.classList.remove('active');
        panelAlisa.classList.remove('hidden');
        panelTts.classList.add('hidden');
        alisaSettings.classList.remove('hidden');
        
        initWebSocket();
        resizeCanvas();
    });
}

/* ---------------------------------------------------- */
/* ЛОКАЛЬНЫЙ TTS ONNX СИНТЕЗ */
/* ---------------------------------------------------- */

async function initializeModels() {
    try {
        showStatus('ℹ️ <strong>Загрузка конфигурации...</strong>');
        const basePath = 'assets/onnx';
        let executionProvider = 'wasm';
        
        try {
            const result = await loadTextToSpeech(basePath, {
                executionProviders: ['webgpu'],
                graphOptimizationLevel: 'all'
            }, (modelName, current, total) => {
                showStatus(`ℹ️ <strong>Загрузка ONNX моделей (${current}/${total}):</strong> ${modelName}...`);
            });
            
            textToSpeech = result.textToSpeech;
            cfgs = result.cfgs;
            executionProvider = 'webgpu';
            backendBadge.textContent = 'WebGPU';
            backendBadge.style.background = '#00ff87';
            backendBadge.style.color = '#12121d';
        } catch (webgpuError) {
            console.log('WebGPU недоступен, переключаемся на WebAssembly (WASM)');
            const result = await loadTextToSpeech(basePath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            }, (modelName, current, total) => {
                showStatus(`ℹ️ <strong>Загрузка ONNX моделей (${current}/${total}):</strong> ${modelName}...`);
            });
            
            textToSpeech = result.textToSpeech;
            cfgs = result.cfgs;
            backendBadge.textContent = 'WASM';
        }
        
        showStatus('ℹ️ <strong>Загрузка стиля голоса...</strong>');
        currentStyle = await loadStyleFromJSON(currentStylePath);
        voiceStyleInfo.textContent = `${getFilenameFromPath(currentStylePath)} (по умолчанию)`;
        
        showStatus(`✅ <strong>Модели загружены!</strong> Используется ${executionProvider.toUpperCase()}. Готов к синтезу.`, 'success');
        showBackendBadge();
        
        if (generateBtn) generateBtn.disabled = false;
        
    } catch (error) {
        console.error('Ошибка загрузки моделей:', error);
        showStatus(`❌ <strong>Ошибка загрузки моделей:</strong> ${error.message}`, 'error');
    }
}

// Изменение голосового профиля
if (voiceStyleSelect) {
    voiceStyleSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        if (!selectedValue) return;
        
        try {
            if (generateBtn) generateBtn.disabled = true;
            showStatus(`ℹ️ <strong>Загрузка стиля голоса...</strong>`, 'info');
            
            currentStylePath = selectedValue;
            currentStyle = await loadStyleFromJSON(currentStylePath);
            voiceStyleInfo.textContent = getFilenameFromPath(currentStylePath);
            
            showStatus(`✅ <strong>Стиль голоса загружен:</strong> ${getFilenameFromPath(currentStylePath)}`, 'success');
            if (generateBtn) generateBtn.disabled = false;
        } catch (error) {
            showError(`Ошибка загрузки стиля: ${error.message}`);
            currentStylePath = DEFAULT_VOICE_STYLE_PATH;
            voiceStyleSelect.value = currentStylePath;
            try {
                currentStyle = await loadStyleFromJSON(currentStylePath);
                voiceStyleInfo.textContent = `${getFilenameFromPath(currentStylePath)} (по умолчанию)`;
            } catch (styleError) {
                console.error('Не удалось восстановить стиль по умолчанию:', styleError);
            }
            if (generateBtn) generateBtn.disabled = false;
        }
    });
}

// Генерация речи
async function generateSpeech() {
    const text = textInput.value.trim();
    if (!text) {
        showError('Пожалуйста, введите текст для синтеза.');
        return;
    }
    if (!textToSpeech || !cfgs) {
        showError('Модели еще загружаются. Пожалуйста, подождите.');
        return;
    }
    if (!currentStyle) {
        showError('Голосовой профиль не готов.');
        return;
    }
    
    const startTime = Date.now();
    try {
        if (generateBtn) generateBtn.disabled = true;
        hideError();
        
        resultsContainer.innerHTML = `
            <div class="results-placeholder generating">
                <div class="results-placeholder-icon">⏳</div>
                <p>Синтезируем речь...</p>
            </div>
        `;
        
        const totalStep = parseInt(stepsRange.value);
        const speed = parseFloat(speedRange.value);
        const lang = langSelect.value;
        
        showStatus('ℹ️ <strong>Генерация речи из текста...</strong>');
        const tic = Date.now();
        
        const { wav, duration } = await textToSpeech.call(
            text,
            lang,
            currentStyle, 
            totalStep,
            speed,
            0.3,
            (step, total) => {
                showStatus(`ℹ️ <strong>Шумоподавление (${step}/${total})...</strong>`);
            }
        );
        
        const toc = Date.now();
        console.log(`Локальный TTS синтез: ${((toc - tic) / 1000).toFixed(2)}s`);
        
        showStatus('ℹ️ <strong>Создание аудиофайла...</strong>');
        const wavLen = Math.floor(textToSpeech.sampleRate * duration[0]);
        const wavOut = wav.slice(0, wavLen);
        
        const wavBuffer = writeWavFile(wavOut, textToSpeech.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const endTime = Date.now();
        const totalTimeSec = ((endTime - startTime) / 1000).toFixed(2);
        const audioDurationSec = duration[0].toFixed(2);
        
        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-text-container">
                    <div class="result-text-label">Исходный текст</div>
                    <div class="result-text">${text}</div>
                </div>
                <div class="result-info">
                    <div class="info-item">
                        <span>📊 Длина аудио</span>
                        <strong>${audioDurationSec}s</strong>
                    </div>
                    <div class="info-item">
                        <span>⏱️ Время синтеза</span>
                        <strong>${totalTimeSec}s</strong>
                    </div>
                </div>
                <div class="result-player">
                    <audio controls style="width: 100%;">
                        <source src="${url}" type="audio/wav">
                    </audio>
                </div>
                <div class="result-actions">
                    <button onclick="downloadAudio('${url}', 'synthesized_speech.wav')">
                        <i class="fa-solid fa-download"></i>
                        Скачать WAV
                    </button>
                </div>
            </div>
        `;
        
        showStatus('✅ <strong>Синтез успешно завершен!</strong>', 'success');
    } catch (error) {
        console.error('Ошибка синтеза:', error);
        showStatus(`❌ <strong>Ошибка синтеза:</strong> ${error.message}`, 'error');
        showError(`Ошибка синтеза: ${error.message}`);
        resultsContainer.innerHTML = `
            <div class="results-placeholder">
                <div class="results-placeholder-icon">🎤</div>
                <p>Сгенерированное аудио появится здесь</p>
            </div>
        `;
    } finally {
        if (generateBtn) generateBtn.disabled = false;
    }
}

window.downloadAudio = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

if (generateBtn) generateBtn.addEventListener('click', generateSpeech);


/* ---------------------------------------------------- */
/* ИНТЕРАКТИВНЫЙ ЗВОНОК АЛИСЕ (WEBSOCKET И РЕЖИМЫ) */
/* ---------------------------------------------------- */

// Инициализация холста
function resizeCanvas() {
    if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
}
window.addEventListener("resize", resizeCanvas);

function initAudioAnalyser() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    
    sourceNode = audioCtx.createMediaElementSource(audioPlayer);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
}

// WebSocket чата (режим Рации)
function initWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    
    const wsUrl = getWebSocketUrl("/ws/chat");
    console.log("[WS] Подключение к чат-серверу:", wsUrl);
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log("[WS] Подключено к чату");
        if (modeSelect.value === "walkie-talkie") {
            hintText.textContent = "Нажмите на трубку, чтобы говорить с Алисой";
        }
    };
    
    ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "interruption") {
                console.log("[WS] Перебивание! Останавливаем синтез.");
                serverDone = true;
                stopSpeaking();
                hintText.textContent = "Вы перебили Алису. Говорите...";
                return;
            }
            await handleWSMessage(data);
        } catch (err) {
            console.error("[WS] Ошибка разбора пакета:", err);
        }
    };
    
    ws.onclose = () => {
        console.log("[WS] Отключено, переподключение через 2 сек...");
        setTimeout(initWebSocket, 2000);
    };
    
    ws.onerror = (err) => {
        console.error("[WS] Ошибка сокета:", err);
    };
}

function getWebSocketUrl(path) {
    const wsBase = getWebSocketBaseUrl();
    const cleanPath = path.replace(/^\/+/, "");
    return `${wsBase}/${cleanPath}`;
}

let mediaRecorder = null;
let audioChunks = [];
let stream = null;

// Настройка STT
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecording = true;
        recordBtn.classList.add("active-call");
        micIcon.className = "fa-solid fa-square";
        hintText.textContent = "Слушаю вас (Браузер)...";
    };

    recognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
            appendMessage("user", text);
            await sendToAI(text);
        }
    };

    recognition.onerror = (event) => {
        console.error("Ошибка браузерного STT:", event.error);
        if (event.error === "no-speech") {
            hintText.textContent = "Речь не обнаружена. Попробуйте снова.";
        } else {
            hintText.textContent = "Ошибка микрофона. Проверьте разрешения.";
        }
        stopRecordingState();
    };

    recognition.onend = () => {
        stopRecordingState();
    };
} else {
    const browserOption = sttSelect ? sttSelect.querySelector('option[value="browser"]') : null;
    if (browserOption) browserOption.disabled = true;
    if (sttSelect) sttSelect.value = "faster-whisper";
}

// Запись с Faster-Whisper
async function startLocalRecording() {
    audioChunks = [];
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstart = () => {
            isRecording = true;
            recordBtn.classList.add("active-call");
            micIcon.className = "fa-solid fa-square";
            hintText.textContent = "Слушаю вас (Запись)...";
        };

        mediaRecorder.onstop = async () => {
            stopRecordingState();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (audioChunks.length === 0) return;

            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.webm");

            hintText.textContent = "Распознаю речь (Faster-Whisper)...";
            
            try {
                const response = await fetch(getBackendBaseUrl() + "/api/transcribe", {
                    method: "POST",
                    body: formData
                });
                if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
                const result = await response.json();
                if (result.text && result.text.trim()) {
                    appendMessage("user", result.text);
                    await sendToAI(result.text);
                } else {
                    hintText.textContent = "Речь не распознана. Скажите громче.";
                }
            } catch (error) {
                console.error("Ошибка транскрибации:", error);
                hintText.textContent = "Ошибка распознавания. Проверьте сервер.";
            }
        };

        mediaRecorder.start();
    } catch (err) {
        console.error("Ошибка микрофона:", err);
        hintText.textContent = "Доступ к микрофону заблокирован.";
        stopRecordingState();
    }
}

// Конвертер PCM 16-бит
function float32ToInt16(float32Array) {
    const l = float32Array.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf.buffer;
}

// Запуск Свободные руки (Real-time VAD)
async function startRealTimeCall() {
    try {
        hintText.textContent = "Соединение с Алисой...";
        stopSpeaking();
        
        const phoneWsUrl = getWebSocketUrl("/ws/phone");
        console.log("[Phone WS] Подключение к:", phoneWsUrl);
        realTimeWs = new WebSocket(phoneWsUrl);
        
        realTimeWs.onopen = async () => {
            console.log("[Phone WS] Подключено!");
            hintText.textContent = "Алиса слушает. Говорите свободно...";
            
            const configPayload = {
                voice: getVoiceNameFromPath(voiceStyleSelect.value),
                speed: parseFloat(speedRange.value),
                steps: parseInt(stepsRange.value),
                backend: brainSelect.value,
                api_url: apiUrlInput.value
            };
            realTimeWs.send(JSON.stringify(configPayload));
            
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            streamSource = streamCtx.createMediaStreamSource(micStream);
            
            streamProcessor = streamCtx.createScriptProcessor(2048, 1, 1);
            streamSource.connect(streamProcessor);
            streamProcessor.connect(streamCtx.destination);
            
            streamProcessor.onaudioprocess = (e) => {
                if (realTimeWs && realTimeWs.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = float32ToInt16(inputData);
                    realTimeWs.send(pcmData);
                }
            };
            
            isRecording = true;
            recordBtn.classList.add("active-call");
            micIcon.className = "fa-solid fa-phone-slash";
        };
        
        realTimeWs.onmessage = async (event) => {
            try {
                if (typeof event.data === "string") {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === "interruption") {
                        console.log("[Phone WS] Barge-in! Прерывание Алисы.");
                        stopSpeaking();
                        hintText.textContent = "Вы перебили Алису. Говорите...";
                    }
                    else if (data.type === "status" && data.status === "processing") {
                        hintText.textContent = "Алиса думает...";
                    }
                    else if (data.type === "recognized") {
                        console.log("[Phone WS] Распознано:", data.text);
                        appendMessage("user", data.text);
                    }
                    else if (data.type === "token") {
                        if (!currentAssistantMessageElement) {
                            currentAssistantMessageElement = createAssistantMessagePlaceholder();
                        }
                        currentAssistantMessageElement.textContent += data.text;
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                    else if (data.type === "audio") {
                        const audioBytes = base64ToArrayBuffer(data.audio);
                        const audioBuffer = await decodeAudio(audioBytes);
                        
                        audioQueue.push({ audioBuffer, text: data.text });
                        if (!isPlayingAudio) {
                            playNextInQueue();
                        }
                    }
                    else if (data.type === "done") {
                        serverDone = true;
                        if (audioQueue.length === 0 && !isPlayingAudio) {
                            finishSpeakingRealTime();
                        }
                    }
                }
            } catch (err) {
                console.error("[Phone WS] Ошибка разбора пакета:", err);
            }
        };
        
        realTimeWs.onclose = () => {
            console.log("[Phone WS] Соединение закрыто");
            stopRealTimeCallState();
        };
        
        realTimeWs.onerror = (err) => {
            console.error("[Phone WS] Ошибка:", err);
            stopRealTimeCallState();
        };
        
    } catch (err) {
        console.error("[Phone WS] Не удалось начать звонок:", err);
        hintText.textContent = "Ошибка звонка: " + err.message;
        stopRealTimeCallState();
    }
}

function finishSpeakingRealTime() {
    isSpeaking = false;
    hintText.textContent = "Алиса закончила говорить. Слушаю вас...";
    currentAssistantMessageElement = null;
}

function stopRealTimeCallState() {
    isRecording = false;
    if (recordBtn) recordBtn.classList.remove("active-call");
    if (micIcon) micIcon.className = "fa-solid fa-phone";
    if (hintText) hintText.textContent = "Звонок завершен. Нажмите на трубку для вызова";
    
    if (streamProcessor) {
        try { streamProcessor.disconnect(); } catch(e){}
        streamProcessor = null;
    }
    if (streamSource) {
        try { streamSource.disconnect(); } catch(e){}
        streamSource = null;
    }
    if (streamCtx) {
        try { streamCtx.close(); } catch(e){}
        streamCtx = null;
    }
    if (micStream) {
        try { micStream.getTracks().forEach(track => track.stop()); } catch(e){}
        micStream = null;
    }
    if (realTimeWs) {
        if (realTimeWs.readyState === WebSocket.OPEN || realTimeWs.readyState === WebSocket.CONNECTING) {
            realTimeWs.close();
        }
        realTimeWs = null;
    }
    stopSpeaking();
}

// Клик по кнопке телефона / микрофона
if (recordBtn) {
    recordBtn.addEventListener("click", () => {
        if (modeSelect.value === "real-time") {
            if (isRecording) {
                stopRealTimeCallState();
            } else {
                startRealTimeCall();
            }
            return;
        }

        if (isSpeaking) {
            stopSpeaking();
            hintText.textContent = "Синтез прерван.";
            return;
        }

        if (isRecording) {
            if (sttSelect.value === "browser" && recognition) {
                recognition.stop();
            } else if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        } else {
            initAudioAnalyser();
            if (audioCtx && audioCtx.state === "suspended") {
                audioCtx.resume();
            }
            
            if (sttSelect.value === "browser" && recognition) {
                recognition.start();
            } else {
                startLocalRecording();
            }
        }
    });
}

// Отслеживание смены режимов
if (modeSelect) {
    modeSelect.addEventListener("change", () => {
        if (isRecording) {
            if (modeSelect.value === "real-time") {
                stopRecordingState();
            } else {
                stopRealTimeCallState();
            }
        } else {
            stopSpeaking();
        }
    });
}

function stopRecordingState() {
    isRecording = false;
    recordBtn.classList.remove("active-call");
    micIcon.className = "fa-solid fa-phone";
    hintText.textContent = "Нажмите на трубку для записи...";
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function decodeAudio(audioBytes) {
    return new Promise((resolve, reject) => {
        if (!audioCtx) initAudioAnalyser();
        audioCtx.decodeAudioData(audioBytes, resolve, reject);
    });
}

async function handleWSMessage(data) {
    if (data.type === "audio") {
        try {
            const audioBytes = base64ToArrayBuffer(data.audio);
            const audioBuffer = await decodeAudio(audioBytes);
            
            audioQueue.push({ audioBuffer, text: data.text });
            if (!isPlayingAudio) {
                playNextInQueue();
            }
        } catch (err) {
            console.error("[WS] Ошибка воспроизведения:", err);
        }
    } 
    else if (data.type === "done") {
        serverDone = true;
        if (audioQueue.length === 0 && !isPlayingAudio) {
            finishSpeaking();
        }
    }
}

function playNextInQueue() {
    if (audioQueue.length === 0) {
        isPlayingAudio = false;
        if (serverDone) {
            finishSpeaking();
            if (modeSelect.value === "real-time") {
                hintText.textContent = "Слушаю вас...";
            }
        }
        return;
    }
    
    isPlayingAudio = true;
    isSpeaking = true;
    hintText.textContent = "Алиса говорит...";
    
    const item = audioQueue.shift();
    if (item.text) {
        if (!currentAssistantMessageElement) {
            currentAssistantMessageElement = createAssistantMessagePlaceholder();
        }
        currentAssistantMessageElement.textContent += item.text + " ";
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    initAudioAnalyser();
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = item.audioBuffer;
    source.connect(analyser);
    
    source.onended = () => {
        currentSourceNode = null;
        playNextInQueue();
    };
    
    currentSourceNode = source;
    source.start(0);
}

function finishSpeaking() {
    isSpeaking = false;
    hintText.textContent = "Разговор окончен. Нажмите, чтобы ответить";
    currentAssistantMessageElement = null;
}

function stopSpeaking() {
    if (currentSourceNode) {
        try { currentSourceNode.stop(); } catch (e) {}
        currentSourceNode = null;
    }
    if (audioPlayer) audioPlayer.pause();
    
    audioQueue = [];
    isPlayingAudio = false;
    isSpeaking = false;
    currentAssistantMessageElement = null;
}

function createAssistantMessagePlaceholder() {
    const msg = document.createElement("div");
    msg.className = `message assistant`;
    
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
    
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = "";
    
    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return bubble;
}

async function sendToAI(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("[WS] Сокет закрыт. Резервный HTTP-запрос...");
        await sendToAIHttp(text);
        return;
    }
    
    stopSpeaking();
    hintText.textContent = "Алиса думает...";
    serverDone = false;
    
    const payload = {
        text: text,
        voice: getVoiceNameFromPath(voiceStyleSelect.value),
        speed: parseFloat(speedRange.value),
        steps: parseInt(stepsRange.value),
        backend: brainSelect.value,
        api_url: apiUrlInput.value
    };
    ws.send(JSON.stringify(payload));
}

// Резервный REST HTTP
async function sendToAIHttp(text) {
    stopSpeaking();
    hintText.textContent = "Алиса размышляет...";
    
    try {
        const response = await fetch(getBackendBaseUrl() + "/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                voice: getVoiceNameFromPath(voiceStyleSelect.value),
                speed: parseFloat(speedRange.value),
                steps: parseInt(stepsRange.value),
                backend: brainSelect.value,
                api_url: apiUrlInput.value
            })
        });

        if (!response.ok) throw new Error(`Ошибка: ${response.status}`);

        const responseTextRaw = response.headers.get("X-Response-Text");
        let aiText = "Аудио сгенерировано.";
        if (responseTextRaw) {
            aiText = decodeURIComponent(escape(responseTextRaw));
        }

        appendMessage("assistant", aiText);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        initAudioAnalyser();
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        
        audioPlayer.src = audioUrl;
        isSpeaking = true;
        hintText.textContent = "Алиса говорит...";
        audioPlayer.play();

        audioPlayer.onended = () => {
            isSpeaking = false;
            hintText.textContent = "Нажмите для продолжения";
        };
    } catch (error) {
        console.error("Ошибка AI HTTP:", error);
        appendMessage("assistant", "Ошибка связи с ИИ. Проверьте запущен ли локальный сервер.");
        hintText.textContent = "Ошибка соединения.";
    }
}

function appendMessage(sender, text) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = sender === "assistant" ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
    
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    
    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ---------------------------------------------------- */
/* АНИМАЦИЯ СФЕРЫ НА CANVAS */
/* ---------------------------------------------------- */

let wavePhase = 0;
function drawWaves() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 65; 
    
    if (isSpeaking && analyser) {
        analyser.getByteFrequencyData(frequencyData);
    }
    
    wavePhase += 0.05;
    
    const layers = 3;
    const colors = [
        "rgba(138, 43, 226, 0.4)",  
        "rgba(0, 210, 255, 0.35)",  
        "rgba(255, 0, 127, 0.25)"   
    ];
    
    for (let l = 0; l < layers; l++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[l];
        ctx.lineWidth = 3 - l * 0.5;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors[l];
        
        const numPoints = 80;
        for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            
            let offset = 0;
            if (isSpeaking && frequencyData.length > 0) {
                const freqIndex = Math.floor((i % (numPoints / 2)) / (numPoints / 2) * frequencyData.length);
                const amplitude = frequencyData[freqIndex] / 255;
                offset = Math.sin(angle * 6 + wavePhase * (l + 1)) * 25 * amplitude;
            } else if (isRecording) {
                offset = Math.sin(angle * 8 + wavePhase * 2) * 8;
            } else {
                offset = Math.sin(angle * 4 + wavePhase) * 3;
            }
            
            const r = baseRadius + offset + l * 8;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    animationFrameId = requestAnimationFrame(drawWaves);
}

// Запуск анимации отрисовки
drawWaves();

// Отправка сообщений из текстового поля в Алису
if (chatInputForm) {
    chatInputForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = chatTextInput.value.trim();
        if (!text) return;
        
        chatTextInput.value = "";
        
        if (isSpeaking) stopSpeaking();
        
        if (isRecording) {
            if (modeSelect.value === "real-time") {
                stopRealTimeCallState();
            } else if (sttSelect.value === "browser" && recognition) {
                recognition.stop();
            } else if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        }
        
        initAudioAnalyser();
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        
        appendMessage("user", text);
        await sendToAI(text);
    });
}

/* ---------------------------------------------------- */
/* RAG КОНТЕКСТ ВАКАНСИЙ (КЛИЕНТСКАЯ ЧАСТЬ) */
/* ---------------------------------------------------- */

async function loadRagContext() {
    try {
        const response = await fetch(getBackendBaseUrl() + "/api/context");
        if (response.ok) {
            const data = await response.json();
            if (data.context && ragTextarea) {
                ragTextarea.value = data.context;
            }
        }
    } catch (err) {
        console.error("[RAG] Ошибка загрузки базы знаний:", err);
    }
}

// Загружаем контекст
loadRagContext();

if (ragDropZone && ragFileInput) {
    ragDropZone.addEventListener("click", () => ragFileInput.click());
    
    ragDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        ragDropZone.classList.add("dragover");
    });
    
    ragDropZone.addEventListener("dragleave", () => {
        ragDropZone.classList.remove("dragover");
    });
    
    ragDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        ragDropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            handleRagFile(e.dataTransfer.files[0]);
        }
    });
    
    ragFileInput.addEventListener("change", (e) => {
        if (e.target.files.length) {
            handleRagFile(e.target.files[0]);
        }
    });
}

function showRagStatus(text, type, timeout = 4000) {
    if (!ragStatus) return;
    ragStatus.textContent = text;
    ragStatus.className = `rag-status ${type}`;
    if (timeout) {
        setTimeout(() => {
            ragStatus.textContent = "";
            ragStatus.className = "rag-status";
        }, timeout);
    }
}

function handleRagFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (ragTextarea) {
            ragTextarea.value = e.target.result;
        }
        showRagStatus("Файл прочитан. Сохраняем...", "info", 2000);
        saveRagContext();
    };
    reader.onerror = () => {
        showRagStatus("Ошибка чтения файла! Только текстовые форматы.", "error");
    };
    reader.readAsText(file, "UTF-8");
}

async function saveRagContext() {
    if (!btnSaveRag || !ragTextarea) return;
    const originalBtnText = btnSaveRag.innerHTML;
    btnSaveRag.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...`;
    btnSaveRag.disabled = true;
    
    const text = ragTextarea.value;
    try {
        const response = await fetch(getBackendBaseUrl() + "/api/context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context: text })
        });
        if (response.ok) {
            showRagStatus("✓ База знаний успешно обновлена!", "success");
        } else {
            showRagStatus("❌ Ошибка сохранения.", "error");
        }
    } catch (e) {
        showRagStatus("❌ Ошибка сети.", "error");
    } finally {
        btnSaveRag.innerHTML = originalBtnText;
        btnSaveRag.disabled = false;
    }
}

if (btnSaveRag) {
    btnSaveRag.addEventListener("click", saveRagContext);
}

/* ---------------------------------------------------- */
/* ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ */
/* ---------------------------------------------------- */

window.addEventListener('load', async () => {
    if (generateBtn) generateBtn.disabled = true;
    await initializeModels();
});
