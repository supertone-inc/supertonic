import os
from supertonic import TTS

def main():
    # Создаем директорию для результатов, если ее нет
    os.makedirs("results", exist_ok=True)
    
    print("Инициализация Supertonic TTS (модели будут загружены автоматически при первом запуске)...")
    tts = TTS(auto_download=True)
    
    # Выбор голоса. Доступны: M1-M5, F1-F5. Возьмём мужской M1 или женский F1
    style = tts.get_voice_style(voice_name="F1")
    
    text = "Привет! Я — система локального синтеза речи Supertonic. <laugh> Я работаю очень быстро и совершенно не требую подключения к интернету. <breath> Приятно познакомиться!"
    
    print(f"Генерация речи для текста: '{text}'")
    
    # Синтез аудио
    wav, duration = tts.synthesize(
        text=text,
        lang="ru",         # Языковой код для русского
        voice_style=style, # Стиль голоса
        total_steps=10,    # Качество (5 - низкое, 12 - высокое)
        speed=1.0          # Скорость речи
    )
    
    output_path = "results/output_ru.wav"
    tts.save_audio(wav, output_path)
    
    print(f"Готово! Сгенерировано {duration[0]:.2f} секунд аудио.")
    print(f"Файл сохранен по пути: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    main()
