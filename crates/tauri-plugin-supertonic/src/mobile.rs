use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.supertonic.plugin";

#[cfg(target_os = "ios")]
const PLUGIN_IDENTIFIER: &str = "tauri.plugin.supertonic";

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Supertonic<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "SupertonicPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_supertonic)?;
  Ok(Supertonic { handle })
}

/// Access to the supertonic APIs.
pub struct Supertonic<R: Runtime> {
  handle: PluginHandle<R>,
}

impl<R: Runtime> Supertonic<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    self
      .handle
      .run_mobile_plugin("ping", payload)
      .map_err(Into::into)
  }
}
