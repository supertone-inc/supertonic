import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as ort from 'onnxruntime-node';

const __filename = fileURLToPath(import.meta.url);

const AVAILABLE_LANGS = ["en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na"];

/**
 * Unicode text processor
 */
class UnicodeProcessor {
    constructor(unicodeIndexerJsonPath) {
        this.indexer = JSON.parse(fs.readFileSync(unicodeIndexerJsonPath, 'utf8'));
    }

    _preprocessText(text, lang) {
        // TODO: Need advanced normalizer for better performance
        text = text.normalize('NFKD');

        // Remove emojis (wide Unicode range)
        const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu;
        text = text.replace(emojiPattern, '');

        // Replace various dashes and symbols
        const replacements = {
            '–': '-',
            '‑': '-',
            '—': '-',
            '_': ' ',
            '\u201C': '"',  // left double quote "
            '\u201D': '"',  // right double quote "
            '\u2018': "'",  // left single quote '
            '\u2019': "'",  // right single quote '
            '´': "'",
            '`': "'",
            '[': ' ',
            ']': ' ',
            '|': ' ',
            '/': ' ',
            '#': ' ',
            '→': ' ',
            '←': ' ',
        };
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replaceAll(k, v);
        }

        // Remove special symbols
        text = text.replace(/[♥☆♡©\\]/g, '');

        // Replace known expressions
        const exprReplacements = {
            '@': ' at ',
            'e.g.,': 'for example, ',
            'i.e.,': 'that is, ',
        };
        for (const [k, v] of Object.entries(exprReplacements)) {
            text = text.replaceAll(k, v);
        }

        // Fix spacing around punctuation
        text = text.replace(/ ,/g, ',');
        text = text.replace(/ \./g, '.');
        text = text.replace(/ !/g, '!');
        text = text.replace(/ \?/g, '?');
        text = text.replace(/ ;/g, ';');
        text = text.replace(/ :/g, ':');
        text = text.replace(/ '/g, "'");

        // Remove duplicate quotes
        while (text.includes('""')) {
            text = text.replace('""', '"');
        }
        while (text.includes("''")) {
            text = text.replace("''", "'");
        }
        while (text.includes('``')) {
            text = text.replace('``', '`');
        }

        // Remove extra spaces
        text = text.replace(/\s+/g, ' ').trim();

        // If text doesn't end with punctuation, quotes, or closing brackets, add a period
        if (!/[.!?;:,'\"')\]}…。」』】〉》›»]$/.test(text)) {
            text += '.';
        }

        // Validate language
        if (!AVAILABLE_LANGS.includes(lang)) {
            throw new Error(`Invalid language: ${lang}. Available: ${AVAILABLE_LANGS.join(', ')}`);
        }
        
        // Wrap text with language tags
        text = `<${lang}>` + text + `</${lang}>`;

        return text;
    }

    _textToUnicodeValues(text) {
        return Array.from(text).map(char => char.charCodeAt(0));
    }

    _getTextMask(textIdsLengths) {
        return lengthToMask(textIdsLengths);
    }

    call(textList, langList) {
        const processedTexts = textList.map((t, i) => this._preprocessText(t, langList[i]));
        const textIdsLengths = processedTexts.map(t => t.length);
        const maxLen = Math.max(...textIdsLengths);
        
        const textIds = [];
        for (let i = 0; i < processedTexts.length; i++) {
            const row = new Array(maxLen).fill(0);
            const unicodeVals = this._textToUnicodeValues(processedTexts[i]);
            for (let j = 0; j < unicodeVals.length; j++) {
                row[j] = this.indexer[unicodeVals[j]];
            }
            textIds.push(row);
        }
        
        const textMask = this._getTextMask(textIdsLengths);
        return { textIds, textMask };
    }
}

/**
 * Style class
 */
class Style {
    constructor(styleTtlOnnx, styleDpOnnx) {
        this.ttl = styleTtlOnnx;
        this.dp = styleDpOnnx;
    }
}

/**
 * TextToSpeech class
 */
class TextToSpeech {
    constructor(cfgs, textProcessor, dpOrt, textEncOrt, vectorEstOrt, vocoderOrt) {
        this.cfgs = cfgs;
        this.textProcessor = textProcessor;
        this.dpOrt = dpOrt;
        this.textEncOrt = textEncOrt;
        this.vectorEstOrt = vectorEstOrt;
        this.vocoderOrt = vocoderOrt;
        this.sampleRate = cfgs.ae.sample_rate;
        this.baseChunkSize = cfgs.ae.base_chunk_size;
        this.chunkCompressFactor = cfgs.ttl.chunk_compress_factor;
        this.ldim = cfgs.ttl.latent_dim;
    }

    sampleNoisyLatent(duration) {
        const wavLenMax = Math.max(...duration) * this.sampleRate;
        const wavLengths = duration.map(d => Math.floor(d * this.sampleRate));
        const chunkSize = this.baseChunkSize * this.chunkCompressFactor;
        const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
        const latentDim = this.ldim * this.chunkCompressFactor;

        // Generate random noise
        const noisyLatent = [];
        for (let b = 0; b < duration.length; b++) {
            const batch = [];
            for (let d = 0; d < latentDim; d++) {
                const row = [];
                for (let t = 0; t < latentLen; t++) {
                    // Box-Muller transform for normal distribution
                    // Add epsilon to avoid log(0)
                    const eps = 1e-10;
                    const u1 = Math.max(eps, Math.random());
                    const u2 = Math.random();
                    const randNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                    row.push(randNormal);
                }
                batch.push(row);
            }
            noisyLatent.push(batch);
        }

        const latentMask = getLatentMask(wavLengths, this.baseChunkSize, this.chunkCompressFactor);
        
        // Apply mask
        for (let b = 0; b < noisyLatent.length; b++) {
            for (let d = 0; d < noisyLatent[b].length; d++) {
                for (let t = 0; t < noisyLatent[b][d].length; t++) {
                    noisyLatent[b][d][t] *= latentMask[b][0][t];
                }
            }
        }

        return { noisyLatent, latentMask };
    }

    async _infer(textList, langList, style, totalStep, speed = 1.05) {
        if (textList.length !== style.ttl.dims[0]) {
            throw new Error('Number of texts must match number of style vectors');
        }
        const bsz = textList.length;
        const { textIds, textMask } = this.textProcessor.call(textList, langList);
        const textIdsShape = [bsz, textIds[0].length];
        const textMaskShape = [bsz, 1, textMask[0][0].length];
        
        const textMaskTensor = arrayToTensor(textMask, textMaskShape);
        
        const dpResult = await this.dpOrt.run({
            text_ids: intArrayToTensor(textIds, textIdsShape),
            style_dp: style.dp,
            text_mask: textMaskTensor
        });
        
        const durOnnx = Array.from(dpResult.duration.data);
        
        // Apply speed factor to duration
        for (let i = 0; i < durOnnx.length; i++) {
            durOnnx[i] /= speed;
        }
        
        const textEncResult = await this.textEncOrt.run({
            text_ids: intArrayToTensor(textIds, textIdsShape),
            style_ttl: style.ttl,
            text_mask: textMaskTensor
        });
        
        const textEmbTensor = textEncResult.text_emb;

        let { noisyLatent, latentMask } = this.sampleNoisyLatent(durOnnx);
        const latentShape = [bsz, noisyLatent[0].length, noisyLatent[0][0].length];
        const latentMaskShape = [bsz, 1, latentMask[0][0].length];
        
        const latentMaskTensor = arrayToTensor(latentMask, latentMaskShape);
        
        const totalStepArray = new Array(bsz).fill(totalStep);
        const scalarShape = [bsz];
        const totalStepTensor = arrayToTensor(totalStepArray, scalarShape);

        for (let step = 0; step < totalStep; step++) {
            const currentStepArray = new Array(bsz).fill(step);

            const vectorEstResult = await this.vectorEstOrt.run({
                noisy_latent: arrayToTensor(noisyLatent, latentShape),
                text_emb: textEmbTensor,
                style_ttl: style.ttl,
                text_mask: textMaskTensor,
                latent_mask: latentMaskTensor,
                total_step: totalStepTensor,
                current_step: arrayToTensor(currentStepArray, scalarShape)
            });

            const denoisedLatent = Array.from(vectorEstResult.denoised_latent.data);

            // Update latent with the denoised output
            let idx = 0;
            for (let b = 0; b < noisyLatent.length; b++) {
                for (let d = 0; d < noisyLatent[b].length; d++) {
                    for (let t = 0; t < noisyLatent[b][d].length; t++) {
                        noisyLatent[b][d][t] = denoisedLatent[idx++];
                    }
                }
            }
        }

        const vocoderResult = await this.vocoderOrt.run({
            latent: arrayToTensor(noisyLatent, latentShape)
        });

        const wav = Array.from(vocoderResult.wav_tts.data);
        return { wav, duration: durOnnx };
    }

    async call(text, lang, style, totalStep, speed = 1.05, silenceDuration = 0.3) {
        if (style.ttl.dims[0] !== 1) {
            throw new Error('Single speaker text to speech only supports single style');
        }
        const maxLen = (lang === 'ko' || lang === 'ja') ? 120 : 300;
        const textList = chunkText(text, maxLen);
        let wavCat = null;
        let durCat = 0;
        
        for (const chunk of textList) {
            const { wav, duration } = await this._infer([chunk], [lang], style, totalStep, speed);
            
            if (wavCat === null) {
                wavCat = wav;
                durCat = duration[0];
            } else {
                const silenceLen = Math.floor(silenceDuration * this.sampleRate);
                const silence = new Array(silenceLen).fill(0);
                wavCat = [...wavCat, ...silence, ...wav];
                durCat += duration[0] + silenceDuration;
            }
        }
        
        return { wav: wavCat, duration: [durCat] };
    }

    async batch(textList, langList, style, totalStep, speed = 1.05) {
        return await this._infer(textList, langList, style, totalStep, speed);
    }
}

/**
 * Convert lengths to binary mask
 */
function lengthToMask(lengths, maxLen = null) {
    maxLen = maxLen || Math.max(...lengths);
    const mask = [];
    for (let i = 0; i < lengths.length; i++) {
        const row = [];
        for (let j = 0; j < maxLen; j++) {
            row.push(j < lengths[i] ? 1.0 : 0.0);
        }
        mask.push([row]); // [B, 1, maxLen]
    }
    return mask;
}

/**
 * Get latent mask from wav lengths
 */
function getLatentMask(wavLengths, baseChunkSize, chunkCompressFactor) {
    const latentSize = baseChunkSize * chunkCompressFactor;
    const latentLengths = wavLengths.map(len => 
        Math.floor((len + latentSize - 1) / latentSize)
    );
    return lengthToMask(latentLengths);
}

/**
 * Load ONNX model
 */
async function loadOnnx(onnxPath, opts) {
    return await ort.InferenceSession.create(onnxPath, opts);
}

/**
 * Load all ONNX models for TTS
 */
async function loadOnnxAll(onnxDir, opts) {
    const dpPath = path.join(onnxDir, 'duration_predictor.onnx');
    const textEncPath = path.join(onnxDir, 'text_encoder.onnx');
    const vectorEstPath = path.join(onnxDir, 'vector_estimator.onnx');
    const vocoderPath = path.join(onnxDir, 'vocoder.onnx');

    const [dpOrt, textEncOrt, vectorEstOrt, vocoderOrt] = await Promise.all([
        loadOnnx(dpPath, opts),
        loadOnnx(textEncPath, opts),
        loadOnnx(vectorEstPath, opts),
        loadOnnx(vocoderPath, opts)
    ]);

    return { dpOrt, textEncOrt, vectorEstOrt, vocoderOrt };
}

/**
 * Load configuration
 */
function loadCfgs(onnxDir) {
    const cfgPath = path.join(onnxDir, 'tts.json');
    const cfgs = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return cfgs;
}

/**
 * Load text processor
 */
function loadTextProcessor(onnxDir) {
    const unicodeIndexerPath = path.join(onnxDir, 'unicode_indexer.json');
    const textProcessor = new UnicodeProcessor(unicodeIndexerPath);
    return textProcessor;
}

/**
 * Load voice style from JSON file
 */
export function loadVoiceStyle(voiceStylePaths, verbose = false) {
    const bsz = voiceStylePaths.length;
    
    // Read first file to get dimensions
    const firstStyle = JSON.parse(fs.readFileSync(voiceStylePaths[0], 'utf8'));
    const ttlDims = firstStyle.style_ttl.dims;
    const dpDims = firstStyle.style_dp.dims;
    
    const ttlDim1 = ttlDims[1];
    const ttlDim2 = ttlDims[2];
    const dpDim1 = dpDims[1];
    const dpDim2 = dpDims[2];
    
    // Pre-allocate arrays with full batch size
    const ttlSize = bsz * ttlDim1 * ttlDim2;
    const dpSize = bsz * dpDim1 * dpDim2;
    const ttlFlat = new Float32Array(ttlSize);
    const dpFlat = new Float32Array(dpSize);
    
    // Fill in the data
    for (let i = 0; i < bsz; i++) {
        const voiceStyle = JSON.parse(fs.readFileSync(voiceStylePaths[i], 'utf8'));
        
        const ttlData = voiceStyle.style_ttl.data.flat(Infinity);
        const ttlOffset = i * ttlDim1 * ttlDim2;
        ttlFlat.set(ttlData, ttlOffset);
        
        const dpData = voiceStyle.style_dp.data.flat(Infinity);
        const dpOffset = i * dpDim1 * dpDim2;
        dpFlat.set(dpData, dpOffset);
    }
    
    const ttlStyle = new ort.Tensor('float32', ttlFlat, [bsz, ttlDim1, ttlDim2]);
    const dpStyle = new ort.Tensor('float32', dpFlat, [bsz, dpDim1, dpDim2]);
    
    if (verbose) {
        console.log(`Loaded ${bsz} voice styles`);
    }
    
    return new Style(ttlStyle, dpStyle);
}

/**
 * Load text to speech components
 */
export async function loadTextToSpeech(onnxDir, useGpu = false) {
    const opts = {};
    if (useGpu) {
        throw new Error('GPU mode is not supported yet');
    } else {
        console.log('Using CPU for inference');
    }
    
    const cfgs = loadCfgs(onnxDir);
    const { dpOrt, textEncOrt, vectorEstOrt, vocoderOrt } = await loadOnnxAll(onnxDir, opts);
    const textProcessor = loadTextProcessor(onnxDir);
    const textToSpeech = new TextToSpeech(cfgs, textProcessor, dpOrt, textEncOrt, vectorEstOrt, vocoderOrt);
    
    return textToSpeech;
}

/**
 * Convert 3D array to ONNX tensor
 */
function arrayToTensor(array, dims) {
    // Flatten the array
    const flat = array.flat(Infinity);
    return new ort.Tensor('float32', Float32Array.from(flat), dims);
}

/**
 * Convert 2D int array to ONNX tensor
 */
function intArrayToTensor(array, dims) {
    const flat = array.flat(Infinity);
    return new ort.Tensor('int64', BigInt64Array.from(flat.map(x => BigInt(x))), dims);
}

/**
 * Write WAV file
 */
export function writeWavFile(filename, audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = audioData.length * bitsPerSample / 8;

    const buffer = Buffer.alloc(44 + dataSize);
    
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Write audio data
    for (let i = 0; i < audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    fs.writeFileSync(filename, buffer);
}

/**
 * Timer utility for measuring execution time
 */
export async function timer(name, fn) {
    const start = Date.now();
    console.log(`${name}...`);
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  -> ${name} completed in ${elapsed} sec`);
    return result;
}

/**
 * Sanitize filename by replacing non-alphanumeric characters with underscores (supports Unicode)
 */
export function sanitizeFilename(text, maxLen) {
    const prefix = text.substring(0, maxLen);
    // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
    return prefix.replace(/[^\p{L}\p{N}_]/gu, '_');
}

/**
 * Chunk text into manageable segments
 */
function chunkText(text, maxLen = 300) {
    if (typeof text !== 'string') {
        throw new Error(`chunkText expects a string, got ${typeof text}`);
    }
    
    // Split by paragraph (two or more newlines)
    const paragraphs = text.trim().split(/\n\s*\n+/).filter(p => p.trim());
    
    const chunks = [];
    
    for (let paragraph of paragraphs) {
        paragraph = paragraph.trim();
        if (!paragraph) continue;
        
        // Split by sentence boundaries (period, question mark, exclamation mark followed by space)
        // But exclude common abbreviations like Mr., Mrs., Dr., etc. and single capital letters like F.
        const sentences = paragraph.split(/(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/);
        
        let currentChunk = "";
        
        for (let sentence of sentences) {
            if (currentChunk.length + sentence.length + 1 <= maxLen) {
                currentChunk += (currentChunk ? " " : "") + sentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence;
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
    }
    
    return chunks;
}
