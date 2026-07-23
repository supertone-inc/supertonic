import os
from supertonic import TTS

def main():
    os.makedirs("results", exist_ok=True)
    tts = TTS(auto_download=False)
    style = tts.get_voice_style(voice_name="M5") # Использовали голос M5 в 10-м тесте
    
    # Фраза: "а на столе стоял вкусный торт"
    # Пробуем разные способы заставить модель сказать "столЕ"
    tests = [
        # 1. Оригинал (ошибка)
        "а на столе стоял вкусный торт",
        # 2. Фонетическое "а" вместо безударного "о" и заглавная гласная
        "а на сталЕ стоял вкусный торт",
        # 3. Удвоение ударной гласной
        "а на сталее стоял вкусный торт",
        # 4. Разделение через дефис по слогам
        "а на ста-ле стоял вкусный торт",
        # 5. Имитация ударения через Ё (иногда модели читают её всегда ударной)
        "а на сто-льэ стоял вкусный торт",
        # 6. Отделение окончания
        "а на стол е стоял вкусный торт"
    ]
    
    for i, text in enumerate(tests):
        try:
            wav, _ = tts.synthesize(text=text, lang="ru", voice_style=style, total_steps=12, speed=1.15)
            tts.save_audio(wav, f"results/stole_test_{i+1}.wav")
            print(f"[{i+1}] Сохранено: {text}")
        except Exception as e:
            print(f"[{i+1}] Ошибка: {e}")

if __name__ == "__main__":
    main()
