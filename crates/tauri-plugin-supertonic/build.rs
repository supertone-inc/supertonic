const COMMANDS: &[&str] = &["load_engine", "load_voice", "speak"];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
