from supertonic import TTS

# Note: First run downloads model automatically (~260MB)
tts = TTS(auto_download=True)

# Get a voice style
style = tts.get_voice_style(voice_name="M4")

# Generate speech
text = "This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."
wav, duration = tts.synthesize(text, voice_style=style)
# wav: np.ndarray, shape = (1, num_samples)
# duration: np.ndarray, shape = (1,)

# Save to file
tts.save_audio(wav, "results/example_pypi.wav")
print(f"Generated {duration[0]:.2f}s of audio")