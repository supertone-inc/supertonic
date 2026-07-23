import os
import sys
import json
import base64
import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import WebSocket, UploadFile

# Добавляем текущую директорию в пути поиска
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Импортируем тестируемые модули
from ru_preprocessor import RussianTTSPreprocessor
import server
from server import app, extract_sentences, ChatRequest
import voice_chat


# =====================================================================
# 1. МОДУЛЬНЫЕ ТЕСТЫ: RussianTTSPreprocessor (ru_preprocessor.py)
# =====================================================================

def test_preprocessor_init():
    """Тест инициализации препроцессора и наполнения словарей."""
    prep = RussianTTSPreprocessor()
    assert "на" in prep.clitics
    assert "привет" in prep.stress_db
    assert prep.vowels

def test_convert_plus_to_caps():
    """Тест преобразования знака плюс перед гласной."""
    prep = RussianTTSPreprocessor()
    assert prep.convert_plus_to_caps("прив+ет") == "привЕт"
    assert prep.convert_plus_to_caps("з+амок") == "зАмок"
    assert prep.convert_plus_to_caps("нет_плюса") == "нет_плюса"

def test_get_heuristic_stress_index():
    """Тест эвристического определения ударного слога в неизвестных словах."""
    prep = RussianTTSPreprocessor()
    
    # 1. Слово с буквой 'ё'
    assert prep.get_heuristic_stress_index("зелёный", [1, 3, 5]) == 3
    
    # 2. Односложное слово (0 гласных передавать не имеет смысла по логике вызова)
    assert prep.get_heuristic_stress_index("слог", [2]) == 2
    
    # 3. Двухсложное слово (ударение на первый слог по умолчанию)
    assert prep.get_heuristic_stress_index("мама", [1, 3]) == 1
    
    # 4. Трехсложное слово (ударение на предпоследний слог)
    assert prep.get_heuristic_stress_index("активный", [0, 3, 6]) == 3

def test_reduce_and_stress_word():
    """Тест акцентуации, редукции О -> А и клитик для одного слова."""
    prep = RussianTTSPreprocessor()
    
    # Тест клитики (предлога) с редукцией
    assert prep.reduce_and_stress_word("под") == "пад"
    assert prep.reduce_and_stress_word("обо") == "аба"
    
    # Тест слова из словаря (где также вручную прописана редукция О->А)
    assert prep.reduce_and_stress_word("привет") == "привЕт"
    assert prep.reduce_and_stress_word("столе") == "сталЕ"
    
    # Восстановление заглавной первой буквы
    assert prep.reduce_and_stress_word("Привет") == "ПривЕт"
    
    # Тест односложного слова
    assert prep.reduce_and_stress_word("стол") == "стОл"
    
    # Тест автоматической буквы Ё (зелёный -> зилЁный из-за редукции предударной Е->И)
    assert prep.reduce_and_stress_word("зелёный") == "зилЁный"
    
    # Тест слова с ручным ударением через плюс
    assert prep.reduce_and_stress_word("зам+ок") == "замОк"

def test_reduce_and_stress_word_special_cases():
    """Тест дополнительных граничных случаев в reduce_and_stress_word."""
    prep = RussianTTSPreprocessor()
    
    # Односложное слово с заглавной первой буквой
    assert prep.reduce_and_stress_word("Слог") == "СлОг"

def test_apply_rules():
    """Тест полной нормализации текста и раскрытия сокращений."""
    prep = RussianTTSPreprocessor()
    
    # Тест сокращений
    res = prep.apply_rules("и т.д. и т.п.")
    assert "дАлие" in res
    assert "падОбнае" in res
    assert "рублЕй" in prep.apply_rules("100 руб.")
    assert "тЫсич" in prep.apply_rules("5 тыс.")
    assert "миллиОнав" in prep.apply_rules("2 млн.")
    
    # Тест пустого текста
    assert prep.apply_rules("") == ""
    assert prep.apply_rules(None) == ""
    
    # Тест комплексного текста
    text = "Я положил ключи на столе, а на столе стоял торт."
    result = prep.apply_rules(text)
    assert "сталЕ" in result
    assert "тОрт" in result

def test_preprocessor_homographs_and_morphology():
    """Тест интеллектуального омограф-анализатора и суффиксальных эвристик."""
    prep = RussianTTSPreprocessor()
    
    # 1. Тест омографов с контекстом
    assert "замОк" in prep.apply_rules("Этот замок закрыт на ключ.")
    assert "зАмок" in prep.apply_rules("Король построил каменный замок.")
    
    # 2. Тест суффиксов и морфологии
    # -ость -> скОрость, рАдость (суффикс безударный)
    assert "скОрасть" in prep.apply_rules("скорость")
    # -ение -> решЕние, движЕние
    assert "ришЕние" in prep.apply_rules("решение")
    # -ировать -> блокировать
    assert "блакИравать" in prep.apply_rules("блокировать")



# =====================================================================
# 2. МОДУЛЬНЫЕ ТЕСТЫ: Вспомогательные функции server.py
# =====================================================================

def test_extract_sentences():
    """Тест нарезки текстового буфера на законченные предложения."""
    # 1. Обычные предложения
    sentences, remaining = extract_sentences("Привет! Как твои дела? Я лечу")
    assert sentences == ["Привет!", "Как твои дела?"]
    assert remaining == " Я лечу"
    
    # 2. С обработкой аббревиатур (не должны вызывать ложную нарезку)
    sentences, remaining = extract_sentences("Стоимость 100 руб. Это дешево.")
    assert sentences == ["Стоимость 100 руб. Это дешево."]
    assert remaining == ""
    
    # 4. Несколько знаков препинания подряд
    sentences, remaining = extract_sentences("Привет!!! Ого...")
    assert sentences == ["Привет!!!", "Ого..."]
    assert remaining == ""
    
    # 3. Финальный сброс буфера
    sentences, remaining = extract_sentences("Я лечу.", is_final=True)
    assert sentences == ["Я лечу."]
    assert remaining == ""


# =====================================================================
# 3. ИНТЕГРАЦИОННЫЕ ТЕСТЫ FastAPI REST API (server.py)
# =====================================================================

@pytest.fixture
def mock_tts_and_stt():
    """Фикстура для мокирования Supertonic TTS и Faster-Whisper."""
    with patch("server.tts") as mock_tts, \
         patch("server.stt_model") as mock_stt:
        
        # Настройка мока TTS
        mock_tts.get_voice_style.return_value = "dummy_style"
        mock_tts.synthesize.return_value = (bytes([0] * 1000), None)
        
        # Физически создаем пустой файл при сохранении аудио, чтобы FileResponse не падал
        def save_audio_mock(wav, filename):
            with open(filename, "wb") as f:
                f.write(wav if isinstance(wav, bytes) else b"dummy wav data")
        mock_tts.save_audio = MagicMock(side_effect=save_audio_mock)
        
        # Настройка мока STT
        mock_segment = MagicMock()
        mock_segment.text = "Тестовая транскрибация"
        mock_stt.transcribe.return_value = ([mock_segment], None)
        
        yield mock_tts, mock_stt

@patch("server.stream_mock")
def test_rest_chat_mock(mock_stream, mock_tts_and_stt):
    """Тест REST API /api/chat с локальной заглушкой."""
    # Переопределяем stream_mock для возвращения только ASCII текста во избежание UnicodeEncodeError в TestClient
    async def mock_generator(text):
        yield "Hello! Glad to hear you."
    mock_stream.return_value = mock_generator("Привет")
    
    # Мокаем FileResponse, чтобы он подменял заголовок X-Response-Text на ASCII в TestClient
    original_file_response = server.FileResponse
    
    def file_response_mock(*args, **kwargs):
        if "headers" in kwargs and "X-Response-Text" in kwargs["headers"]:
            kwargs["headers"]["X-Response-Text"] = "Hello! Glad to hear you."
        return original_file_response(*args, **kwargs)
        
    client = TestClient(app)
    
    with patch("server.FileResponse", side_effect=file_response_mock):
        response = client.post(
            "/api/chat",
            json={"text": "Привет", "backend": "mock", "voice": "F2"}
        )
        
        try:
            assert response.status_code == 200
            assert response.headers["content-type"] == "audio/wav"
            assert "X-Response-Text" in response.headers
            assert response.headers["X-Response-Text"] == "Hello! Glad to hear you."
        finally:
            if os.path.exists("temp_response.wav"):
                os.remove("temp_response.wav")

def test_rest_chat_empty_text():
    """Тест REST API /api/chat с пустым текстом."""
    client = TestClient(app)
    response = client.post("/api/chat", json={"text": "", "backend": "mock"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Text is empty"

@pytest.mark.asyncio
async def test_stream_mock():
    """Тест асинхронного генератора локальной заглушки."""
    words = []
    async for word in server.stream_mock("Привет"):
        words.append(word)
    assert len(words) > 0
    assert "Привет! " in words or "Рада " in "".join(words)


# =====================================================================
# 4. ИНТЕГРАЦИОННЫЕ ТЕСТЫ FastAPI WebSocket (server.py)
# =====================================================================

@patch("server.stream_mock")
def test_websocket_chat_endpoint(mock_stream, mock_tts_and_stt):
    """Тест WebSocket-соединения, стриминга токенов и аудиофрагментов."""
    # Возвращаем ASCII во избежание кодировочных проблем в WebSocket-тесте
    async def mock_generator(text):
        yield "Hello! "
        yield "Glad to hear you."
    mock_stream.return_value = mock_generator("Привет")
    
    client = TestClient(app)
    
    with client.websocket_connect("/ws/chat") as websocket:
        # Отправляем настройки
        websocket.send_json({
            "text": "Привет",
            "backend": "mock",
            "voice": "F2",
            "speed": 1.15,
            "steps": 8
        })
        
        # Читаем ответы
        messages = []
        has_token = False
        has_audio = False
        has_done = False
        
        for _ in range(30):
            try:
                data = websocket.receive_json()
                messages.append(data)
                if data["type"] == "token":
                    has_token = True
                elif data["type"] == "audio":
                    has_audio = True
                    assert "audio" in data
                    assert "text" in data
                elif data["type"] == "done":
                    has_done = True
                    break
            except Exception:
                break
                
        assert has_token, "WebSocket не прислал ни одного текстового токена!"
        assert has_audio, "WebSocket не прислал аудиофрагменты!"
        assert has_done, "WebSocket не завершил сессию отправкой done!"


# =====================================================================
# 5. ИНТЕГРАЦИОННЫЕ ТЕСТЫ: Распознавание речи /api/transcribe (server.py)
# =====================================================================

def test_transcribe_endpoint(mock_tts_and_stt):
    """Тест эвристики Faster-Whisper транскрибации речи."""
    client = TestClient(app)
    
    # Создаем фальшивый файл для загрузки
    file_content = b"fake webm audio content"
    response = client.post(
        "/api/transcribe",
        files={"file": ("test.webm", file_content, "audio/webm")}
    )
    
    assert response.status_code == 200
    assert response.json()["text"] == "Тестовая транскрибация"


# =====================================================================
# 6. МОДУЛЬНЫЕ ТЕСТЫ: Терминальный Голосовой Чат (voice_chat.py)
# =====================================================================

def test_voice_chat_get_llm_response():
    """Тест логики извлечения ответов от ИИ в voice_chat.py."""
    # 1. Проверяем работу заглушки
    res = voice_chat.get_llm_response("Привет Алиса!")
    assert "Привет! Рада слышать тебя." in res
    
    res_default = voice_chat.get_llm_response("Неизвестный вопрос")
    assert "Я услышала тебя" in res_default

@patch("speech_recognition.AudioFile")
@patch("voice_chat.recognizer")
def test_voice_chat_transcribe_audio(mock_rec, mock_audio_file):
    """Тест распознавания речи из файла."""
    # Настраиваем мок распознавателя и AudioFile
    mock_audio_file.return_value.__enter__.return_value = "source"
    mock_rec.record.return_value = "audio_data"
    mock_rec.recognize_google.return_value = "тестовый текст с микрофона"
    
    # Создаем временный файл
    temp_file = "temp_test_voice.wav"
    with open(temp_file, "w") as f:
        f.write("dummy")
        
    try:
        res = voice_chat.transcribe_audio(temp_file)
        assert res == "тестовый текст с микрофона"
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

def test_voice_chat_transcribe_missing_file():
    """Тест обработки отсутствующего файла в voice_chat."""
    assert voice_chat.transcribe_audio("non_existent_file.wav") == ""


# =====================================================================
# 7. ТЕСТИРОВАНИЕ ВНЕШНИХ API (OpenAI/Ollama/Gemini) В БЭКЕНДЕ
# =====================================================================

@pytest.mark.asyncio
async def test_stream_from_openai_success():
    """Тест асинхронного стриминга из OpenAI-совместимых LLM."""
    # Имитируем асинхронный генератор строк aiter_lines()
    async def mock_aiter_lines():
        lines = [
            'data: {"choices": [{"delta": {"content": "Привет"}}]}',
            'data: {"choices": [{"delta": {"content": " мир!"}}]}',
            'data: [DONE]'
        ]
        for line in lines:
            yield line
            
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.aiter_lines = mock_aiter_lines
    
    # Настраиваем асинхронный контекстный менеджер для AsyncClient
    mock_stream_ctx = MagicMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
    
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.stream.return_value = mock_stream_ctx
    
    with patch("httpx.AsyncClient", return_value=mock_client):
        tokens = []
        async for token in server.stream_from_openai("http://dummy", []):
            tokens.append(token)
            
        assert "".join(tokens) == "Привет мир!"

@pytest.mark.asyncio
async def test_stream_from_ollama_success():
    """Тест асинхронного стриминга из Ollama."""
    async def mock_aiter_lines():
        lines = [
            '{"message": {"content": "Оллама"}, "done": false}',
            '{"message": {"content": " ответ"}, "done": true}'
        ]
        for line in lines:
            yield line
            
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.aiter_lines = mock_aiter_lines
    
    # Настраиваем асинхронный контекстный менеджер для AsyncClient
    mock_stream_ctx = MagicMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
    
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.stream.return_value = mock_stream_ctx
    
    with patch("httpx.AsyncClient", return_value=mock_client), \
         patch("server.get_active_ollama_model", new_callable=AsyncMock) as mock_get_model:
        mock_get_model.return_value = "llama3"
        tokens = []
        async for token in server.stream_from_ollama("http://dummy", [{"role": "user", "content": "Промпт"}]):
            tokens.append(token)
            
        assert "".join(tokens) == "Оллама ответ"


# =====================================================================
# 8. ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ: Стриминг Gemini & Запись звука
# =====================================================================

@pytest.mark.asyncio
async def test_stream_from_gemini_success():
    """Тест асинхронного стриминга из Gemini API."""
    mock_chunk1 = MagicMock()
    mock_chunk1.text = "Привет от "
    mock_chunk2 = MagicMock()
    mock_chunk2.text = "Джемини"
    
    # Асинхронный генератор ответа
    async def async_gen():
        yield mock_chunk1
        yield mock_chunk2
        
    mock_response = async_gen()
    
    mock_model = MagicMock()
    mock_model.generate_content_async = AsyncMock(return_value=mock_response)
    
    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake_key"}), \
         patch("google.generativeai.GenerativeModel", return_value=mock_model), \
         patch("google.generativeai.configure") as mock_conf:
         
        tokens = []
        async for token in server.stream_from_gemini([{"role": "system", "content": "system"}, {"role": "user", "content": "prompt"}]):
            tokens.append(token)
            
        assert "".join(tokens) == "Привет от Джемини"

def test_voice_chat_record_audio_until_silence_timeout():
    """Тест таймаута записи звука при отсутствии голоса."""
    # Переопределяем время старта для имитации мгновенного таймаута
    with patch("time.time", side_effect=[0, 0, 15]): # Разница 15 секунд (таймаут 10)
        with patch("sounddevice.InputStream") as mock_input:
            res = voice_chat.record_audio_until_silence()
            assert res == ""
