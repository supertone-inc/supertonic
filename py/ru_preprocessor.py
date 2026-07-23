import re
from ruaccent import RUAccent
import pymorphy3
from num2words import num2words
class RussianTTSPreprocessor:
    """
    Нейросетевой орфоэпический препроцессор для подготовки русского текста к генерации в Supertonic TTS.
    Внедряет ML-акцентуацию с помощью библиотеки ruaccent.
    
    Архитектура обработки (Pipeline v2 — Audit-Driven):
    1. Раскрытие сокращений (т.д., руб., и др.)
    2. Очистка от markdown, иероглифов
    3. ML-акцентуация через ruaccent (контекстная, с омографами)
    4. Конвертация '+' → UPPERCASE гласная
    5. [NEW] Замена Ё→Е (Supertonic 3 не поддерживает ё в unicode_indexer)
    6. [NEW] Деакцентуация клитик (предлоги, частицы, союзы → lowercase)
    7. Финальная очистка пробелов
    """
    
    # Служебные слова русского языка, которые в естественной речи
    # произносятся безударно (проклитики и энклитики).
    # Их акцентуация создаёт эффект "чеканной" робото-речи.
    CLITICS = frozenset({
        # Предлоги
        'в', 'к', 'с', 'у', 'о', 'на', 'по', 'за', 'из', 'до', 'от', 'об',
        'во', 'ко', 'со', 'при', 'про', 'без', 'для', 'под', 'над', 'перед',
        # Союзы
        'и', 'а', 'но', 'да', 'то', 'что', 'как', 'или', 'ни',
        # Частицы
        'не', 'бы', 'же', 'ли', 'ведь', 'вот', 'уж', 'вон', 'ка', 'аж',
        # Местоимения-клитики (безударные формы)
        'я', 'мы', 'он', 'мне', 'его', 'её', 'их', 'ей', 'им', 'нас', 'вас',
        # Связки и вспомогательные
        'это', 'был', 'есть', 'так', 'уже', 'ещё', 'тут', 'там',
    })
    
    def __init__(self):
        print("[TTS Preprocessor] Инициализация нейросетевой модели ruaccent...")
        self.accentizer = RUAccent()
        # Загружаем модель для расстановки ударений. 'turbo3.1' - баланс скорости и качества
        # use_dictionary=True использует встроенные словари ruaccent
        # custom_dict исправляет системные ошибки ударений, выявленные при прослушивании
        from business_dict import BUSINESS_ACCENT_DICT
        self.accentizer.load(omograph_model_size='turbo3.1', use_dictionary=True, custom_dict=BUSINESS_ACCENT_DICT)
        
        print("[TTS Preprocessor] Инициализация морфологического анализатора...")
        self.morph = pymorphy3.MorphAnalyzer()
        print("[TTS Preprocessor] Модели успешно загружены.")

    def _deaccentuate_clitics(self, text: str) -> str:
        """
        Убирает ударения (uppercase гласные) у служебных слов.
        Это создаёт естественную просодию, где предлоги и частицы
        произносятся слитно с соседним словом, без паразитного акцента.
        
        Пример: 'нА столЕ' → 'на столЕ' (предлог 'на' теряет ударение)
        """
        words = text.split()
        result = []
        for word in words:
            # Проверяем, является ли слово в lowercase-форме клитикой
            word_lower = word.lower()
            # Убираем возможные trailing пунктуации для проверки
            word_clean = re.sub(r'[.,!?;:\-]+$', '', word_lower)
            
            if word_clean in self.CLITICS:
                # Превращаем всё слово в lowercase (убираем ударение),
                # но сохраняем первую заглавную если слово стоит в начале предложения
                if result:  # Не первое слово — просто lowercase
                    result.append(word.lower())
                else:
                    # Первое слово — сохраняем заглавную первую букву
                    lowered = word.lower()
                    result.append(lowered[0].upper() + lowered[1:] if len(lowered) > 1 else lowered.upper())
            else:
                result.append(word)
        
        return ' '.join(result)

    def _inflect_number(self, num_str: str, target_case: str) -> str:
        words = num_str.split()
        res = []
        for w in words:
            # Ручной фикс для "сто" в косвенных падежах
            if w == "сто" and target_case in ['gent', 'datv', 'ablt', 'loct']:
                res.append("ста")
                continue
            
            p = self.morph.parse(w)[0]
            try:
                inf = p.inflect({target_case})
                res.append(inf.word if inf else w)
            except:
                res.append(w)
        return " ".join(res)

    def _process_numbers(self, text: str) -> str:
        # Ищем числа с контекстом (предлог слева, существительное справа)
        # Например: "от 150000 рублей", "к 5 часам"
        def repl(m):
            prefix = m.group(1) # e.g. "от "
            num = int(m.group(2))
            suffix = m.group(3) # e.g. " рублей"
            
            target_case = 'nomn'
            
            if prefix:
                prep = prefix.strip().lower()
                if prep in ['от', 'до', 'из', 'у', 'без', 'для', 'около', 'с', 'около', 'более', 'менее']:
                    target_case = 'gent'
                elif prep in ['к', 'по']:
                    target_case = 'datv'
                elif prep in ['в', 'на', 'за', 'про', 'через']:
                    target_case = 'accs'
                elif prep in ['с', 'над', 'под', 'перед']:
                    target_case = 'ablt'
                elif prep in ['о', 'об', 'при']:
                    target_case = 'loct'
            
            if target_case == 'nomn' and suffix:
                suf_word = suffix.strip().lower()
                p = self.morph.parse(suf_word)[0]
                if p.tag.case:
                    target_case = p.tag.case
                    
            nom_str = num2words(num, lang='ru')
            if target_case != 'nomn':
                nom_str = self._inflect_number(nom_str, target_case)
                
            return (prefix or "") + nom_str + (suffix or "")

        return re.sub(r'([а-яА-ЯёЁ]+\s+)?\b(\d+)\b(\s+[а-яА-ЯёЁ]+)?', repl, text)

    def apply_rules(self, text: str) -> str:
        """
        Применяет ML-правила нормализации и орфоэпии ко всему тексту.
        Автоматически расставляет знак плюса '+' перед ударной гласной (формат Supertonic).
        """
        if not text:
            return ""
            
        # Обработка чисел перед ML-акцентуацией
        text = self._process_numbers(text)
        
        # Заменяем распространенные сокращения до обработки
        replacements = {
            r"\bт\.д\.": "так дАлее",
            r"\bт\.п\.": "тому подОбное",
            r"\bдр\.": "другИе",
            r"\bруб\.": "рублЕй",
            r"\bтыс\.": "тЫсяч",
            r"\bмлн\.": "миллиОнов",
            r"\bООО\b": "о-о-о",
            r"\bТК РФ\b": "тэ-к+а эр-+эф",
            r"\bТК\b": "тэ-к+а",
            r"\bРФ\b": "эр-+эф",
            r"\bHR\b": "эйч-+ар",
            r"\bIT\b": "айт+и",
            r"\bFrontend\b": "фронт+энд",
            r"\bBackend\b": "бэк+энд",
            r"\bMiddle\b": "м+идл",
            r"\bSenior\b": "сень+ор",
            r"\bJunior\b": "дж+униор",
        }
        for pattern, rep in replacements.items():
            text = re.sub(pattern, rep, text, flags=re.IGNORECASE)

        # Удаляем markdown-разметку, иероглифы и любые нестандартные символы
        # Оставляем только буквы, цифры и базовую пунктуацию
        text = re.sub(r'[^a-zA-Zа-яА-ЯёЁ0-9.,!?—\-\s"\'«»:;]', '', text)
        
        # Разговорная фонетика: заменяем книжные слова на их произносимые варианты
        phonetic_replacements = {
            r"\bсегодня\b": "севодня",
            r"\bСегодня\b": "Севодня",
            r"\bсегодняшний\b": "севодняшний",
            r"\bСегодняшний\b": "Севодняшний",
            r"\bпожалуйста\b": "пожалуста",
            r"\bПожалуйста\b": "Пожалуста",
            r"\bздравствуйте\b": "здраствуйте",
            r"\bЗдравствуйте\b": "Здраствуйте",
            r"\bздравствуй\b": "здраствуй",
            r"\bЗдравствуй\b": "Здраствуй",
            r"\bчувство\b": "чуство",
            r"\bЧувство\b": "Чуство",
            r"\bчувствовать\b": "чуствовать",
            r"\bЧувствовать\b": "Чуствовать",
        }
        for pattern, rep in phonetic_replacements.items():
            text = re.sub(pattern, rep, text)
            
        # [CRITICAL FIX] ruaccent не ставит ударения на слова с буквой Ё (возвращает без ударения).
        # Поэтому мы заменяем Ё на Е до передачи в ML-акцентуатор.
        text = text.replace('Ё', 'Е').replace('ё', 'е')
        
        # Запускаем ML-процессор
        # process_all() обрабатывает весь текст с учетом контекста
        processed = self.accentizer.process_all(text)
        
        # G2P (Истинная фонетическая транскрипция)
        # -тся / -ться -> ца
        processed = re.sub(r'тс\+?[яЯ]\b', 'ца', processed)
        processed = re.sub(r'тьс\+?[яЯ]\b', 'ца', processed)
        
        # -ого / -его -> ово / ево
        def ogo_replacer(match):
            word = match.group(0)
            word_lower = word.lower().replace('+', '')
            exceptions = {'много', 'немного', 'строго', 'итого', 'дорого', 'недорого', 'лого', 'педагого'}
            if word_lower in exceptions:
                return word
            return match.group(1) + match.group(2) + ('в' if match.group(3).lower() == 'г' else 'В') + match.group(4)

        processed = re.sub(r'\b([А-Яа-яЁё+]*?)([оеОЕ]\+?)([гГ])([оО])\b', ogo_replacer, processed)
        
        # что -> што
        processed = re.sub(r'\b([чЧ])(т\+?[оО])\b', lambda m: ('ш' if m.group(1) == 'ч' else 'Ш') + m.group(2), processed)
        processed = re.sub(r'\b([чЧ])(т\+?[оО]б)', lambda m: ('ш' if m.group(1) == 'ч' else 'Ш') + m.group(2), processed)
        
        # конечно -> конешно
        processed = re.sub(r'\b([кК]он\+?[еЕ]ч)(н\+?[оО])\b', lambda m: m.group(1)[:-1] + ('ш' if m.group(1)[-1] == 'ч' else 'Ш') + m.group(2), processed)
        processed = re.sub(r'\b([сС]к\+?[уУ]ч)(н\+?[оО])\b', lambda m: m.group(1)[:-1] + ('ш' if m.group(1)[-1] == 'ч' else 'Ш') + m.group(2), processed)
        
        # Паузы: преобразуем тире в запятые для дыхания
        processed = processed.replace(' — ', ', ')
        processed = processed.replace('...', ', ')

        # Конвертация знака '+' от ruaccent в UPPERCASE гласную
        # (за+мок -> зАмок). Supertonic различает lowercase/uppercase индексы.
        processed = re.sub(r'\+([а-яёА-ЯЁ])', lambda m: m.group(1).upper(), processed)
        
        # [CRITICAL FIX] На всякий случай заменяем Ё→Е еще раз, 
        # хотя они должны были быть заменены до вызова ruaccent.
        # Supertonic 3 не поддерживает букву Ё (unicode_indexer[0x451] == -1).
        # Если оставить Ё, модель получит unknown-символ и сгенерирует артефакт.
        processed = processed.replace('Ё', 'Е').replace('ё', 'е')
        
        # [PROSODY FIX] Деакцентуация клитик для естественной просодии.
        # ruaccent ставит ударения на ВСЕ слова, включая предлоги и частицы.
        # В естественной речи они безударны. Убираем uppercase у служебных слов.
        processed = self._deaccentuate_clitics(processed)
        
        # Очистка лишних пробелов
        processed = re.sub(r"\s+", " ", processed).strip()
        
        return processed

if __name__ == "__main__":
    prep = RussianTTSPreprocessor()
    test_cases = [
        "Я положил ключи на столе, а на столе стоял вкусный торт.",
        "Привет, Алиса! Как твои дела?",
        "Хорошо, давай поедем на велосипеде.",
        "Огромный замок закрыт на замок.",
        "Она принесла зелёный торт и своё красивое платье.",
        "Это очень сложная задача, но мы справимся за пять минут.",
        "Сколько стоит эта книга? А книга стоит на полке.",
        "У нас есть географический атлас. Это платье сшито из ткани атлас.",
        "Я плачу деньги за аренду. Я плачу от грусти.",
        "Позвоните мне, когда будете готовы.",
        "Добро пожаловать в наш магазин!",
        "Мы решили пойти в кино вечером.",
        "Она купила новое платье для вечеринки.",
    ]
    for case in test_cases:
        result = prep.apply_rules(case)
        has_yo = 'ё' in result or 'Ё' in result
        print(f"Вход:  {case}")
        print(f"Выход: {result}  {'⚠️ СОДЕРЖИТ Ё!' if has_yo else '✅'}")
        print("-" * 60)
