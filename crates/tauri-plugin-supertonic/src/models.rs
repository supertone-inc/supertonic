use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingRequest {
  pub value: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
  pub value: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadEngineRequest {
    pub onnx_dir: Option<String>, // Path to folder containing assets, if provided (Desktop)
    // Alternatively, we could accept bytes directly from frontend if they are small enough,
    // but typically for models we want to read files.
    // For this plugin, we will try to resolve assets via Tauri's resource API if possible,
    // or expect absolute paths.
    // For simplicity given the "seamless" requirement:
    // We will ask for paths to the individual files, OR a directory.
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadVoiceRequest {
    pub voice_paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeakRequest {
    pub text: String,
    pub speed: Option<f32>,
    pub silence_duration: Option<f32>,
}
