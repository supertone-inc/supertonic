import json
import os
import time
from contextlib import contextmanager
from typing import Optional
from unicodedata import normalize
import re
import numpy as np
import onnxruntime as ort
from onnx_utils import get_best_provider

class UnicodeProcessor:
    def __init__(self, unicode_indexer_path: str):
        with open(unicode_indexer_path, "r") as f:
            self.indexer = json.load(f)

    def _preprocess_text(self, text: str) -> str:
        text = normalize("NFKD", text)
        emoji_pattern = re.compile(
            "[\U0001f600-\U0001f64f"
            "\U0001f300-\U0001f5ff"
            "\U0001f680-\U0001f6ff"
            "\U0001f700-\U0001f77f"
            "\U0001f780-\U0001f7ff"
            "\U0001f800-\U0001f8ff"
            "\U0001f900-\U0001f9ff"
            "\U0001fa00-\U0001fa6f"
            "\U0001fa70-\U0001faff"
            "\u2600-\u26ff"
            "\u2700-\u27bf"
            "\U0001f1e6-\U0001f1ff]+",
            flags=re.UNICODE,
        )
        text = emoji_pattern.sub("", text)
        replacements = {
            "–": "-", "‑": "-", "—": "-", "¯": " ", "_": " ", "“": '"', "”": '"',
            "‘": "'", "’": "'", "´": "'", "`": "'", "[": " ", "]": " ", "|": " ",
            "/": " ", "#": " ", "→": " ", "←": " ",
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        text = re.sub(
            r"[\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u030a\u030b\u030c\u0327\u0328\u0329\u032a\u032b\u032c\u032d\u032e\u032f]",
            "", text
        )
        text = re.sub(r"[♥☆♡©\\]", "", text)
        expr_replacements = {"@": " at ", "e.g.,": "for example, ", "i.e.,": "that is, "}
        for k, v in expr_replacements.items():
            text = text.replace(k, v)
        text = re.sub(r" ,", ",", text)
        text = re.sub(r" \.", ".", text)
        text = re.sub(r" !", "!", text)
        text = re.sub(r" \?", "?", text)
        text = re.sub(r" ;", ";", text)
        text = re.sub(r" :", ":", text)
        text = re.sub(r" '", "'", text)
        while '""' in text:
            text = text.replace('""', '"')
        while "''" in text:
            text = text.replace("''", "'")
        while "``" in text:
            text = text.replace("``", "`")
        text = re.sub(r"\s+", " ", text).strip()
        if not re.search(r"[.!?;,:'\"')\]}…。」』】〉》›»]$", text):
            text += "."
        return text

    def _get_text_mask(self, text_ids_lengths: np.ndarray) -> np.ndarray:
        return length_to_mask(text_ids_lengths)

    def _text_to_unicode_values(self, text: str) -> np.ndarray:
        return np.array([ord(char) for char in text], dtype=np.uint16)

    def __call__(self, text_list: list[str]) -> tuple[np.ndarray, np.ndarray]:
        text_list = [self._preprocess_text(t) for t in text_list]
        text_ids_lengths = np.array([len(text) for text in text_list], dtype=np.int64)
        text_ids = np.zeros((len(text_list), text_ids_lengths.max()), dtype=np.int64)
        for i, text in enumerate(text_list):
            unicode_vals = self._text_to_unicode_values(text)
            text_ids[i, : len(unicode_vals)] = np.array(
                [self.indexer[val] for val in unicode_vals], dtype=np.int64
            )
        text_mask = self._get_text_mask(text_ids_lengths)
        return text_ids, text_mask

class Style:
    def __init__(self, style_ttl_onnx: np.ndarray, style_dp_onnx: np.ndarray):
        self.ttl = style_ttl_onnx
        self.dp = style_dp_onnx

class TextToSpeech:
    def __init__(
        self,
        cfgs: dict,
        text_processor: UnicodeProcessor,
        dp_ort: ort.InferenceSession,
        text_enc_ort: ort.InferenceSession,
        vector_est_ort: ort.InferenceSession,
        vocoder_ort: ort.InferenceSession,
    ):
        self.cfgs = cfgs
        self.text_processor = text_processor
        self.dp_ort = dp_ort
        self.text_enc_ort = text_enc_ort
        self.vector_est_ort = vector_est_ort
        self.vocoder_ort = vocoder_ort
        self.sample_rate = cfgs["ae"]["sample_rate"]
        self.base_chunk_size = cfgs["ae"]["base_chunk_size"]
        self.chunk_compress_factor = cfgs["ttl"]["chunk_compress_factor"]
        self.ldim = cfgs["ttl"]["latent_dim"]

    def sample_noisy_latent(self, duration: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        bsz = len(duration)
        wav_len_max = duration.max() * self.sample_rate
        wav_lengths = (duration * self.sample_rate).astype(np.int64)
        chunk_size = self.base_chunk_size * self.chunk_compress_factor
        latent_len = ((wav_len_max + chunk_size - 1) / chunk_size).astype(np.int32)
        latent_dim = self.ldim * self.chunk_compress_factor
        noisy_latent = np.random.randn(bsz, latent_dim, latent_len).astype(np.float32)
        latent_mask = get_latent_mask(wav_lengths, self.base_chunk_size, self.chunk_compress_factor)
        noisy_latent = noisy_latent * latent_mask
        return noisy_latent, latent_mask

    def _infer(self, text_list: list[str], style: Style, total_step: int, speed: float = 1.05) -> tuple[np.ndarray, np.ndarray]:
        assert len(text_list) == style.ttl.shape[0], "Number of texts must match number of style vectors"
        bsz = len(text_list)
        text_ids, text_mask = self.text_processor(text_list)
        dur_onnx, *_ = self.dp_ort.run(None, {"text_ids": text_ids, "style_dp": style.dp, "text_mask": text_mask})
        dur_onnx = dur_onnx / speed
        text_emb_onnx, *_ = self.text_enc_ort.run(None, {"text_ids": text_ids, "style_ttl": style.ttl, "text_mask": text_mask})
        xt, latent_mask = self.sample_noisy_latent(dur_onnx)
        total_step_np = np.array([total_step] * bsz, dtype=np.float32)
        for step in range(total_step):
            current_step = np.array([step] * bsz, dtype=np.float32)
            xt, *_ = self.vector_est_ort.run(
                None,
                {
                    "noisy_latent": xt, "text_emb": text_emb_onnx, "style_ttl": style.ttl,
                    "text_mask": text_mask, "latent_mask": latent_mask,
                    "current_step": current_step, "total_step": total_step_np,
                },
            )
        wav, *_ = self.vocoder_ort.run(None, {"latent": xt})
        return wav, dur_onnx

    def __call__(self, text: str, style: Style, total_step: int, speed: float = 1.05, silence_duration: float = 0.3) -> tuple[np.ndarray, np.ndarray]:
        assert style.ttl.shape[0] == 1, "Single speaker text to speech only supports single style"
        text_list = chunk_text(text)
        wav_cat, dur_cat = None, None
        for text_chunk in text_list:
            wav, dur_onnx = self._infer([text_chunk], style, total_step, speed)
            if wav_cat is None:
                wav_cat, dur_cat = wav, dur_onnx
            else:
                silence = np.zeros((1, int(silence_duration * self.sample_rate)), dtype=np.float32)
                wav_cat = np.concatenate([wav_cat, silence, wav], axis=1)
                dur_cat += dur_onnx + silence_duration
        return wav_cat, dur_cat

    def batch(self, text_list: list[str], style: Style, total_step: int, speed: float = 1.05) -> tuple[np.ndarray, np.ndarray]:
        return self._infer(text_list, style, total_step, speed)

def length_to_mask(lengths: np.ndarray, max_len: Optional[int] = None) -> np.ndarray:
    max_len = max_len or lengths.max()
    ids = np.arange(0, max_len)
    mask = (ids < np.expand_dims(lengths, axis=1)).astype(np.float32)
    return mask.reshape(-1, 1, max_len)

def get_latent_mask(wav_lengths: np.ndarray, base_chunk_size: int, chunk_compress_factor: int) -> np.ndarray:
    latent_size = base_chunk_size * chunk_compress_factor
    latent_lengths = (wav_lengths + latent_size - 1) // latent_size
    return length_to_mask(latent_lengths)

def load_onnx(onnx_path: str, opts: ort.SessionOptions, providers: list[str]) -> ort.InferenceSession:
    return ort.InferenceSession(onnx_path, sess_options=opts, providers=providers)

def load_onnx_all(onnx_dir: str, opts: ort.SessionOptions, providers: list[str]) -> tuple[ort.InferenceSession, ort.InferenceSession, ort.InferenceSession, ort.InferenceSession]:
    dp_onnx_path = os.path.join(onnx_dir, "duration_predictor.onnx")
    text_enc_onnx_path = os.path.join(onnx_dir, "text_encoder.onnx")
    vector_est_onnx_path = os.path.join(onnx_dir, "vector_estimator.onnx")
    vocoder_onnx_path = os.path.join(onnx_dir, "vocoder.onnx")
    dp_ort = load_onnx(dp_onnx_path, opts, providers)
    text_enc_ort = load_onnx(text_enc_onnx_path, opts, providers)
    vector_est_ort = load_onnx(vector_est_onnx_path, opts, providers)
    vocoder_ort = load_onnx(vocoder_onnx_path, opts, providers)
    return dp_ort, text_enc_ort, vector_est_ort, vocoder_ort

def load_cfgs(onnx_dir: str) -> dict:
    cfg_path = os.path.join(onnx_dir, "tts.json")
    with open(cfg_path, "r") as f:
        return json.load(f)

def load_text_processor(onnx_dir: str) -> UnicodeProcessor:
    unicode_indexer_path = os.path.join(onnx_dir, "unicode_indexer.json")
    return UnicodeProcessor(unicode_indexer_path)

def load_text_to_speech(onnx_dir: str, use_gpu: bool = True) -> TextToSpeech:
    opts = ort.SessionOptions()
    opts.log_severity_level = 3
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    providers = get_best_provider(use_gpu)
    cfgs = load_cfgs(onnx_dir)
    dp_ort, text_enc_ort, vector_est_ort, vocoder_ort = load_onnx_all(onnx_dir, opts, providers)
    text_processor = load_text_processor(onnx_dir)
    return TextToSpeech(cfgs, text_processor, dp_ort, text_enc_ort, vector_est_ort, vocoder_ort)

def load_voice_style(voice_style_paths: list[str], verbose: bool = False) -> Style:
    bsz = len(voice_style_paths)
    with open(voice_style_paths[0], "r") as f:
        first_style = json.load(f)
    ttl_dims = first_style["style_ttl"]["dims"]
    dp_dims = first_style["style_dp"]["dims"]
    ttl_style = np.zeros([bsz, ttl_dims[1], ttl_dims[2]], dtype=np.float32)
    dp_style = np.zeros([bsz, dp_dims[1], dp_dims[2]], dtype=np.float32)
    for i, voice_style_path in enumerate(voice_style_paths):
        with open(voice_style_path, "r") as f:
            voice_style = json.load(f)
        ttl_data = np.array(voice_style["style_ttl"]["data"], dtype=np.float32).flatten()
        ttl_style[i] = ttl_data.reshape(ttl_dims[1], ttl_dims[2])
        dp_data = np.array(voice_style["style_dp"]["data"], dtype=np.float32).flatten()
        dp_style[i] = dp_data.reshape(dp_dims[1], dp_dims[2])
    if verbose:
        print(f"Loaded {bsz} voice styles")
    return Style(ttl_style, dp_style)

@contextmanager
def timer(name: str):
    start = time.time()
    print(f"{name}...")
    yield
    print(f"  -> {name} completed in {time.time() - start:.2f} sec")

def sanitize_filename(text: str, max_len: int) -> str:
    prefix = text[:max_len]
    return re.sub(r"[^a-zA-Z0-9]", "_", prefix)

def chunk_text(text: str, max_len: int = 300) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text.strip()) if p.strip()]
    chunks = []
    for paragraph in paragraphs:
        if not paragraph:
            continue
        pattern = r"(?<!Mr\.)(?<!Mrs\.)(?<!Ms\.)(?<!Dr\.)(?<!Prof\.)(?<!Sr\.)(?<!Jr\.)(?<!Ph\.D\.)(?<!etc\.)(?<!e\.g\.)(?<!i\.e\.)(?<!vs\.)(?<!Inc\.)(?<!Ltd\.)(?<!Co\.)(?<!Corp\.)(?<!St\.)(?<!Ave\.)(?<!Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+"
        sentences = re.split(pattern, paragraph)
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 <= max_len:
                current_chunk += (" " if current_chunk else "") + sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        if current_chunk:
            chunks.append(current_chunk.strip())
    return chunks
