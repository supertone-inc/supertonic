use std::time::Instant;
use anyhow::Result;

pub fn timer<F, T>(name: &str, f: F) -> Result<T>
where
    F: FnOnce() -> Result<T>,
{
    let start = Instant::now();
    println!("{}...", name);
    let result = f()?;
    let elapsed = start.elapsed().as_secs_f64();
    println!("  -> {} completed in {:.2} sec", name, elapsed);
    Ok(result)
}

pub fn sanitize_filename(text: &str, max_len: usize) -> String {
    let text = if text.len() > max_len {
        &text[..max_len]
    } else {
        text
    };

    text.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c
            } else {
                '_'
            }
        })
        .collect()
}
