#!/usr/bin/env python3
"""Smoke-test a converted Supertonic 3 MLX model."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from supertonic_mlx import SupertonicMLX


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--text", default="This is a short Supertonic MLX test.")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--voice", default="M1")
    parser.add_argument("--total-step", type=int, default=4)
    parser.add_argument("--speed", type=float, default=1.05)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    tts = SupertonicMLX.from_pretrained(args.model)
    style = tts.get_voice_style(args.voice)
    wav, duration = tts.synthesize(
        args.text,
        args.lang,
        style,
        total_step=args.total_step,
        speed=args.speed,
        seed=args.seed,
    )
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    trimmed = wav[0, : int(tts.sample_rate * duration[0])]
    sf.write(out, trimmed, tts.sample_rate)
    print(
        {
            "output": str(out),
            "sample_rate": tts.sample_rate,
            "samples": int(trimmed.shape[0]),
            "duration": float(duration[0]),
            "peak": float(abs(trimmed).max()),
        }
    )


if __name__ == "__main__":
    main()
