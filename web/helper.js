import * as ort from 'onnxruntime-web';

// Set path for ONNX Runtime WebAssembly files
ort.env.wasm.wasmPaths = '/wasm/';

// Available languages for multilingual TTS
export const AVAILABLE_LANGS = ['en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi', 'na'];

export function isValidLang(lang) {
    return AVAILABLE_LANGS.includes(lang);
}

/**
 * Unicode Text Processor
 */
export class UnicodeProcessor {
    constructor(indexer) {
        this.indexer = indexer;
    }

    call(textList, langList) {
        const processedTexts = textList.map((text, i) => this.preprocessText(text, langList[i]));
        
        const textIdsLengths = processedTexts.map(text => text.length);
        const maxLen = Math.max(...textIdsLengths);
        
        const textIds = processedTexts.map(text => {
            const row = new Array(maxLen).fill(0);
            for (let j = 0; j < text.length; j++) {
                const codePoint = text.codePointAt(j);
                row[j] = (codePoint < this.indexer.length) ? this.indexer[codePoint] : -1;
            }
            return row;
        });
        
        const textMask = this.getTextMask(textIdsLengths);
        return { textIds, textMask };
    }

    preprocessText(text, lang) {
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
        if (!isValidLang(lang)) {
            throw new Error(`Invalid language: ${lang}. Available: ${AVAILABLE_LANGS.join(', ')}`);
        }

        // Wrap text with language tags
        text = `<${lang}>${text}</${lang}>`;

        return text;
    }

    getTextMask(textIdsLengths) {
        const maxLen = Math.max(...textIdsLengths);
        return this.lengthToMask(textIdsLengths, maxLen);
    }

    lengthToMask(lengths, maxLen = null) {
        const actualMaxLen = maxLen || Math.max(...lengths);
        return lengths.map(len => {
            const row = new Array(actualMaxLen).fill(0.0);
            for (let j = 0; j < Math.min(len, actualMaxLen); j++) {
                row[j] = 1.0;
            }
            return [row];
        });
    }
}

/**
 * Style class to hold TTL and DP tensors
 */
export class Style {
    constructor(ttlTensor, dpTensor) {
        this.ttl = ttlTensor;
        this.dp = dpTensor;
    }
}

/**
 * Text-to-Speech class
 */
export class TextToSpeech {
    constructor(cfgs, textProcessor, dpOrt, textEncOrt, vectorEstOrt, vocoderOrt) {
        this.cfgs = cfgs;
        this.textProcessor = textProcessor;
        this.dpOrt = dpOrt;
        this.textEncOrt = textEncOrt;
        this.vectorEstOrt = vectorEstOrt;
        this.vocoderOrt = vocoderOrt;
        this.sampleRate = cfgs.ae.sample_rate;
    }

    async _infer(textList, langList, style, totalStep, speed = 1.05, progressCallback = null) {
        const bsz = textList.length;
        
        // Process text
        const { textIds, textMask } = this.textProcessor.call(textList, langList);
        
        const textIdsFlat = new BigInt64Array(textIds.flat().map(x => BigInt(x)));
        const textIdsShape = [bsz, textIds[0].length];
        const textIdsTensor = new ort.Tensor('int64', textIdsFlat, textIdsShape);
        
        const textMaskFlat = new Float32Array(textMask.flat(2));
        const textMaskShape = [bsz, 1, textMask[0][0].length];
        const textMaskTensor = new ort.Tensor('float32', textMaskFlat, textMaskShape);
        
        // Predict duration
        const dpOutputs = await this.dpOrt.run({
            text_ids: textIdsTensor,
            style_dp: style.dp,
            text_mask: textMaskTensor
        });
        const duration = Array.from(dpOutputs.duration.data);
        
        // Apply speed factor to duration
        for (let i = 0; i < duration.length; i++) {
            duration[i] /= speed;
        }
        
        // Encode text
        const textEncOutputs = await this.textEncOrt.run({
            text_ids: textIdsTensor,
            style_ttl: style.ttl,
            text_mask: textMaskTensor
        });
        const textEmb = textEncOutputs.text_emb;
        
        // Sample noisy latent
        let { xt, latentMask } = this.sampleNoisyLatent(
            duration,
            this.sampleRate,
            this.cfgs.ae.base_chunk_size,
            this.cfgs.ttl.chunk_compress_factor,
            this.cfgs.ttl.latent_dim
        );
        
        const latentMaskFlat = new Float32Array(latentMask.flat(2));
        const latentMaskShape = [bsz, 1, latentMask[0][0].length];
        const latentMaskTensor = new ort.Tensor('float32', latentMaskFlat, latentMaskShape);
        
        // Prepare constant arrays
        const totalStepArray = new Float32Array(bsz).fill(totalStep);
        const totalStepTensor = new ort.Tensor('float32', totalStepArray, [bsz]);
        
        // Denoising loop
        for (let step = 0; step < totalStep; step++) {
            if (progressCallback) {
                progressCallback(step + 1, totalStep);
            }
            
            const currentStepArray = new Float32Array(bsz).fill(step);
            const currentStepTensor = new ort.Tensor('float32', currentStepArray, [bsz]);
            
            const xtFlat = new Float32Array(xt.flat(2));
            const xtShape = [bsz, xt[0].length, xt[0][0].length];
            const xtTensor = new ort.Tensor('float32', xtFlat, xtShape);
            
            const vectorEstOutputs = await this.vectorEstOrt.run({
                noisy_latent: xtTensor,
                text_emb: textEmb,
                style_ttl: style.ttl,
                latent_mask: latentMaskTensor,
                text_mask: textMaskTensor,
                current_step: currentStepTensor,
                total_step: totalStepTensor
            });
            
            const denoised = Array.from(vectorEstOutputs.denoised_latent.data);
            
            // Reshape to 3D
            const latentDim = xt[0].length;
            const latentLen = xt[0][0].length;
            xt = [];
            let idx = 0;
            for (let b = 0; b < bsz; b++) {
                const batch = [];
                for (let d = 0; d < latentDim; d++) {
                    const row = [];
                    for (let t = 0; t < latentLen; t++) {
                        row.push(denoised[idx++]);
                    }
                    batch.push(row);
                }
                xt.push(batch);
            }
        }
        
        // Generate waveform
        const finalXtFlat = new Float32Array(xt.flat(2));
        const finalXtShape = [bsz, xt[0].length, xt[0][0].length];
        const finalXtTensor = new ort.Tensor('float32', finalXtFlat, finalXtShape);
        
        const vocoderOutputs = await this.vocoderOrt.run({
            latent: finalXtTensor
        });
        
        const wav = Array.from(vocoderOutputs.wav_tts.data);
        
        return { wav, duration };
    }

    async call(text, lang, style, totalStep, speed = 1.05, silenceDuration = 0.3, progressCallback = null) {
        if (style.ttl.dims[0] !== 1) {
            throw new Error('Single speaker text to speech only supports single style');
        }
        const maxLen = (lang === 'ko' || lang === 'ja') ? 120 : 300;
        const textList = chunkText(text, maxLen);
        const langList = new Array(textList.length).fill(lang);
        let wavCat = [];
        let durCat = 0;
        
        for (let i = 0; i < textList.length; i++) {
            const { wav, duration } = await this._infer([textList[i]], [langList[i]], style, totalStep, speed, progressCallback);
            
            if (wavCat.length === 0) {
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

    async batch(textList, langList, style, totalStep, speed = 1.05, progressCallback = null) {
        return await this._infer(textList, langList, style, totalStep, speed, progressCallback);
    }

    sampleNoisyLatent(duration, sampleRate, baseChunkSize, chunkCompress, latentDim) {
        const bsz = duration.length;
        const maxDur = Math.max(...duration);
        
        const wavLenMax = Math.floor(maxDur * sampleRate);
        const wavLengths = duration.map(d => Math.floor(d * sampleRate));
        
        const chunkSize = baseChunkSize * chunkCompress;
        const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
        const latentDimVal = latentDim * chunkCompress;
        
        const xt = [];
        for (let b = 0; b < bsz; b++) {
            const batch = [];
            for (let d = 0; d < latentDimVal; d++) {
                const row = [];
                for (let t = 0; t < latentLen; t++) {
                    // Box-Muller transform
                    const u1 = Math.max(0.0001, Math.random());
                    const u2 = Math.random();
                    const val = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                    row.push(val);
                }
                batch.push(row);
            }
            xt.push(batch);
        }
        
        const latentLengths = wavLengths.map(len => Math.floor((len + chunkSize - 1) / chunkSize));
        const latentMask = this.lengthToMask(latentLengths, latentLen);
        
        // Apply mask
        for (let b = 0; b < bsz; b++) {
            for (let d = 0; d < latentDimVal; d++) {
                for (let t = 0; t < latentLen; t++) {
                    xt[b][d][t] *= latentMask[b][0][t];
                }
            }
        }
        
        return { xt, latentMask };
    }

    lengthToMask(lengths, maxLen = null) {
        const actualMaxLen = maxLen || Math.max(...lengths);
        return lengths.map(len => {
            const row = new Array(actualMaxLen).fill(0.0);
            for (let j = 0; j < Math.min(len, actualMaxLen); j++) {
                row[j] = 1.0;
            }
            return [row];
        });
    }
}

/**
 * Load voice style from JSON files
 */
export async function loadVoiceStyle(voiceStylePaths, verbose = false) {
    const bsz = voiceStylePaths.length;
    
    // Read first file to get dimensions
    const firstResponse = await fetch(voiceStylePaths[0]);
    const firstStyle = await firstResponse.json();
    
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
        const response = await fetch(voiceStylePaths[i]);
        const voiceStyle = await response.json();
        
        // Flatten TTL data
        const ttlData = voiceStyle.style_ttl.data.flat(Infinity);
        const ttlOffset = i * ttlDim1 * ttlDim2;
        ttlFlat.set(ttlData, ttlOffset);
        
        // Flatten DP data
        const dpData = voiceStyle.style_dp.data.flat(Infinity);
        const dpOffset = i * dpDim1 * dpDim2;
        dpFlat.set(dpData, dpOffset);
    }
    
    const ttlShape = [bsz, ttlDim1, ttlDim2];
    const dpShape = [bsz, dpDim1, dpDim2];
    
    const ttlTensor = new ort.Tensor('float32', ttlFlat, ttlShape);
    const dpTensor = new ort.Tensor('float32', dpFlat, dpShape);
    
    if (verbose) {
        console.log(`Loaded ${bsz} voice styles`);
    }
    
    return new Style(ttlTensor, dpTensor);
}

/**
 * Load configuration from JSON
 */
export async function loadCfgs(onnxDir) {
    const response = await fetch(`${onnxDir}/tts.json`);
    const cfgs = await response.json();
    return cfgs;
}

/**
 * Load text processor
 */
export async function loadTextProcessor(onnxDir) {
    const response = await fetch(`${onnxDir}/unicode_indexer.json`);
    const indexer = await response.json();
    return new UnicodeProcessor(indexer);
}

/**
 * Load ONNX model
 */
export async function loadOnnx(onnxPath, options) {
    const session = await ort.InferenceSession.create(onnxPath, options);
    return session;
}

/**
 * Load all TTS components
 */
export async function loadTextToSpeech(onnxDir, sessionOptions = {}, progressCallback = null) {
    console.log('Using WebAssembly/WebGPU for inference');
    
    const cfgs = await loadCfgs(onnxDir);
    
    const dpPath = `${onnxDir}/duration_predictor.onnx`;
    const textEncPath = `${onnxDir}/text_encoder.onnx`;
    const vectorEstPath = `${onnxDir}/vector_estimator.onnx`;
    const vocoderPath = `${onnxDir}/vocoder.onnx`;
    
    const modelPaths = [
        { name: 'Duration Predictor', path: dpPath },
        { name: 'Text Encoder', path: textEncPath },
        { name: 'Vector Estimator', path: vectorEstPath },
        { name: 'Vocoder', path: vocoderPath }
    ];
    
    const sessions = [];
    for (let i = 0; i < modelPaths.length; i++) {
        if (progressCallback) {
            progressCallback(modelPaths[i].name, i + 1, modelPaths.length);
        }
        const session = await loadOnnx(modelPaths[i].path, sessionOptions);
        sessions.push(session);
    }
    
    const [dpOrt, textEncOrt, vectorEstOrt, vocoderOrt] = sessions;
    
    const textProcessor = await loadTextProcessor(onnxDir);
    const textToSpeech = new TextToSpeech(cfgs, textProcessor, dpOrt, textEncOrt, vectorEstOrt, vocoderOrt);
    
    return { textToSpeech, cfgs };
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

/**
 * Write WAV file to ArrayBuffer
 */
export function writeWavFile(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = audioData.length * 2;
    
    // Create ArrayBuffer
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
        const clamped = Math.max(-1.0, Math.min(1.0, audioData[i]));
        int16Data[i] = Math.floor(clamped * 32767);
    }
    
    const dataView = new Uint8Array(buffer, 44);
    dataView.set(new Uint8Array(int16Data.buffer));
    
    return buffer;
}
