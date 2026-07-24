import * as ort from 'onnxruntime-web';
import {
    loadTextToSpeech,
    loadVoiceStyle,
    writeWavFile
} from './helper.js';

// Configure ORT runtime once, before any session is created.
// SIMD is always on in modern browsers; threads need cross-origin isolation
// (see vite.config.js, which sets COOP/COEP headers in dev).
const cpuThreads = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency)
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 1;
const crossOriginIsolated = (typeof self !== 'undefined' && self.crossOriginIsolated) === true;
ort.env.wasm.simd = true;
ort.env.wasm.numThreads = crossOriginIsolated ? cpuThreads : 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = 'warning';

// Configuration
const DEFAULT_VOICE_STYLE_PATH = 'assets/voice_styles/M1.json';

// Helper function to extract filename from path
function getFilenameFromPath(path) {
    return path.split('/').pop();
}

// Global state
let textToSpeech = null;
let cfgs = null;

// Pre-computed style
let currentStyle = null;
let currentStylePath = DEFAULT_VOICE_STYLE_PATH;

// UI Elements
const textInput = document.getElementById('text');
const voiceStyleSelect = document.getElementById('voiceStyleSelect');
const voiceStyleInfo = document.getElementById('voiceStyleInfo');
const langSelect = document.getElementById('langSelect');
const totalStepInput = document.getElementById('totalStep');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('generateBtn');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const backendBadge = document.getElementById('backendBadge');
const resultsContainer = document.getElementById('results');
const errorBox = document.getElementById('error');

function showStatus(message, type = 'info') {
    statusText.innerHTML = message;
    statusBox.className = 'status-box';
    if (type === 'success') {
        statusBox.classList.add('success');
    } else if (type === 'error') {
        statusBox.classList.add('error');
    }
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('active');
}

function hideError() {
    errorBox.classList.remove('active');
}

function showBackendBadge() {
    backendBadge.classList.add('visible');
}

// Load voice style from JSON
async function loadStyleFromJSON(stylePath) {
    try {
        const style = await loadVoiceStyle([stylePath], true);
        return style;
    } catch (error) {
        console.error('Error loading voice style:', error);
        throw error;
    }
}

// Detect WebGPU once so ORT can fall back to WASM per-op without re-downloading.
async function detectWebGPU() {
    if (typeof navigator === 'undefined' || !navigator.gpu) return false;
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

// Load models on page load
async function initializeModels() {
    try {
        showStatus('ℹ️ <strong>Loading configuration...</strong>');

        const basePath = 'assets/onnx';

        const hasWebGPU = await detectWebGPU();
        const executionProviders = hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];
        const executionProvider = hasWebGPU ? 'webgpu' : 'wasm';

        const result = await loadTextToSpeech(basePath, {
            executionProviders,
            graphOptimizationLevel: 'all'
        }, (label, current, total) => {
            showStatus(`ℹ️ <strong>Loading ONNX models (${current}/${total}):</strong> ${label}`);
        });

        textToSpeech = result.textToSpeech;
        cfgs = result.cfgs;

        if (hasWebGPU) {
            backendBadge.textContent = 'WebGPU';
            backendBadge.style.background = '#4caf50';
        }

        showStatus('ℹ️ <strong>Loading default voice style...</strong>');

        currentStyle = await loadStyleFromJSON(currentStylePath);
        voiceStyleInfo.textContent = `${getFilenameFromPath(currentStylePath)} (default)`;

        showStatus(`✅ <strong>Models loaded!</strong> Using ${executionProvider.toUpperCase()}. You can now generate speech.`, 'success');
        showBackendBadge();

        generateBtn.disabled = false;

    } catch (error) {
        console.error('Error loading models:', error);
        showStatus(`❌ <strong>Error loading models:</strong> ${error.message}`, 'error');
    }
}

// Handle voice style selection
voiceStyleSelect.addEventListener('change', async (e) => {
    const selectedValue = e.target.value;
    
    if (!selectedValue) return;
    
    try {
        generateBtn.disabled = true;
        showStatus(`ℹ️ <strong>Loading voice style...</strong>`, 'info');
        
        currentStylePath = selectedValue;
        currentStyle = await loadStyleFromJSON(currentStylePath);
        voiceStyleInfo.textContent = getFilenameFromPath(currentStylePath);
        
        showStatus(`✅ <strong>Voice style loaded:</strong> ${getFilenameFromPath(currentStylePath)}`, 'success');
        generateBtn.disabled = false;
    } catch (error) {
        showError(`Error loading voice style: ${error.message}`);
        
        // Restore default style
        currentStylePath = DEFAULT_VOICE_STYLE_PATH;
        voiceStyleSelect.value = currentStylePath;
        try {
            currentStyle = await loadStyleFromJSON(currentStylePath);
            voiceStyleInfo.textContent = `${getFilenameFromPath(currentStylePath)} (default)`;
        } catch (styleError) {
            console.error('Error restoring default style:', styleError);
        }
        
        generateBtn.disabled = false;
    }
});

// Main synthesis function
async function generateSpeech() {
    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter some text to synthesize.');
        return;
    }
    
    if (!textToSpeech || !cfgs) {
        showError('Models are still loading. Please wait.');
        return;
    }
    
    if (!currentStyle) {
        showError('Voice style is not ready. Please wait.');
        return;
    }
    
    const startTime = Date.now();
    
    try {
        generateBtn.disabled = true;
        hideError();
        
        // Clear results and show placeholder
        resultsContainer.innerHTML = `
            <div class="results-placeholder generating">
                <div class="results-placeholder-icon">⏳</div>
                <p>Generating speech...</p>
            </div>
        `;
        
        const totalStep = parseInt(totalStepInput.value);
        const speed = parseFloat(speedInput.value);
        const lang = langSelect.value;
        
        showStatus('ℹ️ <strong>Generating speech from text...</strong>');
        const tic = Date.now();
        
        const { wav, duration } = await textToSpeech.call(
            text,
            lang,
            currentStyle, 
            totalStep,
            speed,
            0.3,
            (step, total) => {
                showStatus(`ℹ️ <strong>Denoising (${step}/${total})...</strong>`);
            }
        );
        
        const toc = Date.now();
        console.log(`Text-to-speech synthesis: ${((toc - tic) / 1000).toFixed(2)}s`);
        
        showStatus('ℹ️ <strong>Creating audio file...</strong>');
        const wavLen = Math.floor(textToSpeech.sampleRate * duration[0]);
        const wavOut = wav.slice(0, wavLen);
        
        // Create WAV file
        const wavBuffer = writeWavFile(wavOut, textToSpeech.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        // Calculate total time and audio duration
        const endTime = Date.now();
        const totalTimeSec = ((endTime - startTime) / 1000).toFixed(2);
        const audioDurationSec = duration[0].toFixed(2);
        
        // Display result with full text
        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-text-container">
                    <div class="result-text-label">Input Text</div>
                    <div class="result-text">${text}</div>
                </div>
                <div class="result-info">
                    <div class="info-item">
                        <span>📊 Audio Length</span>
                        <strong>${audioDurationSec}s</strong>
                    </div>
                    <div class="info-item">
                        <span>⏱️ Generation Time</span>
                        <strong>${totalTimeSec}s</strong>
                    </div>
                </div>
                <div class="result-player">
                    <audio controls>
                        <source src="${url}" type="audio/wav">
                    </audio>
                </div>
                <div class="result-actions">
                    <button onclick="downloadAudio('${url}', 'synthesized_speech.wav')">
                        <span>⬇️</span>
                        <span>Download WAV</span>
                    </button>
                </div>
            </div>
        `;
        
        showStatus('✅ <strong>Speech synthesis completed successfully!</strong>', 'success');
        
    } catch (error) {
        console.error('Error during synthesis:', error);
        showStatus(`❌ <strong>Error during synthesis:</strong> ${error.message}`, 'error');
        showError(`Error during synthesis: ${error.message}`);
        
        // Restore placeholder
        resultsContainer.innerHTML = `
            <div class="results-placeholder">
                <div class="results-placeholder-icon">🎤</div>
                <p>Generated speech will appear here</p>
            </div>
        `;
    } finally {
        generateBtn.disabled = false;
    }
}

// Download handler (make it global so it can be called from onclick)
window.downloadAudio = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

// Attach generate function to button
generateBtn.addEventListener('click', generateSpeech);

// Initialize on load
window.addEventListener('load', async () => {
    generateBtn.disabled = true;
    await initializeModels();
});
