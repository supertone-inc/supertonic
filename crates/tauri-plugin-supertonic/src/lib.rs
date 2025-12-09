use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
  State,
  AppHandle,
};
use std::sync::Mutex;
use supertonic_tts::{TextToSpeech, Style, ModelBytes, load_text_to_speech_from_memory, load_voice_style_from_bytes};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use std::fs;

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Result, Error};

struct SupertonicState {
    engine: Mutex<Option<TextToSpeech>>,
    style: Mutex<Option<Style>>,
}

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the supertonic plugin.
pub trait SupertonicExt<R: Runtime> {
  fn supertonic(&self) -> &Supertonic<R>;
}

impl<R: Runtime, T: Manager<R>> crate::SupertonicExt<R> for T {
  fn supertonic(&self) -> &Supertonic<R> {
    self.state::<Supertonic<R>>().inner()
  }
}

/// Access to the supertonic APIs.
pub struct Supertonic<R: Runtime> {
  #[allow(dead_code)]
  app: AppHandle<R>,
}

impl<R: Runtime> Supertonic<R> {
  pub fn ping(&self, payload: String) -> crate::Result<String> {
    Ok(format!("Pong: {}", payload))
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("supertonic")
    .invoke_handler(tauri::generate_handler![
      commands::load_engine,
      commands::load_voice,
      commands::speak
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let supertonic = mobile::init(app, api)?;
      #[cfg(desktop)]
      let supertonic = desktop::init(app, api)?;
      app.manage(supertonic);

      app.manage(SupertonicState {
          engine: Mutex::new(None),
          style: Mutex::new(None),
      });

      Ok(())
    })
    .build()
}
