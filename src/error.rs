use thiserror::Error;

#[derive(Error, Debug)]
pub enum SupertonicError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ONNX Runtime error: {0}")]
    Ort(#[from] ort::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Model configuration error: {0}")]
    Config(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Text processing error: {0}")]
    TextProcessing(String),

    #[error("Shape mismatch: expected {expected:?}, got {got:?}")]
    ShapeMismatch {
        expected: Vec<usize>,
        got: Vec<usize>,
    },

    #[error("Unknown error: {0}")]
    Unknown(String),
}
