import os
import sys
import soundfile as sf
from mcp.server.fastmcp import FastMCP
from helper import load_text_to_speech, load_voice_style, sanitize_filename

# Initialize FastMCP server
mcp = FastMCP("Supertonic TTS")

# Resolve paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_DIR = os.path.join(BASE_DIR, "assets", "onnx")
SAVE_DIR = os.path.join(BASE_DIR, "results")

USE_GPU = False

# Log to stderr to avoid breaking MCP protocol (which uses stdout)
print("Loading TTS model...", file=sys.stderr)
text_to_speech = load_text_to_speech(ONNX_DIR, use_gpu=USE_GPU)
print("TTS model loaded.", file=sys.stderr)

import threading

@mcp.tool()
def speak(text: str, voice: str = "F2", speed: float = 1.0) -> str:
    """
    Synthesize speech from text using a specific voice style.
    
    Args:
        text: The text to synthesize.
        voice: The voice style to use (e.g., "F1", "F2", "M1", "M2"). Defaults to "F2".
        speed: The speed of the speech. 1.0 is normal, higher is faster. Defaults to 1.0.
        
    Returns:
        The absolute path to the generated audio file.
    """
    # construct voice path
    voice_path = os.path.join(BASE_DIR, "assets", "voice_styles", f"{voice}.json")
    if not os.path.exists(voice_path):
        # fallback or error? Let's try to find it if user just passed a name
        # If user passed "F2", we look for assets/voice_styles/F2.json
        # If user passed full path, we use it.
        if os.path.exists(voice):
             voice_path = voice
        else:
            return f"Error: Voice style '{voice}' not found at {voice_path}"

    try:
        # Load voice style
        style = load_voice_style([voice_path])

        # Default total_step to 25 as per example_onnx.py
        total_step = 25

        # Save to file
        if not os.path.exists(SAVE_DIR):
            os.makedirs(SAVE_DIR)
            
        # Clean filename
        filename = f"{sanitize_filename(text, 20)}_{voice}.wav"
        filepath = os.path.abspath(os.path.join(SAVE_DIR, filename))
        
        print(f"Starting synthesis stream to {filepath}", file=sys.stderr)
        
        def generate_audio_background():
            try:
                with sf.SoundFile(filepath, 'w', samplerate=text_to_speech.sample_rate, channels=1) as f:
                    # Use the streaming generator
                    for wav_chunk, duration_chunk in text_to_speech.stream(text, style, total_step, speed):
                         # wav_chunk is (B, T) or (1, T). We need (T, channels) or just (T,)
                         if wav_chunk.ndim == 2:
                             # shape (1, T) -> (T,)
                             audio_data = wav_chunk[0]
                         else:
                             audio_data = wav_chunk
                             
                         f.write(audio_data)
                         f.flush() # Ensure data is written to disk for the player to see
                print(f"Finished synthesis for {filepath}", file=sys.stderr)
            except Exception as e:
                print(f"Error in background generation: {e}", file=sys.stderr)

        # Start background thread
        thread = threading.Thread(target=generate_audio_background)
        thread.start()
                 
        return f"Audio generated at: {filepath}"

    except Exception as e:
        return f"Error generating speech: {str(e)}"

if __name__ == "__main__":
    mcp.run()

