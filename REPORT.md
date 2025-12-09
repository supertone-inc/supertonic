# Supertonic Improvement Report

## Executive Summary

Supertonic is a high-performance, on-device TTS system. While the core inference engine is efficient, the codebase requires several improvements to be considered "production-ready". This report outlines the current state, identifies gaps, and proposes a roadmap for improvement.

## Current State Evaluation

| Category | Status | Notes |
|----------|--------|-------|
| **Core Functionality** | 🟢 Good | Inference works, performance is high. |
| **Code Quality** | 🟡 Fair | Code is clean but lacks structured logging and robust error handling types. |
| **Reliability** | 🟡 Fair | Relies on `libc::_exit` and `mem::forget` to avoid crashes, indicating underlying resource management issues. |
| **Usability** | 🟢 Good | CLI is straightforward, though argument validation could be improved. |
| **Documentation** | 🟡 Fair | README is good, but architectural docs and library API docs are missing. |
| **Testing** | 🔴 Poor | Minimal unit tests; integration tests are basic availability checks. |

## Production Readiness Gaps

1.  **Improper Resource Management**: The use of `mem::forget` and `unsafe { libc::_exit(0) }` to bypass cleanup is a critical stability risk and prevents the library from being safely embedded in long-running applications (e.g., servers).
2.  **Lack of Structured Logging**: Using `println!` for status updates makes it impossible to integrate with larger systems' logging infrastructure.
3.  **Hardcoded Paths**: The library relies on specific directory structures (`assets/onnx`) which limits flexibility in deployment.
4.  **Error Handling**: The library uses `anyhow::Result` everywhere. A library should expose specific error types (e.g., using `thiserror`) so consumers can handle failures gracefully.
5.  **Testing**: There are no automated regression tests for audio quality or numerical stability of the output.

## Roadmap

### Phase 1: Stabilization & "Easy Wins" (Immediate)
- [x] **Asset Management**: Ensure all voice styles are easily downloadable.
- [x] **Documentation**: Create Architecture and detailed Usage guides.
- [x] **Logging**: Replace `println!` with `tracing` or `log` crate.
- [ ] **CLI Polish**: Improve help messages and argument validation.

### Phase 2: Refactoring (Short Term)
- [ ] **Error Handling**: Migrate library code to use `thiserror` and custom `Error` enums.
- [ ] **Config Flexibility**: Allow passing configuration objects/paths explicitly rather than assuming rigid directory structures.
- [ ] **Library Extraction**: Move logic from `bin/tts.rs` (like batch processing loops) into the library to make the CLI a thin wrapper.

### Phase 3: Core Fixes (Medium Term)
- [ ] **Fix ONNX Runtime Cleanup**: Investigate and resolve the root cause of the mutex crash on exit, removing the need for `libc::_exit`.
- [ ] **GPU Support**: Re-enable and verify GPU support (currently disabled/unsupported in code).

### Phase 4: Testing & CI (Long Term)
- [ ] **Golden Tests**: Implement regression tests comparing output audio fingerprints against known "good" generations.
- [ ] **Fuzzing**: Fuzz text inputs to ensure robustness against malformed unicode.

## Recommended Immediate Improvements ("Easy Wins")

1.  **Documentation**: Add `docs/ARCHITECTURE.md` and `docs/USAGE.md`.
2.  **Logging**: Switch to `tracing` for better observability.
3.  **Refactor**: Clean up `bin/tts.rs` to use more idiomatic Rust patterns.
