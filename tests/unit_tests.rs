use supertonic_tts::{preprocess_text, chunk_text, sanitize_filename};

#[test]
fn test_text_preprocessing() {
    let input = "Hello, World! 123";
    let processed = preprocess_text(input);
    // Based on the regex rules, it should retain punctuation and numbers if not stripped
    // Let's check what it actually does.
    // It replaces extra spaces, fixes punctuation spacing, etc.
    assert!(processed.contains("Hello"));
    assert!(processed.ends_with('.')); // It adds a period if missing
}

#[test]
fn test_chunk_text() {
    let text = "This is a sentence. This is another sentence.";
    let chunks = chunk_text(text, Some(20));
    assert!(chunks.len() >= 2);
    assert_eq!(chunks[0], "This is a sentence.");
}

#[test]
fn test_sanitize_filename() {
    let name = "Hello World! @#$";
    let sanitized = sanitize_filename(name, 10);
    assert_eq!(sanitized.len(), 10);
    assert!(!sanitized.contains('!'));
    assert!(!sanitized.contains('@'));
    // It replaces non-alphanumeric with '_'
    assert_eq!(sanitized, "Hello_Worl");
}
