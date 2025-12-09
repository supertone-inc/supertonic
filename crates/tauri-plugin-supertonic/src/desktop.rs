use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Supertonic<R>> {
  Ok(Supertonic {
    app: app.clone(),
  })
}

/// Access to the supertonic APIs.
pub struct Supertonic<R: Runtime> {
  #[allow(dead_code)]
  app: AppHandle<R>,
}

impl<R: Runtime> Supertonic<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }
}
