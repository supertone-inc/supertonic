#!/usr/bin/env python3
"""Compare Supertonic 3 MLX graph outputs against ONNX Runtime."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py"))

from helper import get_latent_mask  # noqa: E402
from supertonic_mlx import SupertonicMLX  # noqa: E402


def _stats(name: str, ref, test) -> dict:
    ref = np.array(ref)
    test = np.array(test)
    diff = np.abs(ref - test)
    return {
        "name": name,
        "shape": list(ref.shape),
        "max_abs": float(diff.max()),
        "mean_abs": float(diff.mean()),
        "ref_peak": float(np.abs(ref).max()),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--official", required=True, help="Official Supertone/supertonic-3 directory")
    parser.add_argument("--mlx", required=True, help="Converted MLX directory")
    parser.add_argument("--text", default="Hello from Supertonic MLX.")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--voice", default="M1")
    parser.add_argument("--total-step", type=int, default=2)
    parser.add_argument("--seed", type=int, default=123)
    args = parser.parse_args()

    official = Path(args.official)
    onnx_dir = official / "onnx"
    opts = ort.SessionOptions()
    providers = ["CPUExecutionProvider"]
    ort_models = {
        name: ort.InferenceSession(str(onnx_dir / f"{name}.onnx"), sess_options=opts, providers=providers)
        for name in ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"]
    }

    tts = SupertonicMLX.from_pretrained(args.mlx)
    style = tts.get_voice_style(args.voice)
    text_ids, text_mask = tts.text_processor([args.text], [args.lang])

    dur_ref = ort_models["duration_predictor"].run(
        None,
        {"text_ids": text_ids, "style_dp": style.dp, "text_mask": text_mask},
    )[0]
    dur_mlx = tts.duration_predictor(text_ids=text_ids, style_dp=style.dp, text_mask=text_mask)[0]
    print(_stats("duration", dur_ref, dur_mlx))

    text_ref = ort_models["text_encoder"].run(
        None,
        {"text_ids": text_ids, "style_ttl": style.ttl, "text_mask": text_mask},
    )[0]
    text_mlx = tts.text_encoder(text_ids=text_ids, style_ttl=style.ttl, text_mask=text_mask)[0]
    print(_stats("text_emb", text_ref, text_mlx))

    rng = np.random.RandomState(args.seed)
    duration = dur_ref / 1.05
    wav_lengths = (duration * tts.sample_rate).astype(np.int64)
    chunk_size = tts.base_chunk_size * tts.chunk_compress_factor
    latent_len = ((duration.max() * tts.sample_rate + chunk_size - 1) / chunk_size).astype(np.int32)
    latent_dim = tts.ldim * tts.chunk_compress_factor
    latent = rng.randn(1, latent_dim, latent_len).astype(np.float32)
    latent_mask = get_latent_mask(wav_lengths, tts.base_chunk_size, tts.chunk_compress_factor)
    latent = latent * latent_mask

    vector_inputs = {
        "noisy_latent": latent,
        "text_emb": text_ref,
        "style_ttl": style.ttl,
        "text_mask": text_mask,
        "latent_mask": latent_mask,
        "current_step": np.array([0], dtype=np.float32),
        "total_step": np.array([args.total_step], dtype=np.float32),
    }
    vector_ref = ort_models["vector_estimator"].run(None, vector_inputs)[0]
    vector_mlx = tts.vector_estimator(**vector_inputs)[0]
    print(_stats("vector_step0", vector_ref, vector_mlx))

    wav_ref = ort_models["vocoder"].run(None, {"latent": vector_ref})[0]
    wav_mlx = tts.vocoder(latent=vector_ref)[0]
    print(_stats("vocoder", wav_ref, wav_mlx))


if __name__ == "__main__":
    main()
