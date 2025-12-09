use tauri::{AppHandle, Runtime, State};
use crate::models::*;
use crate::error::{Result, Error};
use crate::SupertonicState;
use supertonic_tts::{ModelBytes, load_text_to_speech_from_memory, load_voice_style_from_bytes};
use std::fs;
use std::path::PathBuf;

fn read_asset(path_str: &str) -> Result<Vec<u8>> {
    // If it's a raw path, try to read it
    // In Tauri v2 with bundled resources, we expect absolute paths to be resolved by the frontend
    // using `resolveResource` API and passed here.
    fs::read(path_str).map_err(Error::Io)
}

#[tauri::command]
pub async fn load_engine<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SupertonicState>,
    onnx_dir: String,
) -> Result<()> {
    let base_path = PathBuf::from(&onnx_dir);

    // We expect the standard naming convention in the dir
    let config_bytes = read_asset(base_path.join("tts.json").to_str().unwrap())?;
    let dp_bytes = read_asset(base_path.join("duration_predictor.onnx").to_str().unwrap())?;
    let text_enc_bytes = read_asset(base_path.join("text_encoder.onnx").to_str().unwrap())?;
    let vector_est_bytes = read_asset(base_path.join("vector_estimator.onnx").to_str().unwrap())?;
    let vocoder_bytes = read_asset(base_path.join("vocoder.onnx").to_str().unwrap())?;
    let unicode_indexer_bytes = read_asset(base_path.join("unicode_indexer.json").to_str().unwrap())?;

    let models = ModelBytes {
        config: &config_bytes,
        duration_predictor: &dp_bytes,
        text_encoder: &text_enc_bytes,
        vector_estimator: &vector_est_bytes,
        vocoder: &vocoder_bytes,
        unicode_indexer: &unicode_indexer_bytes,
    };

    let engine = load_text_to_speech_from_memory(models, false)
        .map_err(Error::Supertonic)?;

    *state.engine.lock().unwrap() = Some(engine);

    Ok(())
}

#[tauri::command]
pub async fn load_voice<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SupertonicState>,
    voice_paths: Vec<String>,
) -> Result<()> {
    let mut bytes_buffers = Vec::new();
    for path in &voice_paths {
        bytes_buffers.push(read_asset(path)?);
    }

    let mut byte_slices = Vec::new();
    for buf in &bytes_buffers {
        byte_slices.push(buf.as_slice());
    }

    let style = load_voice_style_from_bytes(&byte_slices, false)
        .map_err(Error::Supertonic)?;

    *state.style.lock().unwrap() = Some(style);

    Ok(())
}

#[tauri::command]
pub async fn speak<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SupertonicState>,
    text: String,
    speed: Option<f32>,
    silence_duration: Option<f32>,
) -> Result<Vec<f32>> {
    let mut engine_guard = state.engine.lock().unwrap();
    let engine = engine_guard.as_mut().ok_or(Error::State("Engine not loaded".to_string()))?;

    let style_guard = state.style.lock().unwrap();
    let style = style_guard.as_ref().ok_or(Error::State("Voice style not loaded".to_string()))?;

    let (audio, _dur) = engine.call(
        &text,
        style,
        10, // Default steps? usually 10-20
        speed.unwrap_or(1.0),
        silence_duration.unwrap_or(0.2)
    ).map_err(Error::Supertonic)?;

    Ok(audio)
}
