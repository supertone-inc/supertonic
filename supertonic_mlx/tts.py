"""Supertonic 3 inference with MLX graph assets."""

from __future__ import annotations

import json
import re
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Optional
from unicodedata import normalize

import mlx.core as mx
import numpy as np

from supertonic_mlx.onnx_graph import MLXGraph


AVAILABLE_LANGS = [
    "en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi",
    "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro",
    "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na",
]


class UnicodeProcessor:
    def __init__(self, unicode_indexer_path: str | Path):
        with open(unicode_indexer_path, encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, list):
            self.indexer = {i: int(v) for i, v in enumerate(raw)}
        else:
            self.indexer = {int(k): int(v) for k, v in raw.items()}

    def _preprocess_text(self, text: str, lang: str) -> str:
        text = normalize("NFKD", text)
        emoji_pattern = re.compile(
            "[\U0001f600-\U0001f64f\U0001f300-\U0001f5ff\U0001f680-\U0001f6ff"
            "\U0001f700-\U0001f77f\U0001f780-\U0001f7ff\U0001f800-\U0001f8ff"
            "\U0001f900-\U0001f9ff\U0001fa00-\U0001fa6f\U0001fa70-\U0001faff"
            "\u2600-\u26ff\u2700-\u27bf\U0001f1e6-\U0001f1ff]+",
            flags=re.UNICODE,
        )
        text = emoji_pattern.sub("", text)
        replacements = {
            "–": "-",
            "‑": "-",
            "—": "-",
            "_": " ",
            "\u201c": '"',
            "\u201d": '"',
            "\u2018": "'",
            "\u2019": "'",
            "´": "'",
            "`": "'",
            "[": " ",
            "]": " ",
            "|": " ",
            "/": " ",
            "#": " ",
            "→": " ",
            "←": " ",
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        text = re.sub(r"[♥☆♡©\\]", "", text)
        for k, v in {"@": " at ", "e.g.,": "for example, ", "i.e.,": "that is, "}.items():
            text = text.replace(k, v)
        for pat, repl in [
            (r" ,", ","), (r" \.", "."), (r" !", "!"), (r" \?", "?"),
            (r" ;", ";"), (r" :", ":"), (r" '", "'"),
        ]:
            text = re.sub(pat, repl, text)
        while '""' in text:
            text = text.replace('""', '"')
        while "''" in text:
            text = text.replace("''", "'")
        while "``" in text:
            text = text.replace("``", "`")
        text = re.sub(r"\s+", " ", text).strip()
        if not re.search(r"[.!?;:,'\"')\]}…。」』】〉》›»]$", text):
            text += "."
        if lang not in AVAILABLE_LANGS:
            raise ValueError(f"Invalid language: {lang}")
        return f"<{lang}>{text}</{lang}>"

    def __call__(self, text_list: list[str], lang_list: list[str]) -> tuple[np.ndarray, np.ndarray]:
        text_list = [self._preprocess_text(t, lang) for t, lang in zip(text_list, lang_list)]
        lengths = np.array([len(text) for text in text_list], dtype=np.int64)
        text_ids = np.zeros((len(text_list), lengths.max()), dtype=np.int64)
        for i, text in enumerate(text_list):
            ids = [self.indexer[ord(char)] for char in text]
            text_ids[i, : len(ids)] = np.array(ids, dtype=np.int64)
        return text_ids, length_to_mask(lengths)


@dataclass
class Style:
    ttl: np.ndarray
    dp: np.ndarray


class SupertonicMLX:
    def __init__(self, model_dir: str | Path):
        self.model_dir = Path(model_dir)
        with open(self.model_dir / "tts.json", encoding="utf-8") as f:
            self.cfgs = json.load(f)
        self.text_processor = UnicodeProcessor(self.model_dir / "unicode_indexer.json")
        self.duration_predictor = self._load_graph("duration_predictor")
        self.text_encoder = self._load_graph("text_encoder")
        self.vector_estimator = self._load_graph("vector_estimator")
        self.vocoder = self._load_graph("vocoder")
        self.sample_rate = int(self.cfgs["ae"]["sample_rate"])
        self.base_chunk_size = int(self.cfgs["ae"]["base_chunk_size"])
        self.chunk_compress_factor = int(self.cfgs["ttl"]["chunk_compress_factor"])
        self.ldim = int(self.cfgs["ttl"]["latent_dim"])

    def _load_graph(self, name: str) -> MLXGraph:
        return MLXGraph(self.model_dir / "graphs" / f"{name}.json", self.model_dir / "weights" / f"{name}.npz")

    @classmethod
    def from_pretrained(cls, model_dir: str | Path) -> "SupertonicMLX":
        return cls(model_dir)

    def load_voice_style(self, voice: str | Path | list[str | Path]) -> Style:
        paths = [voice] if isinstance(voice, (str, Path)) else voice
        first = json.load(open(paths[0], encoding="utf-8"))
        ttl_dims = first["style_ttl"]["dims"]
        dp_dims = first["style_dp"]["dims"]
        ttl = np.zeros([len(paths), ttl_dims[1], ttl_dims[2]], dtype=np.float32)
        dp = np.zeros([len(paths), dp_dims[1], dp_dims[2]], dtype=np.float32)
        for i, path in enumerate(paths):
            data = json.load(open(path, encoding="utf-8"))
            ttl[i] = np.array(data["style_ttl"]["data"], dtype=np.float32).reshape(ttl_dims[1], ttl_dims[2])
            dp[i] = np.array(data["style_dp"]["data"], dtype=np.float32).reshape(dp_dims[1], dp_dims[2])
        return Style(ttl=ttl, dp=dp)

    def get_voice_style(self, voice_name: str = "M1") -> Style:
        return self.load_voice_style(self.model_dir / "voice_styles" / f"{voice_name}.json")

    def sample_noisy_latent(self, duration: np.ndarray, seed: Optional[int] = None) -> tuple[np.ndarray, np.ndarray]:
        rng = np.random.default_rng(seed)
        bsz = len(duration)
        wav_len_max = duration.max() * self.sample_rate
        wav_lengths = (duration * self.sample_rate).astype(np.int64)
        chunk_size = self.base_chunk_size * self.chunk_compress_factor
        latent_len = ((wav_len_max + chunk_size - 1) / chunk_size).astype(np.int32)
        latent_dim = self.ldim * self.chunk_compress_factor
        noisy_latent = rng.standard_normal((bsz, latent_dim, latent_len)).astype(np.float32)
        latent_mask = get_latent_mask(wav_lengths, self.base_chunk_size, self.chunk_compress_factor)
        return noisy_latent * latent_mask, latent_mask

    def _infer(
        self,
        text_list: list[str],
        lang_list: list[str],
        style: Style,
        total_step: int,
        speed: float = 1.05,
        seed: Optional[int] = None,
    ) -> tuple[np.ndarray, np.ndarray]:
        text_ids, text_mask = self.text_processor(text_list, lang_list)
        dur = np.array(
            self.duration_predictor(text_ids=text_ids, style_dp=style.dp, text_mask=text_mask)[0],
            dtype=np.float32,
        )
        dur = dur / speed
        text_emb = self.text_encoder(text_ids=text_ids, style_ttl=style.ttl, text_mask=text_mask)[0]
        xt, latent_mask = self.sample_noisy_latent(dur, seed=seed)
        bsz = len(text_list)
        total_step_np = np.array([total_step] * bsz, dtype=np.float32)
        for step in range(total_step):
            current_step = np.array([step] * bsz, dtype=np.float32)
            xt = self.vector_estimator(
                noisy_latent=xt,
                text_emb=text_emb,
                style_ttl=style.ttl,
                text_mask=text_mask,
                latent_mask=latent_mask,
                current_step=current_step,
                total_step=total_step_np,
            )[0]
            mx.eval(xt)
        wav = self.vocoder(latent=xt)[0]
        return np.array(wav, dtype=np.float32), dur

    def synthesize(
        self,
        text: str,
        lang: str,
        voice_style: Style,
        total_step: int = 8,
        speed: float = 1.05,
        seed: Optional[int] = None,
        silence_duration: float = 0.3,
    ) -> tuple[np.ndarray, np.ndarray]:
        if voice_style.ttl.shape[0] != 1:
            raise ValueError("Single-text synthesis requires a single voice style")
        max_len = 120 if lang in ("ko", "ja") else 300
        wav_cat = None
        dur_cat = None
        for i, chunk in enumerate(chunk_text(text, max_len=max_len)):
            wav, dur = self._infer([chunk], [lang], voice_style, total_step, speed, None if seed is None else seed + i)
            if wav_cat is None:
                wav_cat = wav
                dur_cat = dur
            else:
                silence = np.zeros((1, int(silence_duration * self.sample_rate)), dtype=np.float32)
                wav_cat = np.concatenate([wav_cat, silence, wav], axis=1)
                dur_cat += dur + silence_duration
        assert wav_cat is not None and dur_cat is not None
        return wav_cat, dur_cat

    def batch(
        self,
        text_list: list[str],
        lang_list: list[str],
        voice_style: Style,
        total_step: int = 8,
        speed: float = 1.05,
        seed: Optional[int] = None,
    ) -> tuple[np.ndarray, np.ndarray]:
        return self._infer(text_list, lang_list, voice_style, total_step, speed, seed)


def length_to_mask(lengths: np.ndarray, max_len: Optional[int] = None) -> np.ndarray:
    max_len = int(max_len or lengths.max())
    ids = np.arange(0, max_len)
    mask = (ids < np.expand_dims(lengths, axis=1)).astype(np.float32)
    return mask.reshape(-1, 1, max_len)


def get_latent_mask(wav_lengths: np.ndarray, base_chunk_size: int, chunk_compress_factor: int) -> np.ndarray:
    latent_size = base_chunk_size * chunk_compress_factor
    latent_lengths = (wav_lengths + latent_size - 1) // latent_size
    return length_to_mask(latent_lengths)


def chunk_text(text: str, max_len: int = 300) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text.strip()) if p.strip()]
    chunks = []
    for paragraph in paragraphs:
        pattern = r"(?<!Mr\.)(?<!Mrs\.)(?<!Ms\.)(?<!Dr\.)(?<!Prof\.)(?<!Sr\.)(?<!Jr\.)(?<!Ph\.D\.)(?<!etc\.)(?<!e\.g\.)(?<!i\.e\.)(?<!vs\.)(?<!Inc\.)(?<!Ltd\.)(?<!Co\.)(?<!Corp\.)(?<!St\.)(?<!Ave\.)(?<!Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+"
        current = ""
        for sentence in re.split(pattern, paragraph):
            if len(current) + len(sentence) + 1 <= max_len:
                current += (" " if current else "") + sentence
            else:
                if current:
                    chunks.append(current.strip())
                current = sentence
        if current:
            chunks.append(current.strip())
    return chunks or [text]


@contextmanager
def timer(label: str):
    start = perf_counter()
    yield
    print(f"{label}: {perf_counter() - start:.3f}s")
