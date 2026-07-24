#!/usr/bin/env python3
"""Run Supertonic 3 MLX inference."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from supertonic_mlx import SupertonicMLX
from supertonic_mlx.tts import timer


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Converted MLX model directory")
    parser.add_argument("--text", default="Supertonic 3 is running with MLX.")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--voice", default="M1")
    parser.add_argument("--voice-style", default=None)
    parser.add_argument("--total-step", type=int, default=8)
    parser.add_argument("--speed", type=float, default=1.05)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with timer("load"):
        tts = SupertonicMLX.from_pretrained(args.model)
        style = tts.load_voice_style(args.voice_style) if args.voice_style else tts.get_voice_style(args.voice)
    with timer("generate"):
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
    sf.write(out, wav[0, : int(tts.sample_rate * duration[0])], tts.sample_rate)
    print({"output": str(out), "sample_rate": tts.sample_rate, "duration": float(duration[0])})


if __name__ == "__main__":
    main()
