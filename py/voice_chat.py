import os
import time
import numpy as np
import sounddevice as sd
import soundfile as sf
import speech_recognition as sr
from supertonic import TTS
from ru_preprocessor import RussianTTSPreprocessor

# Инициализируем препроцессор
preprocessor = RussianTTSPreprocessor()

# Инициализируем распознаватель речи
recognizer = sr.Recognizer()

# Конфигурация записи звука
FS = 16000  # Частота дискретизации для STT (16kHz идеально для Whisper/Google)
CHANNELS = 1
SILENCE_LIMIT = 2.0  # Время тишины (в секундах) для остановки записи
THRESHOLD = 0.02  # Порог громкости (чувствительность микрофона)

def record_audio_until_silence() -> str:
    """
    Записывает аудио с микрофона, автоматически останавливаясь при наступлении тишины.
    Возвращает путь к временному WAV-файлу.
    """
    print("\n🎤 Слушаю вас... (начните говорить)")
    
    # Время старта ожидания
    start_time = time.time()
    
    # Буфер для накопления аудиоданных
    audio_data = []
    
    # Флаги состояния записи
    recording_started = False
    silence_start_time = None
    
    # Callback для обработки аудио-потока в реальном времени
    def callback(indata, frames, time_info, status):
        nonlocal recording_started, silence_start_time
        volume_norm = np.linalg.norm(indata) / np.sqrt(len(indata))
        
        # Если громкость превысила порог, значит пользователь начал говорить
        if volume_norm > THRESHOLD:
            if not recording_started:
                print("🎙️ Говорите...")
                recording_started = True
            silence_start_time = None
        else:
            if recording_started:
                if silence_start_time is None:
                    silence_start_time = time.time()
        
        if recording_started:
            audio_data.append(indata.copy())

    # Открываем поток записи
    with sd.InputStream(samplerate=FS, channels=CHANNELS, callback=callback):
        while True:
            sd.sleep(100)
            # Проверяем, наступила ли тишина после начала разговора
            if recording_started and silence_start_time:
                if time.time() - silence_start_time > SILENCE_LIMIT:
                    print("🛑 Запись остановлена (обнаружена пауза).")
                    break
            # Если пользователь молчит слишком долго в самом начале (таймаут 10 сек)
            if not recording_started and time.time() - start_time > 10.0:
                print("⏳ Время ожидания истекло.")
                return ""
                
    if not audio_data:
        return ""
        
    # Сохраняем во временный файл
    temp_filename = "temp_input.wav"
    audio_np = np.concatenate(audio_data, axis=0)
    sf.write(temp_filename, audio_np, FS)
    return temp_filename

def transcribe_audio(filename: str) -> str:
    """
    Распознает речь из WAV-файла с помощью бесплатного Google STT.
    """
    if not filename or not os.path.exists(filename):
        return ""
        
    print("🧠 Распознаю речь...")
    try:
        with sr.AudioFile(filename) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language="ru-RU")
            print(f"👤 Вы: {text}")
            return text
    except sr.UnknownValueError:
        print("❌ Не удалось распознать речь.")
    except sr.RequestError as e:
        print(f"❌ Ошибка сервиса распознавания: {e}")
    finally:
        if os.path.exists(filename):
            os.remove(filename)
    return ""

def get_llm_response(user_text: str) -> str:
    """
    Генерирует ответ от LLM. 
    Пытается использовать Gemini API, если установлен ключ, иначе Ollama, иначе простой заглушечный ИИ.
    """
    # 1. Проверяем Gemini API Key
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            system_prompt = (
                "Ты - дружелюбный голосовой ассистент по имени Алиса. Отвечай кратко (1-3 предложения), "
                "живо и естественно на русском языке. Используй простую речь, подходящую для озвучки."
            )
            response = model.generate_content(f"{system_prompt}\n\nПользователь: {user_text}")
            return response.text
        except Exception as e:
            print(f"[Gemini API] Ошибка: {e}. Пробую резервные варианты...")

    # 2. Проверяем локальный Ollama с оптимизацией
    try:
        import httpx
        ollama_url = "http://localhost:11434/api/generate"
        
        # Получаем доступную модель или первую попавшуюся
        model_name = "llama3"
        try:
            res = httpx.get("http://localhost:11434/api/tags", timeout=1.5)
            if res.status_code == 200:
                models = [m["name"] for m in res.json().get("models", [])]
                if models:
                    for m in models:
                        if any(fast in m.lower() for fast in ["0.5b", "1.5b", "qwen", "phi", "mini"]):
                            model_name = m
                            break
                    else:
                        model_name = models[0]
        except Exception:
            pass
            
        response = httpx.post(ollama_url, json={
            "model": model_name,
            "prompt": f"Ответь на русском языке очень кратко (1-2 предложения) на вопрос: {user_text}",
            "stream": False,
            "options": {
                "num_predict": 45,
                "num_ctx": 1024,
                "temperature": 0.7,
                "top_k": 20,
                "top_p": 0.9
            }
        }, timeout=5.0)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
    except Exception:
        pass

    # 3. Умная локальная заглушка (если нет сети и локального ИИ)
    witty_responses = {
        "привет": "Привет! Рада слышать тебя. О чем сегодня поговорим?",
        "как дела": "У меня всё отлично, летаю на антигравитации! А как твои успехи?",
        "кто ты": "Я твой голосовой собеседник, озвученный моделью Supertonic.",
        "велосипед": "О, велосипед — это круто! Помню, мы недавно обсуждали, как держать тридцать километров в час.",
    }
    
    user_lower = user_text.lower()
    for key, val in witty_responses.items():
        if key in user_lower:
            return val
            
    return "Я услышала тебя, но сейчас у меня нет активного подключения к искусственному интеллекту. Давай просто поболтаем о чем-нибудь простом!"

def main():
    print("🤖 Запуск голосового конвейера Supertonic Live Chat...")
    
    # 1. Инициализируем TTS
    print("📦 Загрузка модели Supertonic TTS...")
    tts = TTS(auto_download=False)
    # Используем приятный женский голос F2
    style = tts.get_voice_style(voice_name="F2")
    
    # Стартовая реплика
    greeting = "Привет! Я готова к живому общению. Спроси меня о чём-нибудь!"
    print(f"🤖 Ассистент: {greeting}")
    
    # Озвучиваем приветствие
    processed_greeting = preprocessor.apply_rules(greeting)
    wav, _ = tts.synthesize(text=processed_greeting, lang="ru", voice_style=style, total_steps=10, speed=1.15)
    sd.play(wav[0], 24000) # Supertonic генерирует с частотой 24kHz
    sd.wait()
    
    global start_time
    
    while True:
        start_time = time.time()
        
        # 2. Запись звука
        temp_file = record_audio_until_silence()
        if not temp_file:
            continue
            
        # 3. Распознавание
        user_text = transcribe_audio(temp_file)
        if not user_text:
            continue
            
        if "выход" in user_text.lower() or "пока" in user_text.lower() or "стоп" in user_text.lower():
            bye = "Было приятно пообщаться! До свидания!"
            print(f"🤖 Ассистент: {bye}")
            processed_bye = preprocessor.apply_rules(bye)
            wav, _ = tts.synthesize(text=processed_bye, lang="ru", voice_style=style, total_steps=10, speed=1.15)
            sd.play(wav[0], 24000)
            sd.wait()
            break
            
        # 4. Ответ от LLM
        response_text = get_llm_response(user_text)
        print(f"🤖 Ассистент: {response_text}")
        
        # 5. Озвучка ответа
        processed_response = preprocessor.apply_rules(response_text)
        
        print("🔊 Синтез и воспроизведение...")
        wav, _ = tts.synthesize(text=processed_response, lang="ru", voice_style=style, total_steps=10, speed=1.15)
        sd.play(wav[0], 24000)
        sd.wait()

if __name__ == "__main__":
    main()
