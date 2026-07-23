import os
from supertonic import TTS

def main():
    os.makedirs("results", exist_ok=True)
    tts = TTS(auto_download=False) # Мы уже скачали модели ранее
    
    style = tts.get_voice_style(voice_name="M1")
    
    # Чтобы система не растягивала звуки и лучше понимала фразы:
    # 1. Используем пунктуацию для естественных пауз
    # 2. Пишем сложные слова так, как они слышатся (если модель ошибается в ударениях)
    text = "Система Supertonic генерирует речь напрямую из текста, без использования промежуточных фонем. <breath> Чтобы она не растягивала слова, можно немного увеличить скорость, а для улучшения качества произношения — повысить количество шагов генерации. И так далее."
    
    print("Генерация оптимизированного аудио...")
    
    wav, duration = tts.synthesize(
        text=text,
        lang="ru",
        voice_style=style,
        total_steps=12,    # Увеличиваем качество (максимум 12) для лучшей артикуляции
        speed=1.15         # Слегка увеличиваем скорость (1.15), чтобы убрать излишнее растягивание гласных
    )
    
    output_path = "results/output_ru_optimized.wav"
    tts.save_audio(wav, output_path)
    print(f"Готово! Сгенерировано {duration[0]:.2f} секунд аудио.")
    print(f"Файл сохранен по пути: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    main()
