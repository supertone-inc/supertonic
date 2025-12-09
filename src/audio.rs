use hound::{WavWriter, WavSpec, SampleFormat};
use std::path::Path;
use crate::error::SupertonicError;

// ============================================================================
// WAV File I/O
// ============================================================================

pub fn write_wav_file<P: AsRef<Path>>(
    filename: P,
    audio_data: &[f32],
    sample_rate: i32,
) -> Result<(), SupertonicError> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: sample_rate as u32,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut writer = WavWriter::create(filename, spec)
        .map_err(|e| SupertonicError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

    for &sample in audio_data {
        let clamped = sample.max(-1.0).min(1.0);
        let val = (clamped * 32767.0) as i16;
        writer.write_sample(val)
            .map_err(|e| SupertonicError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    }

    writer.finalize()
        .map_err(|e| SupertonicError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    Ok(())
}
