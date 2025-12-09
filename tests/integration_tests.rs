use supertonic_tts::{load_text_to_speech, load_voice_style};
use std::path::PathBuf;

#[test]
fn test_load_components() {
    let onnx_dir = "assets/onnx";
    let style_path = "assets/voice_styles/M1.json";

    if !PathBuf::from(onnx_dir).exists() || !PathBuf::from(style_path).exists() {
        eprintln!("Assets not found, skipping integration test.");
        return;
    }

    match load_text_to_speech(onnx_dir, false) {
        Ok(_) => (),
        Err(e) => {
            panic!("Failed to load TTS components: {:?}", e);
        }
    }

    match load_voice_style(&vec![style_path.to_string()], false) {
        Ok(_) => (),
        Err(e) => {
            panic!("Failed to load voice style: {:?}", e);
        }
    }
}
