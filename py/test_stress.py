import os
from supertonic import TTS

def main():
    os.makedirs("results", exist_ok=True)
    tts = TTS(auto_download=False)
    style = tts.get_voice_style(voice_name="M1")
    
    # Мы тестируем слово "замок", у которого два разных ударения (зАмок и замОк)
    # Попробуем 4 способа форсировать ударение
    texts = [
        "Тест один, заглавная буква. Я купил огромный зАмок. Дверь закрыта на замОк.",
        "Тест два, знак плюса. Я купил огромный за+мок. Дверь закрыта на зам+ок.",
        "Тест три, акут. Я купил огромный за́мок. Дверь закрыта на замо́к.",
        "Тест четыре, удвоение гласной. Я купил огромный заамок. Дверь закрыта на замоок."
    ]
    
    for i, text in enumerate(texts):
        print(f"Тестируем: {text}")
        try:
            wav, dur = tts.synthesize(text=text, lang="ru", voice_style=style, total_steps=10, speed=1.1)
            tts.save_audio(wav, f"results/stress_test_{i+1}.wav")
            print(f"Сохранено stress_test_{i+1}.wav")
        except Exception as e:
            print(f"Ошибка в тесте {i+1}: {e}")

if __name__ == "__main__":
    main()
