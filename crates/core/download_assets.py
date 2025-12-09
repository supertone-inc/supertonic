import os
import urllib.request
import sys

BASE_URL = "https://huggingface.co/Supertone/supertonic/resolve/main"
ASSETS_DIR = "assets"

FILES = [
    "onnx/duration_predictor.onnx",
    "onnx/text_encoder.onnx",
    "onnx/vector_estimator.onnx",
    "onnx/vocoder.onnx",
    "onnx/unicode_indexer.json",
    "onnx/tts.json",
    "voice_styles/M1.json",
    "voice_styles/M2.json",
    "voice_styles/F1.json",
    "voice_styles/F2.json",
]

def download_file(url, path):
    print(f"Downloading {url} to {path}...")
    try:
        urllib.request.urlretrieve(url, path)
        print(f"Downloaded {path}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        # Don't exit, just continue to try others or report error
        pass

def main():
    if not os.path.exists(ASSETS_DIR):
        os.makedirs(ASSETS_DIR)

    for file_rel_path in FILES:
        url = f"{BASE_URL}/{file_rel_path}"
        local_path = os.path.join(ASSETS_DIR, file_rel_path)

        local_dir = os.path.dirname(local_path)
        if not os.path.exists(local_dir):
            os.makedirs(local_dir)

        if not os.path.exists(local_path):
            download_file(url, local_path)
        else:
            print(f"File {local_path} already exists, skipping.")

if __name__ == "__main__":
    main()
