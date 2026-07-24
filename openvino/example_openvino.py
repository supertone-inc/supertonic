import argparse
import os
import subprocess
from pathlib import Path

import soundfile as sf

from helper import load_text_to_speech, timer, sanitize_filename, load_voice_style


# OpenVINO model names
MODEL_NAMES = [
    "duration_predictor",
    "text_encoder", 
    "vector_estimator",
    "vocoder",
]


def check_openvino_models_exist(model_dir: str) -> bool:
    """Check if all OpenVINO models exist in the directory."""
    model_path = Path(model_dir)
    for model_name in MODEL_NAMES:
        xml_path = model_path / f"{model_name}.xml"
        bin_path = model_path / f"{model_name}.bin"
        if not xml_path.exists() or not bin_path.exists():
            return False
    return True


def convert_onnx_to_openvino(onnx_dir: str, output_dir: str, use_fp16: bool = True) -> bool:
    """
    Convert ONNX models to OpenVINO IR format.
    
    Args:
        onnx_dir: Directory containing ONNX models
        output_dir: Output directory for OpenVINO models
        use_fp16: Whether to compress to FP16
        
    Returns:
        True if successful, False otherwise
    """
    onnx_path = Path(onnx_dir)
    output_path = Path(output_dir)
    
    # Check if ONNX models exist
    for model_name in MODEL_NAMES:
        if not (onnx_path / f"{model_name}.onnx").exists():
            print(f"ERROR: ONNX model not found: {onnx_path / f'{model_name}.onnx'}")
            print("Please ensure you have cloned the assets:")
            print("  git lfs install")
            print("  git clone https://huggingface.co/Supertone/supertonic-3 ../assets")
            return False
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"\n{'='*60}")
    print("Converting ONNX models to OpenVINO IR format...")
    print(f"{'='*60}")
    print(f"  Input:  {onnx_path}")
    print(f"  Output: {output_path}")
    print(f"  Precision: {'FP16' if use_fp16 else 'FP32'}")
    print()
    
    for model_name in MODEL_NAMES:
        onnx_file = onnx_path / f"{model_name}.onnx"
        output_model = output_path / model_name
        
        cmd = ["ovc", str(onnx_file), "--output_model", str(output_model)]
        if use_fp16:
            cmd.append("--compress_to_fp16")
        
        print(f"  Converting {model_name}...")
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
            
            if result.returncode != 0:
                print(f"  FAILED: {model_name}")
                print(f"    Error: {result.stderr[:200]}")
                return False
            
            # Verify output files
            xml_file = output_path / f"{model_name}.xml"
            bin_file = output_path / f"{model_name}.bin"
            if xml_file.exists() and bin_file.exists():
                xml_size = xml_file.stat().st_size / (1024 * 1024)
                bin_size = bin_file.stat().st_size / (1024 * 1024)
                print(f"  OK: {model_name} ({xml_size:.2f}MB + {bin_size:.2f}MB)")
            else:
                print(f"  FAILED: {model_name} (output files not created)")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"  FAILED: {model_name} (timeout)")
            return False
        except FileNotFoundError:
            print("ERROR: 'ovc' command not found.")
            print("Please ensure OpenVINO is installed: pip install openvino")
            return False
    
    print(f"\n{'='*60}")
    print("Conversion completed successfully!")
    print(f"{'='*60}\n")
    return True


def parse_args():
    parser = argparse.ArgumentParser(description="TTS Inference with OpenVINO")

    # Device settings
    parser.add_argument(
        "--device",
        type=str,
        default="CPU",
        help="OpenVINO device (CPU, GPU, AUTO, MULTI:CPU,GPU)",
    )
    parser.add_argument(
        "--force-fp32",
        action="store_true",
        help="Force FP32 precision on GPU for accuracy",
    )

    # Model settings
    parser.add_argument(
        "--model-dir",
        type=str,
        default="../assets/openvino",
        help="Path to OpenVINO model directory (.xml/.bin files)",
    )
    parser.add_argument(
        "--config-dir",
        type=str,
        default="../assets/onnx",
        help="Path to config directory (tts.json, unicode_indexer.json)",
    )

    # Synthesis parameters
    parser.add_argument(
        "--total-step", type=int, default=8, help="Number of denoising steps"
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
        default=["../assets/voice_styles/M1.json"],
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
        "--lang",
        type=str,
        nargs="+",
        default=["en"],
        help="Language(s) of the text(s). Can specify multiple languages for batch processing",
    )
    parser.add_argument(
        "--save-dir", type=str, default="results", help="Output directory"
    )
    
    # Conversion settings
    parser.add_argument(
        "--precision",
        type=str,
        choices=["fp16", "fp32"],
        default="fp16",
        help="Precision for model conversion (fp16 or fp32)",
    )
    parser.add_argument(
        "--skip-conversion",
        action="store_true",
        help="Skip automatic conversion even if models are missing",
    )

    return parser.parse_args()


print("=== TTS Inference with OpenVINO (Python) ===\n")

# --- 1. Parse arguments --- #
args = parse_args()
total_step = args.total_step
speed = args.speed
n_test = args.n_test
save_dir = args.save_dir
voice_style_paths = args.voice_style
text_list = args.text
lang_list = args.lang
batch = args.batch

assert len(voice_style_paths) == len(
    text_list
), f"Number of voice styles ({len(voice_style_paths)}) must match number of texts ({len(text_list)})"
bsz = len(voice_style_paths)

# --- 2. Check and convert models if needed --- #
if not check_openvino_models_exist(args.model_dir):
    if args.skip_conversion:
        print(f"ERROR: OpenVINO models not found in '{args.model_dir}'")
        print("Run without --skip-conversion to auto-convert, or convert manually:")
        print(f"  ovc {args.config_dir}/duration_predictor.onnx --output_model {args.model_dir}/duration_predictor --compress_to_fp16")
        exit(1)
    
    print(f"OpenVINO models not found in '{args.model_dir}'")
    print("Converting from ONNX models...")
    
    use_fp16 = args.precision == "fp16"
    if not convert_onnx_to_openvino(args.config_dir, args.model_dir, use_fp16):
        print("ERROR: Model conversion failed. Exiting.")
        exit(1)
else:
    print(f"OpenVINO models found in '{args.model_dir}'")

# --- 3. Load Text to Speech --- #
text_to_speech = load_text_to_speech(
    model_dir=args.model_dir,
    config_dir=args.config_dir,
    device=args.device,
    force_fp32_on_gpu=args.force_fp32,
)

# --- 4. Load Voice Style --- #
style = load_voice_style(voice_style_paths, verbose=True)

# --- 5. Synthesize Speech --- #
for n in range(n_test):
    print(f"\n[{n+1}/{n_test}] Starting synthesis...")
    with timer("Generating speech from text"):
        if batch:
            wav, duration = text_to_speech.batch(
                text_list, lang_list, style, total_step, speed
            )
        else:
            wav, duration = text_to_speech(
                text_list[0], lang_list[0], style, total_step, speed
            )
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    for b in range(bsz):
        fname = f"{sanitize_filename(text_list[b], 20)}_{n+1}.wav"
        w = wav[b, : int(text_to_speech.sample_rate * duration[b].item())]  # [T_trim]
        sf.write(os.path.join(save_dir, fname), w, text_to_speech.sample_rate)
        print(f"Saved: {save_dir}/{fname}")
print("\n=== Synthesis completed successfully! ===")
