import ai.onnxruntime.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.LongBuffer;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

/**
 * Available languages for multilingual TTS
 */
class Languages {
    public static final List<String> AVAILABLE = Arrays.asList("en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na");
    
    public static boolean isValid(String lang) {
        return AVAILABLE.contains(lang);
    }
}

/**
 * Configuration classes
 */
class Config {
    static class AEConfig {
        int sampleRate;
        int baseChunkSize;
    }
    
    static class TTLConfig {
        int chunkCompressFactor;
        int latentDim;
    }
    
    AEConfig ae;
    TTLConfig ttl;
}

/**
 * Voice Style Data from JSON
 */
class VoiceStyleData {
    static class StyleData {
        float[][][] data;
        long[] dims;
        String type;
    }
    
    StyleData styleTtl;
    StyleData styleDp;
}

/**
 * Unicode text processor
 */
class UnicodeProcessor {
    private long[] indexer;
    
    public UnicodeProcessor(String unicodeIndexerJsonPath) throws IOException {
        this.indexer = Helper.loadJsonLongArray(unicodeIndexerJsonPath);
    }
    
    private static String removeEmojis(String text) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            int codePoint;
            if (Character.isHighSurrogate(text.charAt(i)) && i + 1 < text.length() && Character.isLowSurrogate(text.charAt(i + 1))) {
                codePoint = Character.codePointAt(text, i);
                i++; // Skip the low surrogate
            } else {
                codePoint = text.charAt(i);
            }
            
            // Check if code point is in emoji ranges
            boolean isEmoji = (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
                              (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) ||
                              (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
                              (codePoint >= 0x1F700 && codePoint <= 0x1F77F) ||
                              (codePoint >= 0x1F780 && codePoint <= 0x1F7FF) ||
                              (codePoint >= 0x1F800 && codePoint <= 0x1F8FF) ||
                              (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) ||
                              (codePoint >= 0x1FA00 && codePoint <= 0x1FA6F) ||
                              (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF) ||
                              (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
                              (codePoint >= 0x2700 && codePoint <= 0x27BF) ||
                              (codePoint >= 0x1F1E6 && codePoint <= 0x1F1FF);
            
            if (!isEmoji) {
                if (codePoint > 0xFFFF) {
                    result.append(Character.toChars(codePoint));
                } else {
                    result.append((char) codePoint);
                }
            }
        }
        return result.toString();
    }
    
    public TextProcessResult call(List<String> textList, List<String> langList) {
        List<String> processedTexts = new ArrayList<>();
        for (int i = 0; i < textList.size(); i++) {
            processedTexts.add(preprocessText(textList.get(i), langList.get(i)));
        }
        
        // Convert texts to unicode values first to get correct character counts
        List<int[]> allUnicodeVals = new ArrayList<>();
        for (String text : processedTexts) {
            allUnicodeVals.add(textToUnicodeValues(text));
        }
        
        int[] textIdsLengths = new int[processedTexts.size()];
        int maxLen = 0;
        for (int i = 0; i < allUnicodeVals.size(); i++) {
            textIdsLengths[i] = allUnicodeVals.get(i).length;  // Use code point count, not char count
            maxLen = Math.max(maxLen, textIdsLengths[i]);
        }
        
        long[][] textIds = new long[processedTexts.size()][maxLen];
        for (int i = 0; i < allUnicodeVals.size(); i++) {
            int[] unicodeVals = allUnicodeVals.get(i);
            for (int j = 0; j < unicodeVals.length; j++) {
                textIds[i][j] = indexer[unicodeVals[j]];
            }
        }
        
        float[][][] textMask = getTextMask(textIdsLengths);
        return new TextProcessResult(textIds, textMask);
    }
    
    private String preprocessText(String text, String lang) {
        // TODO: Need advanced normalizer for better performance
        text = Normalizer.normalize(text, Normalizer.Form.NFKD);

        // Remove emojis (wide Unicode range)
        // Java Pattern doesn't support \x{...} syntax for Unicode above \uFFFF
        // Use character filtering instead
        text = removeEmojis(text);

        // Replace various dashes and symbols
        Map<String, String> replacements = new HashMap<>();
        replacements.put("–", "-");      // en dash
        replacements.put("‑", "-");      // non-breaking hyphen
        replacements.put("—", "-");      // em dash
        replacements.put("_", " ");      // underscore
        replacements.put("\u201C", "\"");     // left double quote
        replacements.put("\u201D", "\"");     // right double quote
        replacements.put("\u2018", "'");      // left single quote
        replacements.put("\u2019", "'");      // right single quote
        replacements.put("´", "'");      // acute accent
        replacements.put("`", "'");      // grave accent
        replacements.put("[", " ");      // left bracket
        replacements.put("]", " ");      // right bracket
        replacements.put("|", " ");      // vertical bar
        replacements.put("/", " ");      // slash
        replacements.put("#", " ");      // hash
        replacements.put("→", " ");      // right arrow
        replacements.put("←", " ");      // left arrow

        for (Map.Entry<String, String> entry : replacements.entrySet()) {
            text = text.replace(entry.getKey(), entry.getValue());
        }

        // Remove special symbols
        text = text.replaceAll("[♥☆♡©\\\\]", "");

        // Replace known expressions
        Map<String, String> exprReplacements = new HashMap<>();
        exprReplacements.put("@", " at ");
        exprReplacements.put("e.g.,", "for example, ");
        exprReplacements.put("i.e.,", "that is, ");

        for (Map.Entry<String, String> entry : exprReplacements.entrySet()) {
            text = text.replace(entry.getKey(), entry.getValue());
        }

        // Fix spacing around punctuation
        text = text.replaceAll(" ,", ",");
        text = text.replaceAll(" \\.", ".");
        text = text.replaceAll(" !", "!");
        text = text.replaceAll(" \\?", "?");
        text = text.replaceAll(" ;", ";");
        text = text.replaceAll(" :", ":");
        text = text.replaceAll(" '", "'");

        // Remove duplicate quotes
        while (text.contains("\"\"")) {
            text = text.replace("\"\"", "\"");
        }
        while (text.contains("''")) {
            text = text.replace("''", "'");
        }
        while (text.contains("``")) {
            text = text.replace("``", "`");
        }

        // Remove extra spaces
        text = text.replaceAll("\\s+", " ").trim();

        // If text doesn't end with punctuation, quotes, or closing brackets, add a period
        if (!text.matches(".*[.!?;:,'\"\\u201C\\u201D\\u2018\\u2019)\\]}…。」』】〉》›»]$")) {
            text += ".";
        }

        // Validate language
        if (!Languages.isValid(lang)) {
            throw new IllegalArgumentException("Invalid language: " + lang + ". Available: " + Languages.AVAILABLE);
        }

        // Wrap text with language tags
        text = "<" + lang + ">" + text + "</" + lang + ">";

        return text;
    }
    
    private int[] textToUnicodeValues(String text) {
        // Use codePoints() stream to correctly handle surrogate pairs
        return text.codePoints().toArray();
    }
    
    private float[][][] getTextMask(int[] lengths) {
        int bsz = lengths.length;
        int maxLen = 0;
        for (int len : lengths) {
            maxLen = Math.max(maxLen, len);
        }
        
        float[][][] mask = new float[bsz][1][maxLen];
        for (int i = 0; i < bsz; i++) {
            for (int j = 0; j < maxLen; j++) {
                mask[i][0][j] = j < lengths[i] ? 1.0f : 0.0f;
            }
        }
        return mask;
    }
    
    static class TextProcessResult {
        long[][] textIds;
        float[][][] textMask;
        
        TextProcessResult(long[][] textIds, float[][][] textMask) {
            this.textIds = textIds;
            this.textMask = textMask;
        }
    }
}

/**
 * Text-to-Speech inference class
 */
class TextToSpeech {
    private Config config;
    private UnicodeProcessor textProcessor;
    private OrtSession dpSession;
    private OrtSession textEncSession;
    private OrtSession vectorEstSession;
    private OrtSession vocoderSession;
    public int sampleRate;
    private int baseChunkSize;
    private int chunkCompress;
    private int ldim;
    
    public TextToSpeech(Config config, UnicodeProcessor textProcessor,
                       OrtSession dpSession, OrtSession textEncSession,
                       OrtSession vectorEstSession, OrtSession vocoderSession) {
        this.config = config;
        this.textProcessor = textProcessor;
        this.dpSession = dpSession;
        this.textEncSession = textEncSession;
        this.vectorEstSession = vectorEstSession;
        this.vocoderSession = vocoderSession;
        this.sampleRate = config.ae.sampleRate;
        this.baseChunkSize = config.ae.baseChunkSize;
        this.chunkCompress = config.ttl.chunkCompressFactor;
        this.ldim = config.ttl.latentDim;
    }
    
    private TTSResult _infer(List<String> textList, List<String> langList, Style style, int totalStep, float speed, OrtEnvironment env) 
            throws OrtException {
        int bsz = textList.size();
        
        // Process text
        UnicodeProcessor.TextProcessResult textResult = textProcessor.call(textList, langList);
        long[][] textIds = textResult.textIds;
        float[][][] textMask = textResult.textMask;
        
        // Create tensors
        OnnxTensor textIdsTensor = Helper.createLongTensor(textIds, env);
        OnnxTensor textMaskTensor = Helper.createFloatTensor(textMask, env);
        
        // Predict duration
        Map<String, OnnxTensor> dpInputs = new HashMap<>();
        dpInputs.put("text_ids", textIdsTensor);
        dpInputs.put("style_dp", style.dpTensor);
        dpInputs.put("text_mask", textMaskTensor);
        
        OrtSession.Result dpResult = dpSession.run(dpInputs);
        Object dpValue = dpResult.get(0).getValue();
        float[] duration;
        if (dpValue instanceof float[][]) {
            duration = ((float[][]) dpValue)[0];
        } else {
            duration = (float[]) dpValue;
        }
        
        // Apply speed factor to duration
        for (int i = 0; i < duration.length; i++) {
            duration[i] /= speed;
        }
        
        // Encode text
        Map<String, OnnxTensor> textEncInputs = new HashMap<>();
        textEncInputs.put("text_ids", textIdsTensor);
        textEncInputs.put("style_ttl", style.ttlTensor);
        textEncInputs.put("text_mask", textMaskTensor);
        
        OrtSession.Result textEncResult = textEncSession.run(textEncInputs);
        OnnxTensor textEmbTensor = (OnnxTensor) textEncResult.get(0);
        
        // Sample noisy latent
        NoisyLatentResult noisyLatentResult = sampleNoisyLatent(duration);
        float[][][] xt = noisyLatentResult.noisyLatent;
        float[][][] latentMask = noisyLatentResult.latentMask;
        
        // Prepare constant tensors
        float[] totalStepArray = new float[bsz];
        Arrays.fill(totalStepArray, (float) totalStep);
        OnnxTensor totalStepTensor = OnnxTensor.createTensor(env, totalStepArray);
        
        // Denoising loop
        for (int step = 0; step < totalStep; step++) {
            float[] currentStepArray = new float[bsz];
            Arrays.fill(currentStepArray, (float) step);
            OnnxTensor currentStepTensor = OnnxTensor.createTensor(env, currentStepArray);
            OnnxTensor noisyLatentTensor = Helper.createFloatTensor(xt, env);
            OnnxTensor latentMaskTensor = Helper.createFloatTensor(latentMask, env);
            OnnxTensor textMaskTensor2 = Helper.createFloatTensor(textMask, env);
            
            Map<String, OnnxTensor> vectorEstInputs = new HashMap<>();
            vectorEstInputs.put("noisy_latent", noisyLatentTensor);
            vectorEstInputs.put("text_emb", textEmbTensor);
            vectorEstInputs.put("style_ttl", style.ttlTensor);
            vectorEstInputs.put("latent_mask", latentMaskTensor);
            vectorEstInputs.put("text_mask", textMaskTensor2);
            vectorEstInputs.put("current_step", currentStepTensor);
            vectorEstInputs.put("total_step", totalStepTensor);
            
            OrtSession.Result vectorEstResult = vectorEstSession.run(vectorEstInputs);
            float[][][] denoised = (float[][][]) vectorEstResult.get(0).getValue();
            
            // Update latent
            xt = denoised;
            
            // Clean up
            currentStepTensor.close();
            noisyLatentTensor.close();
            latentMaskTensor.close();
            textMaskTensor2.close();
            vectorEstResult.close();
        }
        
        // Generate waveform
        OnnxTensor finalLatentTensor = Helper.createFloatTensor(xt, env);
        Map<String, OnnxTensor> vocoderInputs = new HashMap<>();
        vocoderInputs.put("latent", finalLatentTensor);
        
        OrtSession.Result vocoderResult = vocoderSession.run(vocoderInputs);
        float[][] wavBatch = (float[][]) vocoderResult.get(0).getValue();
        
        // Flatten all batch audio into a single array for batch processing
        int totalSamples = 0;
        for (float[] w : wavBatch) {
            totalSamples += w.length;
        }
        float[] wav = new float[totalSamples];
        int offset = 0;
        for (float[] w : wavBatch) {
            System.arraycopy(w, 0, wav, offset, w.length);
            offset += w.length;
        }
        
        // Clean up
        textIdsTensor.close();
        textMaskTensor.close();
        dpResult.close();
        textEncResult.close();
        totalStepTensor.close();
        finalLatentTensor.close();
        vocoderResult.close();
        
        return new TTSResult(wav, duration);
    }
    
    private NoisyLatentResult sampleNoisyLatent(float[] duration) {
        int bsz = duration.length;
        float maxDur = 0;
        for (float d : duration) {
            maxDur = Math.max(maxDur, d);
        }
        
        long wavLenMax = (long) (maxDur * sampleRate);
        long[] wavLengths = new long[bsz];
        for (int i = 0; i < bsz; i++) {
            wavLengths[i] = (long) (duration[i] * sampleRate);
        }
        
        int chunkSize = baseChunkSize * chunkCompress;
        int latentLen = (int) ((wavLenMax + chunkSize - 1) / chunkSize);
        int latentDim = ldim * chunkCompress;
        
        Random rng = new Random();
        float[][][] noisyLatent = new float[bsz][latentDim][latentLen];
        for (int b = 0; b < bsz; b++) {
            for (int d = 0; d < latentDim; d++) {
                for (int t = 0; t < latentLen; t++) {
                    // Box-Muller transform
                    double u1 = Math.max(1e-10, rng.nextDouble());
                    double u2 = rng.nextDouble();
                    noisyLatent[b][d][t] = (float) (Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2));
                }
            }
        }
        
        float[][][] latentMask = Helper.getLatentMask(wavLengths, config);
        
        // Apply mask
        for (int b = 0; b < bsz; b++) {
            for (int d = 0; d < latentDim; d++) {
                for (int t = 0; t < latentLen; t++) {
                    noisyLatent[b][d][t] *= latentMask[b][0][t];
                }
            }
        }
        
        return new NoisyLatentResult(noisyLatent, latentMask);
    }
    
    /**
     * Synthesize speech from a single text with automatic chunking
     */
    public TTSResult call(String text, String lang, Style style, int totalStep, float speed, float silenceDuration, OrtEnvironment env) 
            throws OrtException {
        int maxLen = (lang.equals("ko") || lang.equals("ja")) ? 120 : 300;
        List<String> chunks = Helper.chunkText(text, maxLen);
        
        List<Float> wavCat = new ArrayList<>();
        float durCat = 0.0f;
        
        for (int i = 0; i < chunks.size(); i++) {
            TTSResult result = _infer(Arrays.asList(chunks.get(i)), Arrays.asList(lang), style, totalStep, speed, env);
            
            float dur = result.duration[0];
            int wavLen = (int) (sampleRate * dur);
            float[] wavChunk = new float[wavLen];
            System.arraycopy(result.wav, 0, wavChunk, 0, Math.min(wavLen, result.wav.length));
            
            if (i == 0) {
                for (float val : wavChunk) {
                    wavCat.add(val);
                }
                durCat = dur;
            } else {
                int silenceLen = (int) (silenceDuration * sampleRate);
                for (int j = 0; j < silenceLen; j++) {
                    wavCat.add(0.0f);
                }
                for (float val : wavChunk) {
                    wavCat.add(val);
                }
                durCat += silenceDuration + dur;
            }
        }
        
        float[] wavArray = new float[wavCat.size()];
        for (int i = 0; i < wavCat.size(); i++) {
            wavArray[i] = wavCat.get(i);
        }
        
        return new TTSResult(wavArray, new float[]{durCat});
    }
    
    /**
     * Batch synthesize speech from multiple texts
     */
    public TTSResult batch(List<String> textList, List<String> langList, Style style, int totalStep, float speed, OrtEnvironment env) 
            throws OrtException {
        return _infer(textList, langList, style, totalStep, speed, env);
    }
    
    public void close() throws OrtException {
        if (dpSession != null) dpSession.close();
        if (textEncSession != null) textEncSession.close();
        if (vectorEstSession != null) vectorEstSession.close();
        if (vocoderSession != null) vocoderSession.close();
    }
}

/**
 * Style holder class
 */
class Style {
    OnnxTensor ttlTensor;
    OnnxTensor dpTensor;
    
    Style(OnnxTensor ttlTensor, OnnxTensor dpTensor) {
        this.ttlTensor = ttlTensor;
        this.dpTensor = dpTensor;
    }
    
    public void close() throws OrtException {
        if (ttlTensor != null) ttlTensor.close();
        if (dpTensor != null) dpTensor.close();
    }
}

/**
 * TTS result holder
 */
class TTSResult {
    float[] wav;
    float[] duration;
    
    TTSResult(float[] wav, float[] duration) {
        this.wav = wav;
        this.duration = duration;
    }
}

/**
 * Noisy latent result holder
 */
class NoisyLatentResult {
    float[][][] noisyLatent;
    float[][][] latentMask;
    
    NoisyLatentResult(float[][][] noisyLatent, float[][][] latentMask) {
        this.noisyLatent = noisyLatent;
        this.latentMask = latentMask;
    }
}

/**
 * Helper utility class
 */
public class Helper {
    
    private static final int MAX_CHUNK_LENGTH = 300;
    private static final String[] ABBREVIATIONS = {
        "Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Sr.", "Jr.",
        "St.", "Ave.", "Rd.", "Blvd.", "Dept.", "Inc.", "Ltd.",
        "Co.", "Corp.", "etc.", "vs.", "i.e.", "e.g.", "Ph.D."
    };
    
    /**
     * Chunk text into smaller segments based on paragraphs and sentences
     */
    public static List<String> chunkText(String text, int maxLen) {
        if (maxLen == 0) {
            maxLen = MAX_CHUNK_LENGTH;
        }
        
        text = text.trim();
        if (text.isEmpty()) {
            return Arrays.asList("");
        }
        
        // Split by paragraphs
        String[] paragraphs = text.split("\\n\\s*\\n");
        List<String> chunks = new ArrayList<>();
        
        for (String para : paragraphs) {
            para = para.trim();
            if (para.isEmpty()) {
                continue;
            }
            
            if (para.length() <= maxLen) {
                chunks.add(para);
                continue;
            }
            
            // Split by sentences
            List<String> sentences = splitSentences(para);
            StringBuilder current = new StringBuilder();
            int currentLen = 0;
            
            for (String sentence : sentences) {
                sentence = sentence.trim();
                if (sentence.isEmpty()) {
                    continue;
                }
                
                int sentenceLen = sentence.length();
                if (sentenceLen > maxLen) {
                    // If sentence is longer than maxLen, split by comma or space
                    if (current.length() > 0) {
                        chunks.add(current.toString().trim());
                        current.setLength(0);
                        currentLen = 0;
                    }
                    
                    // Try splitting by comma
                    String[] parts = sentence.split(",");
                    for (String part : parts) {
                        part = part.trim();
                        if (part.isEmpty()) {
                            continue;
                        }
                        
                        int partLen = part.length();
                        if (partLen > maxLen) {
                            // Split by space as last resort
                            String[] words = part.split("\\s+");
                            StringBuilder wordChunk = new StringBuilder();
                            int wordChunkLen = 0;
                            
                            for (String word : words) {
                                int wordLen = word.length();
                                if (wordChunkLen + wordLen + 1 > maxLen && wordChunk.length() > 0) {
                                    chunks.add(wordChunk.toString().trim());
                                    wordChunk.setLength(0);
                                    wordChunkLen = 0;
                                }
                                
                                if (wordChunk.length() > 0) {
                                    wordChunk.append(" ");
                                    wordChunkLen++;
                                }
                                wordChunk.append(word);
                                wordChunkLen += wordLen;
                            }
                            
                            if (wordChunk.length() > 0) {
                                chunks.add(wordChunk.toString().trim());
                            }
                        } else {
                            if (currentLen + partLen + 1 > maxLen && current.length() > 0) {
                                chunks.add(current.toString().trim());
                                current.setLength(0);
                                currentLen = 0;
                            }
                            
                            if (current.length() > 0) {
                                current.append(", ");
                                currentLen += 2;
                            }
                            current.append(part);
                            currentLen += partLen;
                        }
                    }
                    continue;
                }
                
                if (currentLen + sentenceLen + 1 > maxLen && current.length() > 0) {
                    chunks.add(current.toString().trim());
                    current.setLength(0);
                    currentLen = 0;
                }
                
                if (current.length() > 0) {
                    current.append(" ");
                    currentLen++;
                }
                current.append(sentence);
                currentLen += sentenceLen;
            }
            
            if (current.length() > 0) {
                chunks.add(current.toString().trim());
            }
        }
        
        if (chunks.isEmpty()) {
            return Arrays.asList("");
        }
        
        return chunks;
    }
    
    /**
     * Split text into sentences, avoiding common abbreviations
     */
    private static List<String> splitSentences(String text) {
        // Build pattern that avoids abbreviations
        StringBuilder abbrevPattern = new StringBuilder();
        for (int i = 0; i < ABBREVIATIONS.length; i++) {
            if (i > 0) abbrevPattern.append("|");
            abbrevPattern.append(Pattern.quote(ABBREVIATIONS[i]));
        }
        
        // Match sentence endings, but not abbreviations
        String patternStr = "(?<!(?:" + abbrevPattern.toString() + "))(?<=[.!?])\\s+";
        Pattern pattern = Pattern.compile(patternStr);
        return Arrays.asList(pattern.split(text));
    }
    
    /**
     * Load voice style from JSON files
     */
    public static Style loadVoiceStyle(List<String> voiceStylePaths, boolean verbose, OrtEnvironment env) 
            throws IOException, OrtException {
        int bsz = voiceStylePaths.size();
        
        // Read first file to get dimensions
        ObjectMapper mapper = new ObjectMapper();
        JsonNode firstRoot = mapper.readTree(new File(voiceStylePaths.get(0)));
        
        long[] ttlDims = new long[3];
        for (int i = 0; i < 3; i++) {
            ttlDims[i] = firstRoot.get("style_ttl").get("dims").get(i).asLong();
        }
        long[] dpDims = new long[3];
        for (int i = 0; i < 3; i++) {
            dpDims[i] = firstRoot.get("style_dp").get("dims").get(i).asLong();
        }
        
        long ttlDim1 = ttlDims[1];
        long ttlDim2 = ttlDims[2];
        long dpDim1 = dpDims[1];
        long dpDim2 = dpDims[2];
        
        // Pre-allocate arrays with full batch size
        int ttlSize = (int) (bsz * ttlDim1 * ttlDim2);
        int dpSize = (int) (bsz * dpDim1 * dpDim2);
        float[] ttlFlat = new float[ttlSize];
        float[] dpFlat = new float[dpSize];
        
        // Fill in the data
        for (int i = 0; i < bsz; i++) {
            JsonNode root = mapper.readTree(new File(voiceStylePaths.get(i)));
            
            // Flatten TTL data
            int ttlOffset = (int) (i * ttlDim1 * ttlDim2);
            int idx = 0;
            JsonNode ttlData = root.get("style_ttl").get("data");
            for (JsonNode batch : ttlData) {
                for (JsonNode row : batch) {
                    for (JsonNode val : row) {
                        ttlFlat[ttlOffset + idx++] = (float) val.asDouble();
                    }
                }
            }
            
            // Flatten DP data
            int dpOffset = (int) (i * dpDim1 * dpDim2);
            idx = 0;
            JsonNode dpData = root.get("style_dp").get("data");
            for (JsonNode batch : dpData) {
                for (JsonNode row : batch) {
                    for (JsonNode val : row) {
                        dpFlat[dpOffset + idx++] = (float) val.asDouble();
                    }
                }
            }
        }
        
        long[] ttlShape = {bsz, ttlDim1, ttlDim2};
        long[] dpShape = {bsz, dpDim1, dpDim2};
        
        OnnxTensor ttlTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(ttlFlat), ttlShape);
        OnnxTensor dpTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(dpFlat), dpShape);
        
        if (verbose) {
            System.out.println("Loaded " + bsz + " voice styles\n");
        }
        
        return new Style(ttlTensor, dpTensor);
    }
    
    /**
     * Load TTS components
     */
    public static TextToSpeech loadTextToSpeech(String onnxDir, boolean useGpu, OrtEnvironment env) 
            throws IOException, OrtException {
        if (useGpu) {
            throw new RuntimeException("GPU mode is not supported yet");
        }
        System.out.println("Using CPU for inference\n");
        
        // Load config
        Config config = loadCfgs(onnxDir);
        
        // Create session options
        OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
        
        // Load models
        OrtSession dpSession = env.createSession(onnxDir + "/duration_predictor.onnx", opts);
        OrtSession textEncSession = env.createSession(onnxDir + "/text_encoder.onnx", opts);
        OrtSession vectorEstSession = env.createSession(onnxDir + "/vector_estimator.onnx", opts);
        OrtSession vocoderSession = env.createSession(onnxDir + "/vocoder.onnx", opts);
        
        // Load text processor
        UnicodeProcessor textProcessor = new UnicodeProcessor(onnxDir + "/unicode_indexer.json");
        
        return new TextToSpeech(config, textProcessor, dpSession, textEncSession, vectorEstSession, vocoderSession);
    }
    
    /**
     * Load configuration from JSON
     */
    public static Config loadCfgs(String onnxDir) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(new File(onnxDir + "/tts.json"));
        
        Config config = new Config();
        config.ae = new Config.AEConfig();
        config.ae.sampleRate = root.get("ae").get("sample_rate").asInt();
        config.ae.baseChunkSize = root.get("ae").get("base_chunk_size").asInt();
        
        config.ttl = new Config.TTLConfig();
        config.ttl.chunkCompressFactor = root.get("ttl").get("chunk_compress_factor").asInt();
        config.ttl.latentDim = root.get("ttl").get("latent_dim").asInt();
        
        return config;
    }
    
    /**
     * Get latent mask from wav lengths
     */
    public static float[][][] getLatentMask(long[] wavLengths, Config config) {
        long baseChunkSize = config.ae.baseChunkSize;
        long chunkCompressFactor = config.ttl.chunkCompressFactor;
        long latentSize = baseChunkSize * chunkCompressFactor;
        
        long[] latentLengths = new long[wavLengths.length];
        long maxLen = 0;
        for (int i = 0; i < wavLengths.length; i++) {
            latentLengths[i] = (wavLengths[i] + latentSize - 1) / latentSize;
            maxLen = Math.max(maxLen, latentLengths[i]);
        }
        
        float[][][] mask = new float[wavLengths.length][1][(int) maxLen];
        for (int i = 0; i < wavLengths.length; i++) {
            for (int j = 0; j < maxLen; j++) {
                mask[i][0][j] = j < latentLengths[i] ? 1.0f : 0.0f;
            }
        }
        return mask;
    }
    
    /**
     * Write WAV file
     */
    public static void writeWavFile(String filename, float[] audioData, int sampleRate) throws IOException {
        // Convert float to byte array
        byte[] bytes = new byte[audioData.length * 2];
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        buffer.order(ByteOrder.LITTLE_ENDIAN);
        
        for (float sample : audioData) {
            short val = (short) Math.max(-32768, Math.min(32767, sample * 32767));
            buffer.putShort(val);
        }
        
        ByteArrayInputStream bais = new ByteArrayInputStream(bytes);
        AudioFormat format = new AudioFormat(sampleRate, 16, 1, true, false);
        AudioInputStream ais = new AudioInputStream(bais, format, audioData.length);
        AudioSystem.write(ais, AudioFileFormat.Type.WAVE, new File(filename));
    }
    
    /**
     * Sanitize filename (supports Unicode characters)
     */
    public static String sanitizeFilename(String text, int maxLen) {
        // Get first maxLen characters (code points, not chars for surrogate pairs)
        int[] codePoints = text.codePoints().limit(maxLen).toArray();
        StringBuilder result = new StringBuilder();
        for (int codePoint : codePoints) {
            if (Character.isLetterOrDigit(codePoint)) {
                result.appendCodePoint(codePoint);
            } else {
                result.append('_');
            }
        }
        return result.toString();
    }
    
    /**
     * Timer utility
     */
    public static <T> T timer(String name, java.util.function.Supplier<T> fn) {
        long start = System.currentTimeMillis();
        System.out.println(name + "...");
        T result = fn.get();
        long elapsed = System.currentTimeMillis() - start;
        System.out.printf("  -> %s completed in %.2f sec\n", name, elapsed / 1000.0);
        return result;
    }
    
    /**
     * Create float tensor from 3D array
     */
    public static OnnxTensor createFloatTensor(float[][][] array, OrtEnvironment env) throws OrtException {
        int dim0 = array.length;
        int dim1 = array[0].length;
        int dim2 = array[0][0].length;
        
        float[] flat = new float[dim0 * dim1 * dim2];
        int idx = 0;
        for (int i = 0; i < dim0; i++) {
            for (int j = 0; j < dim1; j++) {
                for (int k = 0; k < dim2; k++) {
                    flat[idx++] = array[i][j][k];
                }
            }
        }
        
        long[] shape = {dim0, dim1, dim2};
        return OnnxTensor.createTensor(env, FloatBuffer.wrap(flat), shape);
    }
    
    /**
     * Create long tensor from 2D array
     */
    public static OnnxTensor createLongTensor(long[][] array, OrtEnvironment env) throws OrtException {
        int dim0 = array.length;
        int dim1 = array[0].length;
        
        long[] flat = new long[dim0 * dim1];
        int idx = 0;
        for (int i = 0; i < dim0; i++) {
            for (int j = 0; j < dim1; j++) {
                flat[idx++] = array[i][j];
            }
        }
        
        long[] shape = {dim0, dim1};
        return OnnxTensor.createTensor(env, LongBuffer.wrap(flat), shape);
    }
    
    /**
     * Load JSON long array
     */
    public static long[] loadJsonLongArray(String filePath) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(new File(filePath));
        
        long[] result = new long[root.size()];
        for (int i = 0; i < root.size(); i++) {
            result[i] = root.get(i).asLong();
        }
        return result;
    }
}
