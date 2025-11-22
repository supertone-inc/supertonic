import argparse
import os

import soundfile as sf

from helper import load_text_to_speech, timer, sanitize_filename, load_voice_style


def parse_args():
    parser = argparse.ArgumentParser(description="TTS Inference with ONNX")

    # Device settings
    parser.add_argument(
        "--use-gpu", action="store_true", help="Use GPU for inference (default: CPU)"
    )

    # Model settings
    parser.add_argument(
        "--onnx-dir",
        type=str,
        default="assets/onnx",
        help="Path to ONNX model directory",
    )

    # Synthesis parameters
    parser.add_argument(
        "--total-step", type=int, default=5, help="Number of denoising steps"
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.05,
        help="Speech speed (default: 1.05, higher = faster)",
    )
    parser.add_argument(
        "--n-test", type=int, default=4, help="Number of times to generate"
    )

    # Batch processing
    parser.add_argument("--batch", action="store_true", help="Batch processing")

    # Input/Output
    parser.add_argument(
        "--voice-style",
        type=str,
        nargs="+",
        default=["assets/voice_styles/M1.json"],
        help="Voice style file path(s). Can specify multiple files for batch processing",
    )
    parser.add_argument(
        "--text",
        type=str,
        nargs="+",
        default=[
            "This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."
        ],
        help="Text(s) to synthesize. Can specify multiple texts for batch processing",
    )
    parser.add_argument(
        "--save-dir", type=str, default="results", help="Output directory"
    )

    parser.add_argument(
        "--from-file",
        type=str,
        default="py/sample.txt",
        help="Generate from the file"
    )
    
    return parser.parse_args()


print("=== TTS Inference with ONNX Runtime (Python) ===\n")

# --- 1. Parse arguments --- #
args = parse_args()
total_step = args.total_step
speed = args.speed
n_test = args.n_test
save_dir = args.save_dir
voice_style_paths = args.voice_style
text_list = args.text
batch = args.batch

assert len(voice_style_paths) == len(
    text_list
), f"Number of voice styles ({len(voice_style_paths)}) must match number of texts ({len(text_list)})"
bsz = len(voice_style_paths)

# --- 2. Load Text to Speech --- #
text_to_speech = load_text_to_speech(args.onnx_dir, args.use_gpu)

# --- 3. Load Voice Style --- #
style = load_voice_style(voice_style_paths, verbose=True)

# --- 4. Synthesize Speech --- #
for n in range(n_test):
    print(f"\n[{n+1}/{n_test}] Starting synthesis...")
    with timer("Generating speech from text"):
        if batch:
            wav, duration = text_to_speech.batch(text_list, style, total_step, speed)
        else:
            wav, duration = text_to_speech(text_list[0], style, total_step, speed)
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    for b in range(bsz):
        fname = f"{sanitize_filename(text_list[b], 20)}_{n+1}.wav"
        w = wav[b, : int(text_to_speech.sample_rate * duration[b].item())]  # [T_trim]
        sf.write(os.path.join(save_dir, fname), w, text_to_speech.sample_rate)
        print(f"Saved: {save_dir}/{fname}")


try:
    with open(args.from_file, "r") as sample_file:
        with timer("Generating from file"):
            wav, duration = text_to_speech(sample_file.read(), style, total_step, speed)
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
        for b in range(bsz):
            fname = f"short_story_sample.txt.wav"
            w = wav[b, : int(text_to_speech.sample_rate * duration[b].item())]  # [T_trim]
            sf.write(os.path.join(save_dir, fname), w, text_to_speech.sample_rate)
            print(f"Saved: {save_dir}/{fname}")
except FileNotFoundError:
    print(f"Error: File not found {args.from_file}")

print("\n=== Synthesis completed successfully! ===")
