use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;
use std::fs;
use std::mem;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use supertonic_tts::{
    load_text_to_speech, load_voice_style, timer, write_wav_file, sanitize_filename,
};

#[derive(Parser, Debug)]
#[command(name = "Supertonic TTS")]
#[command(version = "0.1.0")]
#[command(about = "High-performance, on-device Text-to-Speech synthesis using ONNX Runtime.", long_about = None)]
struct Args {
    /// Use GPU for inference (default: CPU)
    #[arg(long, default_value = "false")]
    use_gpu: bool,

    /// Path to ONNX model directory
    #[arg(long, default_value = "assets/onnx", help = "Directory containing the ONNX models")]
    onnx_dir: String,

    /// Number of denoising steps (Higher = better quality, slower)
    #[arg(long, default_value = "5")]
    total_step: usize,

    /// Speech speed factor (higher = faster)
    #[arg(long, default_value = "1.05")]
    speed: f32,

    /// Number of times to generate each sample
    #[arg(long, default_value = "4")]
    n_test: usize,

    /// Voice style file path(s)
    #[arg(long, value_delimiter = ',', default_values_t = vec!["assets/voice_styles/M1.json".to_string()])]
    voice_style: Vec<String>,

    /// Text(s) to synthesize (separated by | if using batch mode)
    #[arg(long, value_delimiter = '|', default_values_t = vec!["This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen.".to_string()])]
    text: Vec<String>,

    /// Output directory
    #[arg(long, default_value = "results")]
    save_dir: String,

    /// Enable batch mode (multiple text-style pairs)
    #[arg(long, default_value = "false")]
    batch: bool,
}

fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default subscriber failed");

    info!("=== Supertonic TTS Inference ===");

    // --- 1. Parse arguments --- //
    let args = Args::parse();
    let total_step = args.total_step;
    let speed = args.speed;
    let n_test = args.n_test;
    let voice_style_paths = &args.voice_style;
    let text_list = &args.text;
    let save_dir = &args.save_dir;
    let batch = args.batch;

    if batch {
        if voice_style_paths.len() != text_list.len() {
            anyhow::bail!(
                "Number of voice styles ({}) must match number of texts ({})",
                voice_style_paths.len(),
                text_list.len()
            );
        }
    }

    let bsz = voice_style_paths.len();

    // --- 2. Load TTS components --- //
    let mut text_to_speech = load_text_to_speech(&args.onnx_dir, args.use_gpu)?;

    // --- 3. Load voice styles --- //
    let style = load_voice_style(voice_style_paths, true)?;

    // --- 4. Synthesize speech --- //
    fs::create_dir_all(save_dir)?;

    for n in 0..n_test {
        info!("Starting synthesis batch [{}/{}]", n + 1, n_test);

        let (wav, duration) = if batch {
            timer("Generating speech from text (Batch)", || {
                text_to_speech.batch(text_list, &style, total_step, speed)
            })?
        } else {
            let (w, d) = timer("Generating speech from text (Single)", || {
                text_to_speech.call(&text_list[0], &style, total_step, speed, 0.3)
            })?;
            (w, vec![d])
        };

        // Save outputs
        for i in 0..bsz {
            let fname = format!("{}_{}.wav", sanitize_filename(&text_list[i], 20), n + 1);
            let wav_slice = if batch {
                let wav_len = wav.len() / bsz;
                let actual_len = (text_to_speech.sample_rate as f32 * duration[i]) as usize;
                let wav_start = i * wav_len;
                let wav_end = wav_start + actual_len.min(wav_len);
                &wav[wav_start..wav_end]
            } else {
                // For non-batch mode, wav is a single concatenated audio
                let actual_len = (text_to_speech.sample_rate as f32 * duration[0]) as usize;
                &wav[..actual_len.min(wav.len())]
            };

            let output_path = PathBuf::from(save_dir).join(&fname);
            write_wav_file(&output_path, wav_slice, text_to_speech.sample_rate)?;
            info!("Saved: {}", output_path.display());
        }
    }

    info!("Synthesis completed successfully!");
    
    // WORKAROUND: Prevent ONNX Runtime sessions from being dropped naturally.
    // There is a known issue (likely a mutex deadlock or race condition) in the ONNX Runtime
    // destruction sequence on some platforms (especially macOS) that causes a hang or crash on exit.
    // By forgetting the struct, we skip the `Drop` implementation.
    mem::forget(text_to_speech);
    
    // Use _exit to bypass all cleanup handlers (atexit) and avoid ONNX Runtime mutex issues.
    unsafe {
        libc::_exit(0);
    }
}
