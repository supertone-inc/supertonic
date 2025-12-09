use ndarray::{Array, Array3};
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs::File;
use std::io::BufReader;
use rand_distr::{Distribution, Normal};
use ort::{
    session::Session,
    value::Value,
};
use tracing::info;

use crate::config::Config;
use crate::error::SupertonicError;
use crate::text::{UnicodeProcessor, chunk_text, length_to_mask};

// ============================================================================
// Voice Style Data Structure
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceStyleData {
    pub style_ttl: StyleComponent,
    pub style_dp: StyleComponent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleComponent {
    pub data: Vec<Vec<Vec<f32>>>,
    pub dims: Vec<usize>,
    #[serde(rename = "type")]
    pub dtype: String,
}

pub struct Style {
    pub ttl: Array3<f32>,
    pub dp: Array3<f32>,
}

/// Load voice style from JSON files
pub fn load_voice_style(voice_style_paths: &[String], verbose: bool) -> Result<Style, SupertonicError> {
    let bsz = voice_style_paths.len();
    if bsz == 0 {
        return Err(SupertonicError::Validation("No voice style paths provided".to_string()));
    }

    // Read first file to get dimensions
    let first_file = File::open(&voice_style_paths[0])
        .map_err(SupertonicError::Io)?;
    let first_reader = BufReader::new(first_file);
    let first_data: VoiceStyleData = serde_json::from_reader(first_reader)
        .map_err(SupertonicError::Serialization)?;

    let ttl_dims = &first_data.style_ttl.dims;
    let dp_dims = &first_data.style_dp.dims;

    let ttl_dim1 = ttl_dims[1];
    let ttl_dim2 = ttl_dims[2];
    let dp_dim1 = dp_dims[1];
    let dp_dim2 = dp_dims[2];

    // Pre-allocate arrays with full batch size
    let ttl_size = bsz * ttl_dim1 * ttl_dim2;
    let dp_size = bsz * dp_dim1 * dp_dim2;
    let mut ttl_flat = vec![0.0f32; ttl_size];
    let mut dp_flat = vec![0.0f32; dp_size];

    // Fill in the data
    for (i, path) in voice_style_paths.iter().enumerate() {
        let file = File::open(path).map_err(SupertonicError::Io)?;
        let reader = BufReader::new(file);
        let data: VoiceStyleData = serde_json::from_reader(reader).map_err(SupertonicError::Serialization)?;

        // Flatten TTL data
        let ttl_offset = i * ttl_dim1 * ttl_dim2;
        let mut idx = 0;
        for batch in &data.style_ttl.data {
            for row in batch {
                for &val in row {
                    ttl_flat[ttl_offset + idx] = val;
                    idx += 1;
                }
            }
        }

        // Flatten DP data
        let dp_offset = i * dp_dim1 * dp_dim2;
        idx = 0;
        for batch in &data.style_dp.data {
            for row in batch {
                for &val in row {
                    dp_flat[dp_offset + idx] = val;
                    idx += 1;
                }
            }
        }
    }

    let ttl_style = Array3::from_shape_vec((bsz, ttl_dim1, ttl_dim2), ttl_flat)
        .map_err(|_e| SupertonicError::ShapeMismatch {
            expected: vec![bsz, ttl_dim1, ttl_dim2],
            got: vec![], // difficult to get actual shape from ShapeError easily without more work, but this is a start
        })?;
    let dp_style = Array3::from_shape_vec((bsz, dp_dim1, dp_dim2), dp_flat)
        .map_err(|_e| SupertonicError::ShapeMismatch {
             expected: vec![bsz, dp_dim1, dp_dim2],
             got: vec![],
        })?;

    if verbose {
        info!("Loaded {} voice styles", bsz);
    }

    Ok(Style {
        ttl: ttl_style,
        dp: dp_style,
    })
}

// ============================================================================
// ONNX Runtime Integration
// ============================================================================

pub struct TextToSpeech {
    cfgs: Config,
    text_processor: UnicodeProcessor,
    dp_ort: Session,
    text_enc_ort: Session,
    vector_est_ort: Session,
    vocoder_ort: Session,
    pub sample_rate: i32,
}

impl TextToSpeech {
    pub fn new(
        cfgs: Config,
        text_processor: UnicodeProcessor,
        dp_ort: Session,
        text_enc_ort: Session,
        vector_est_ort: Session,
        vocoder_ort: Session,
    ) -> Self {
        let sample_rate = cfgs.ae.sample_rate;
        TextToSpeech {
            cfgs,
            text_processor,
            dp_ort,
            text_enc_ort,
            vector_est_ort,
            vocoder_ort,
            sample_rate,
        }
    }

    fn _infer(
        &mut self,
        text_list: &[String],
        style: &Style,
        total_step: usize,
        speed: f32,
    ) -> Result<(Vec<Vec<f32>>, Vec<f32>), SupertonicError> {
        let bsz = text_list.len();

        // Process text
        let (text_ids, text_mask) = self.text_processor.call(text_list);

        let text_ids_array = {
            let text_ids_shape = (bsz, text_ids[0].len());
            let mut flat = Vec::new();
            for row in &text_ids {
                flat.extend_from_slice(row);
            }
            Array::from_shape_vec(text_ids_shape, flat)
                .map_err(|_e| SupertonicError::ShapeMismatch {
                    expected: vec![bsz, text_ids[0].len()],
                    got: vec![],
                })?
        };

        let text_ids_value = Value::from_array(text_ids_array)?;
        let text_mask_value = Value::from_array(text_mask.clone())?;
        let style_dp_value = Value::from_array(style.dp.clone())?;

        // Predict duration
        let dp_outputs = self.dp_ort.run(ort::inputs!{
            "text_ids" => &text_ids_value,
            "style_dp" => &style_dp_value,
            "text_mask" => &text_mask_value
        })?;

        let (_, duration_data) = dp_outputs["duration"].try_extract_tensor::<f32>()?;
        let mut duration: Vec<f32> = duration_data.to_vec();

        // Apply speed factor to duration
        for dur in duration.iter_mut() {
            *dur /= speed;
        }

        // Encode text
        let style_ttl_value = Value::from_array(style.ttl.clone())?;
        let text_enc_outputs = self.text_enc_ort.run(ort::inputs!{
            "text_ids" => &text_ids_value,
            "style_ttl" => &style_ttl_value,
            "text_mask" => &text_mask_value
        })?;

        let (text_emb_shape, text_emb_data) = text_enc_outputs["text_emb"].try_extract_tensor::<f32>()?;
        let text_emb = Array3::from_shape_vec(
            (text_emb_shape[0] as usize, text_emb_shape[1] as usize, text_emb_shape[2] as usize),
            text_emb_data.to_vec()
        ).map_err(|_e| SupertonicError::ShapeMismatch {
            expected: vec![text_emb_shape[0] as usize, text_emb_shape[1] as usize, text_emb_shape[2] as usize],
            got: vec![],
        })?;

        // Sample noisy latent
        let (mut xt, latent_mask) = sample_noisy_latent(
            &duration,
            self.sample_rate,
            self.cfgs.ae.base_chunk_size,
            self.cfgs.ttl.chunk_compress_factor,
            self.cfgs.ttl.latent_dim,
        );

        // Prepare constant arrays
        let total_step_array = Array::from_elem(bsz, total_step as f32);

        // Denoising loop
        for step in 0..total_step {
            let current_step_array = Array::from_elem(bsz, step as f32);

            let xt_value = Value::from_array(xt.clone())?;
            let text_emb_value = Value::from_array(text_emb.clone())?;
            let latent_mask_value = Value::from_array(latent_mask.clone())?;
            let text_mask_value2 = Value::from_array(text_mask.clone())?;
            let current_step_value = Value::from_array(current_step_array)?;
            let total_step_value = Value::from_array(total_step_array.clone())?;

            let vector_est_outputs = self.vector_est_ort.run(ort::inputs!{
                "noisy_latent" => &xt_value,
                "text_emb" => &text_emb_value,
                "style_ttl" => &style_ttl_value,
                "latent_mask" => &latent_mask_value,
                "text_mask" => &text_mask_value2,
                "current_step" => &current_step_value,
                "total_step" => &total_step_value
            })?;

            let (denoised_shape, denoised_data) = vector_est_outputs["denoised_latent"].try_extract_tensor::<f32>()?;
            xt = Array3::from_shape_vec(
                (denoised_shape[0] as usize, denoised_shape[1] as usize, denoised_shape[2] as usize),
                denoised_data.to_vec()
            ).map_err(|_e| SupertonicError::ShapeMismatch {
                expected: vec![denoised_shape[0] as usize, denoised_shape[1] as usize, denoised_shape[2] as usize],
                got: vec![],
            })?;
        }

        // Generate waveform
        let final_latent_value = Value::from_array(xt)?;
        let vocoder_outputs = self.vocoder_ort.run(ort::inputs!{
            "latent" => &final_latent_value
        })?;

        let (_, wav_data) = vocoder_outputs["wav_tts"].try_extract_tensor::<f32>()?;
        let wav_flat: Vec<f32> = wav_data.to_vec();

        // Slice the flat audio array into individual samples
        let mut wav_outputs = Vec::with_capacity(bsz);
        let wav_len_per_sample = wav_flat.len() / bsz;

        for i in 0..bsz {
            let actual_len = (self.sample_rate as f32 * duration[i]) as usize;
            let wav_start = i * wav_len_per_sample;
            let wav_end = wav_start + actual_len.min(wav_len_per_sample);
            wav_outputs.push(wav_flat[wav_start..wav_end].to_vec());
        }

        Ok((wav_outputs, duration))
    }

    pub fn call(
        &mut self,
        text: &str,
        style: &Style,
        total_step: usize,
        speed: f32,
        silence_duration: f32,
    ) -> Result<(Vec<f32>, f32), SupertonicError> {
        let chunks = chunk_text(text, None);

        let mut wav_cat: Vec<f32> = Vec::new();
        let mut dur_cat: f32 = 0.0;

        for (i, chunk) in chunks.iter().enumerate() {
            let (wav_batch, duration) = self._infer(&[chunk.clone()], style, total_step, speed)?;

            let dur = duration[0];
            // Wav batch has size 1 here
            let wav_chunk = &wav_batch[0];

            if i == 0 {
                wav_cat.extend_from_slice(wav_chunk);
                dur_cat = dur;
            } else {
                let silence_len = (silence_duration * self.sample_rate as f32) as usize;
                let silence = vec![0.0f32; silence_len];

                wav_cat.extend_from_slice(&silence);
                wav_cat.extend_from_slice(wav_chunk);
                dur_cat += silence_duration + dur;
            }
        }

        Ok((wav_cat, dur_cat))
    }

    pub fn batch(
        &mut self,
        text_list: &[String],
        style: &Style,
        total_step: usize,
        speed: f32,
    ) -> Result<(Vec<Vec<f32>>, Vec<f32>), SupertonicError> {
        self._infer(text_list, style, total_step, speed)
    }
}

/// Sample noisy latent from normal distribution and apply mask
pub fn sample_noisy_latent(
    duration: &[f32],
    sample_rate: i32,
    base_chunk_size: i32,
    chunk_compress: i32,
    latent_dim: i32,
) -> (Array3<f32>, Array3<f32>) {
    let bsz = duration.len();
    let max_dur = duration.iter().fold(0.0f32, |a, &b| a.max(b));

    let wav_len_max = (max_dur * sample_rate as f32) as usize;
    let wav_lengths: Vec<usize> = duration
        .iter()
        .map(|&d| (d * sample_rate as f32) as usize)
        .collect();

    let chunk_size = (base_chunk_size * chunk_compress) as usize;
    let latent_len = (wav_len_max + chunk_size - 1) / chunk_size;
    let latent_dim_val = (latent_dim * chunk_compress) as usize;

    let mut noisy_latent = Array3::<f32>::zeros((bsz, latent_dim_val, latent_len));

    let normal = Normal::new(0.0, 1.0).unwrap();
    let mut rng = rand::thread_rng();

    for b in 0..bsz {
        for d in 0..latent_dim_val {
            for t in 0..latent_len {
                noisy_latent[[b, d, t]] = normal.sample(&mut rng);
            }
        }
    }

    let latent_lengths: Vec<usize> = wav_lengths
        .iter()
        .map(|&len| (len + chunk_size - 1) / chunk_size)
        .collect();

    let latent_mask = length_to_mask(&latent_lengths, Some(latent_len));

    // Apply mask
    for b in 0..bsz {
        for d in 0..latent_dim_val {
            for t in 0..latent_len {
                noisy_latent[[b, d, t]] *= latent_mask[[b, 0, t]];
            }
        }
    }

    (noisy_latent, latent_mask)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceStyleData {
    pub style_ttl: StyleComponent,
    pub style_dp: StyleComponent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleComponent {
    pub data: Vec<Vec<Vec<f32>>>,
    pub dims: Vec<usize>,
    #[serde(rename = "type")]
    pub dtype: String,
}

pub struct Style {
    pub ttl: Array3<f32>,
    pub dp: Array3<f32>,
}

/// Load voice style from bytes
pub fn load_voice_style_from_bytes(bytes_list: &[&[u8]], verbose: bool) -> Result<Style, SupertonicError> {
    let bsz = bytes_list.len();
    if bsz == 0 {
        return Err(SupertonicError::Validation("No voice style bytes provided".to_string()));
    }

    // Read first file to get dimensions
    let first_data: VoiceStyleData = serde_json::from_slice(bytes_list[0])
        .map_err(SupertonicError::Serialization)?;

    let ttl_dims = &first_data.style_ttl.dims;
    let dp_dims = &first_data.style_dp.dims;

    let ttl_dim1 = ttl_dims[1];
    let ttl_dim2 = ttl_dims[2];
    let dp_dim1 = dp_dims[1];
    let dp_dim2 = dp_dims[2];

    // Pre-allocate arrays with full batch size
    let ttl_size = bsz * ttl_dim1 * ttl_dim2;
    let dp_size = bsz * dp_dim1 * dp_dim2;
    let mut ttl_flat = vec![0.0f32; ttl_size];
    let mut dp_flat = vec![0.0f32; dp_size];

    // Fill in the data
    for (i, bytes) in bytes_list.iter().enumerate() {
        let data: VoiceStyleData = serde_json::from_slice(bytes).map_err(SupertonicError::Serialization)?;

        // Flatten TTL data
        let ttl_offset = i * ttl_dim1 * ttl_dim2;
        let mut idx = 0;
        for batch in &data.style_ttl.data {
            for row in batch {
                for &val in row {
                    ttl_flat[ttl_offset + idx] = val;
                    idx += 1;
                }
            }
        }

        // Flatten DP data
        let dp_offset = i * dp_dim1 * dp_dim2;
        idx = 0;
        for batch in &data.style_dp.data {
            for row in batch {
                for &val in row {
                    dp_flat[dp_offset + idx] = val;
                    idx += 1;
                }
            }
        }
    }

    let ttl_style = Array3::from_shape_vec((bsz, ttl_dim1, ttl_dim2), ttl_flat)
        .map_err(|_e| SupertonicError::ShapeMismatch {
            expected: vec![bsz, ttl_dim1, ttl_dim2],
            got: vec![], // difficult to get actual shape from ShapeError easily without more work, but this is a start
        })?;
    let dp_style = Array3::from_shape_vec((bsz, dp_dim1, dp_dim2), dp_flat)
        .map_err(|_e| SupertonicError::ShapeMismatch {
             expected: vec![bsz, dp_dim1, dp_dim2],
             got: vec![],
        })?;

    if verbose {
        info!("Loaded {} voice styles", bsz);
    }

    Ok(Style {
        ttl: ttl_style,
        dp: dp_style,
    })
}

/// Load voice style from JSON files
pub fn load_voice_style(voice_style_paths: &[String], verbose: bool) -> Result<Style, SupertonicError> {
    let mut bytes_list = Vec::new();
    let mut file_contents = Vec::new(); // Keep contents alive
    for path in voice_style_paths {
        let content = std::fs::read(path).map_err(SupertonicError::Io)?;
        file_contents.push(content);
    }

    for content in &file_contents {
        bytes_list.push(content.as_slice());
    }

    load_voice_style_from_bytes(&bytes_list, verbose)
}

pub struct ModelBytes<'a> {
    pub config: &'a [u8],
    pub duration_predictor: &'a [u8],
    pub text_encoder: &'a [u8],
    pub vector_estimator: &'a [u8],
    pub vocoder: &'a [u8],
    pub unicode_indexer: &'a [u8],
}

/// Load TTS components from memory
pub fn load_text_to_speech_from_memory(models: ModelBytes, use_gpu: bool) -> Result<TextToSpeech, SupertonicError> {
    if use_gpu {
        return Err(SupertonicError::Config("GPU mode is not supported yet".to_string()));
    }
    info!("Using CPU for inference");

    let cfgs = crate::config::load_cfgs_from_bytes(models.config).map_err(|e| SupertonicError::Config(e.to_string()))?;

    let dp_ort = Session::builder()?
        .commit_from_memory(models.duration_predictor)?;
    let text_enc_ort = Session::builder()?
        .commit_from_memory(models.text_encoder)?;
    let vector_est_ort = Session::builder()?
        .commit_from_memory(models.vector_estimator)?;
    let vocoder_ort = Session::builder()?
        .commit_from_memory(models.vocoder)?;

    let text_processor = UnicodeProcessor::from_bytes(models.unicode_indexer)
        .map_err(|e| SupertonicError::TextProcessing(e.to_string()))?;

    Ok(TextToSpeech::new(
        cfgs,
        text_processor,
        dp_ort,
        text_enc_ort,
        vector_est_ort,
        vocoder_ort,
    ))
}

/// Load TTS components
pub fn load_text_to_speech(onnx_dir: &str, use_gpu: bool) -> Result<TextToSpeech, SupertonicError> {
    let cfg_path = format!("{}/tts.json", onnx_dir);
    let dp_path = format!("{}/duration_predictor.onnx", onnx_dir);
    let text_enc_path = format!("{}/text_encoder.onnx", onnx_dir);
    let vector_est_path = format!("{}/vector_estimator.onnx", onnx_dir);
    let vocoder_path = format!("{}/vocoder.onnx", onnx_dir);
    let unicode_indexer_path = format!("{}/unicode_indexer.json", onnx_dir);

    let config = std::fs::read(cfg_path).map_err(SupertonicError::Io)?;
    let dp = std::fs::read(dp_path).map_err(SupertonicError::Io)?;
    let text_enc = std::fs::read(text_enc_path).map_err(SupertonicError::Io)?;
    let vector_est = std::fs::read(vector_est_path).map_err(SupertonicError::Io)?;
    let vocoder = std::fs::read(vocoder_path).map_err(SupertonicError::Io)?;
    let unicode_indexer = std::fs::read(unicode_indexer_path).map_err(SupertonicError::Io)?;

    load_text_to_speech_from_memory(ModelBytes {
        config: &config,
        duration_predictor: &dp,
        text_encoder: &text_enc,
        vector_estimator: &vector_est,
        vocoder: &vocoder,
        unicode_indexer: &unicode_indexer,
    }, use_gpu)
}
