import Foundation
import Accelerate
import OnnxRuntimeBindings

// MARK: - Available Languages

let AVAILABLE_LANGS = ["en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na"]

func isValidLang(_ lang: String) -> Bool {
    return AVAILABLE_LANGS.contains(lang)
}

// MARK: - Configuration Structures

struct Config: Codable {
    struct AEConfig: Codable {
        let sample_rate: Int
        let base_chunk_size: Int
    }
    
    struct TTLConfig: Codable {
        let chunk_compress_factor: Int
        let latent_dim: Int
    }
    
    let ae: AEConfig
    let ttl: TTLConfig
}

// MARK: - Voice Style Data Structure

struct VoiceStyleData: Codable {
    struct StyleComponent: Codable {
        let data: [[[Float]]]
        let dims: [Int]
        let type: String
    }
    
    let style_ttl: StyleComponent
    let style_dp: StyleComponent
}

// MARK: - Unicode Text Processor

class UnicodeProcessor {
    let indexer: [Int64]
    
    init(unicodeIndexerPath: String) throws {
        let data = try Data(contentsOf: URL(fileURLWithPath: unicodeIndexerPath))
        self.indexer = try JSONDecoder().decode([Int64].self, from: data)
    }
    
    func call(_ textList: [String], _ langList: [String]) -> (textIds: [[Int64]], textMask: [[[Float]]]) {
        var processedTexts = [String]()
        for (i, text) in textList.enumerated() {
            processedTexts.append(preprocessText(text, lang: langList[i]))
        }
        
        // Use unicodeScalars.count for correct length after NFKD decomposition
        var textIdsLengths = [Int]()
        for text in processedTexts {
            textIdsLengths.append(text.unicodeScalars.count)
        }
        
        let maxLen = textIdsLengths.max() ?? 0
        
        var textIds = [[Int64]]()
        for text in processedTexts {
            var row = Array(repeating: Int64(0), count: maxLen)
            let unicodeValues = Array(text.unicodeScalars.map { Int($0.value) })
            for (j, val) in unicodeValues.enumerated() {
                if val < indexer.count {
                    row[j] = indexer[val]
                } else {
                    row[j] = -1
                }
            }
            textIds.append(row)
        }
        
        let textMask = getTextMask(textIdsLengths)
        return (textIds, textMask)
    }
}

func preprocessText(_ text: String, lang: String) -> String {
    // Use NFKD (decomposed) for proper Hangul Jamo decomposition
    var text = text.decomposedStringWithCompatibilityMapping

    // Remove emojis (wide Unicode range)
    // Swift NSRegularExpression doesn't support Unicode escapes above \uFFFF
    // Use character filtering instead
    text = text.unicodeScalars.filter { scalar in
        let value = scalar.value
        return !((value >= 0x1F600 && value <= 0x1F64F) ||
                 (value >= 0x1F300 && value <= 0x1F5FF) ||
                 (value >= 0x1F680 && value <= 0x1F6FF) ||
                 (value >= 0x1F700 && value <= 0x1F77F) ||
                 (value >= 0x1F780 && value <= 0x1F7FF) ||
                 (value >= 0x1F800 && value <= 0x1F8FF) ||
                 (value >= 0x1F900 && value <= 0x1F9FF) ||
                 (value >= 0x1FA00 && value <= 0x1FA6F) ||
                 (value >= 0x1FA70 && value <= 0x1FAFF) ||
                 (value >= 0x2600 && value <= 0x26FF) ||
                 (value >= 0x2700 && value <= 0x27BF) ||
                 (value >= 0x1F1E6 && value <= 0x1F1FF))
    }.map { String($0) }.joined()

    // Replace various dashes and symbols
    let replacements: [String: String] = [
        "–": "-",      // en dash
        "‑": "-",      // non-breaking hyphen
        "—": "-",      // em dash
        "_": " ",      // underscore
        "\u{201C}": "\"",     // left double quote
        "\u{201D}": "\"",     // right double quote
        "\u{2018}": "'",      // left single quote
        "\u{2019}": "'",      // right single quote
        "´": "'",      // acute accent
        "`": "'",      // grave accent
        "[": " ",      // left bracket
        "]": " ",      // right bracket
        "|": " ",      // vertical bar
        "/": " ",      // slash
        "#": " ",      // hash
        "→": " ",      // right arrow
        "←": " ",      // left arrow
    ]

    for (old, new) in replacements {
        text = text.replacingOccurrences(of: old, with: new)
    }

    // Remove special symbols
    let specialSymbols = ["♥", "☆", "♡", "©", "\\"]
    for symbol in specialSymbols {
        text = text.replacingOccurrences(of: symbol, with: "")
    }

    // Replace known expressions
    let exprReplacements: [String: String] = [
        "@": " at ",
        "e.g.,": "for example, ",
        "i.e.,": "that is, ",
    ]

    for (old, new) in exprReplacements {
        text = text.replacingOccurrences(of: old, with: new)
    }

    // Fix spacing around punctuation
    text = text.replacingOccurrences(of: " ,", with: ",")
    text = text.replacingOccurrences(of: " .", with: ".")
    text = text.replacingOccurrences(of: " !", with: "!")
    text = text.replacingOccurrences(of: " ?", with: "?")
    text = text.replacingOccurrences(of: " ;", with: ";")
    text = text.replacingOccurrences(of: " :", with: ":")
    text = text.replacingOccurrences(of: " '", with: "'")

    // Remove duplicate quotes
    while text.contains("\"\"") {
        text = text.replacingOccurrences(of: "\"\"", with: "\"")
    }
    while text.contains("''") {
        text = text.replacingOccurrences(of: "''", with: "'")
    }
    while text.contains("``") {
        text = text.replacingOccurrences(of: "``", with: "`")
    }

    // Remove extra spaces
    let whitespacePattern = try! NSRegularExpression(pattern: "\\s+")
    let whitespaceRange = NSRange(text.startIndex..., in: text)
    text = whitespacePattern.stringByReplacingMatches(in: text, range: whitespaceRange, withTemplate: " ")
    text = text.trimmingCharacters(in: .whitespacesAndNewlines)

    // If text doesn't end with punctuation, quotes, or closing brackets, add a period
    if !text.isEmpty {
        let punctPattern = try! NSRegularExpression(pattern: "[.!?;:,'\"\\u201C\\u201D\\u2018\\u2019)\\]}…。」』】〉》›»]$")
        let punctRange = NSRange(text.startIndex..., in: text)
        if punctPattern.firstMatch(in: text, range: punctRange) == nil {
            text += "."
        }
    }

    // Validate language
    guard isValidLang(lang) else {
        fatalError("Invalid language: \(lang). Available: \(AVAILABLE_LANGS.joined(separator: ", "))")
    }

    // Wrap text with language tags
    text = "<\(lang)>\(text)</\(lang)>"

    return text
}

func lengthToMask(_ lengths: [Int], maxLen: Int? = nil) -> [[[Float]]] {
    let actualMaxLen = maxLen ?? (lengths.max() ?? 0)
    
    var mask = [[[Float]]]()
    for len in lengths {
        var row = Array(repeating: Float(0.0), count: actualMaxLen)
        for j in 0..<min(len, actualMaxLen) {
            row[j] = 1.0
        }
        mask.append([row])
    }
    return mask
}

func getTextMask(_ textIdsLengths: [Int]) -> [[[Float]]] {
    let maxLen = textIdsLengths.max() ?? 0
    return lengthToMask(textIdsLengths, maxLen: maxLen)
}

func sampleNoisyLatent(duration: [Float], sampleRate: Int, baseChunkSize: Int, chunkCompress: Int, latentDim: Int) -> (noisyLatent: [[[Float]]], latentMask: [[[Float]]]) {
    let bsz = duration.count
    let maxDur = duration.max() ?? 0.0
    
    let wavLenMax = Int(maxDur * Float(sampleRate))
    var wavLengths = [Int]()
    for d in duration {
        wavLengths.append(Int(d * Float(sampleRate)))
    }
    
    let chunkSize = baseChunkSize * chunkCompress
    let latentLen = (wavLenMax + chunkSize - 1) / chunkSize
    let latentDimVal = latentDim * chunkCompress
    
    var noisyLatent = [[[Float]]]()
    for _ in 0..<bsz {
        var batch = [[Float]]()
        for _ in 0..<latentDimVal {
            var row = [Float]()
            for _ in 0..<latentLen {
                // Box-Muller transform
                let u1 = Float.random(in: 0.0001...1.0)
                let u2 = Float.random(in: 0.0...1.0)
                let val = sqrt(-2.0 * log(u1)) * cos(2.0 * Float.pi * u2)
                row.append(val)
            }
            batch.append(row)
        }
        noisyLatent.append(batch)
    }
    
    var latentLengths = [Int]()
    for len in wavLengths {
        latentLengths.append((len + chunkSize - 1) / chunkSize)
    }
    
    let latentMask = lengthToMask(latentLengths, maxLen: latentLen)
    
    // Apply mask
    for b in 0..<bsz {
        for d in 0..<latentDimVal {
            for t in 0..<latentLen {
                noisyLatent[b][d][t] *= latentMask[b][0][t]
            }
        }
    }
    
    return (noisyLatent, latentMask)
}

func getLatentMask(_ wavLengths: [Int64], _ cfgs: Config) -> [[[Float]]] {
    let baseChunkSize = cfgs.ae.base_chunk_size
    let chunkCompressFactor = cfgs.ttl.chunk_compress_factor
    let latentSize = baseChunkSize * chunkCompressFactor
    
    var latentLengths = [Int]()
    for len in wavLengths {
        latentLengths.append((Int(len) + latentSize - 1) / latentSize)
    }
    
    let maxLen = latentLengths.max() ?? 0
    return lengthToMask(latentLengths, maxLen: maxLen)
}

// MARK: - WAV File I/O

func writeWavFile(_ filename: String, _ audioData: [Float], _ sampleRate: Int) throws {
    let url = URL(fileURLWithPath: filename)
    
    // Convert float to int16
    let int16Data = audioData.map { sample -> Int16 in
        let clamped = max(-1.0, min(1.0, sample))
        return Int16(clamped * 32767.0)
    }
    
    // Create WAV header
    let numChannels: UInt16 = 1
    let bitsPerSample: UInt16 = 16
    let byteRate = UInt32(sampleRate) * UInt32(numChannels) * UInt32(bitsPerSample) / 8
    let blockAlign = numChannels * bitsPerSample / 8
    let dataSize = UInt32(int16Data.count * 2)
    
    var data = Data()
    
    // RIFF chunk
    data.append("RIFF".data(using: .ascii)!)
    withUnsafeBytes(of: UInt32(36 + dataSize).littleEndian) { data.append(contentsOf: $0) }
    data.append("WAVE".data(using: .ascii)!)
    
    // fmt chunk
    data.append("fmt ".data(using: .ascii)!)
    withUnsafeBytes(of: UInt32(16).littleEndian) { data.append(contentsOf: $0) }
    withUnsafeBytes(of: UInt16(1).littleEndian) { data.append(contentsOf: $0) } // PCM
    withUnsafeBytes(of: numChannels.littleEndian) { data.append(contentsOf: $0) }
    withUnsafeBytes(of: UInt32(sampleRate).littleEndian) { data.append(contentsOf: $0) }
    withUnsafeBytes(of: byteRate.littleEndian) { data.append(contentsOf: $0) }
    withUnsafeBytes(of: blockAlign.littleEndian) { data.append(contentsOf: $0) }
    withUnsafeBytes(of: bitsPerSample.littleEndian) { data.append(contentsOf: $0) }
    
    // data chunk
    data.append("data".data(using: .ascii)!)
    withUnsafeBytes(of: dataSize.littleEndian) { data.append(contentsOf: $0) }
    
    // audio data
    int16Data.withUnsafeBytes { data.append(contentsOf: $0) }
    
    try data.write(to: url)
}

// MARK: - Text Chunking

let MAX_CHUNK_LENGTH = 300
let ABBREVIATIONS = [
    "Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Sr.", "Jr.",
    "St.", "Ave.", "Rd.", "Blvd.", "Dept.", "Inc.", "Ltd.",
    "Co.", "Corp.", "etc.", "vs.", "i.e.", "e.g.", "Ph.D."
]

func chunkText(_ text: String, maxLen: Int = 0) -> [String] {
    let actualMaxLen = maxLen > 0 ? maxLen : MAX_CHUNK_LENGTH
    let trimmedText = text.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
    
    if trimmedText.isEmpty {
        return [""]
    }
    
    // Split by paragraphs using regex
    let paraPattern = try! NSRegularExpression(pattern: "\\n\\s*\\n")
    let paraRange = NSRange(trimmedText.startIndex..., in: trimmedText)
    var paragraphs = [String]()
    var lastEnd = trimmedText.startIndex
    
    paraPattern.enumerateMatches(in: trimmedText, range: paraRange) { match, _, _ in
        if let match = match, let range = Range(match.range, in: trimmedText) {
            paragraphs.append(String(trimmedText[lastEnd..<range.lowerBound]))
            lastEnd = range.upperBound
        }
    }
    if lastEnd < trimmedText.endIndex {
        paragraphs.append(String(trimmedText[lastEnd...]))
    }
    if paragraphs.isEmpty {
        paragraphs = [trimmedText]
    }
    
    var chunks = [String]()
    
    for para in paragraphs {
        let trimmedPara = para.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        if trimmedPara.isEmpty {
            continue
        }
        
        if trimmedPara.count <= actualMaxLen {
            chunks.append(trimmedPara)
            continue
        }
        
        // Split by sentences
        let sentences = splitSentences(trimmedPara)
        var current = ""
        var currentLen = 0
        
        for sentence in sentences {
            let trimmedSentence = sentence.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            if trimmedSentence.isEmpty {
                continue
            }
            
            let sentenceLen = trimmedSentence.count
            if sentenceLen > actualMaxLen {
                // If sentence is longer than maxLen, split by comma or space
                if !current.isEmpty {
                    chunks.append(current.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
                    current = ""
                    currentLen = 0
                }
                
                // Try splitting by comma
                let parts = trimmedSentence.components(separatedBy: ",")
                for part in parts {
                    let trimmedPart = part.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
                    if trimmedPart.isEmpty {
                        continue
                    }
                    
                    let partLen = trimmedPart.count
                    if partLen > actualMaxLen {
                        // Split by space as last resort
                        let words = trimmedPart.components(separatedBy: CharacterSet.whitespaces).filter { !$0.isEmpty }
                        var wordChunk = ""
                        var wordChunkLen = 0
                        
                        for word in words {
                            let wordLen = word.count
                            if wordChunkLen + wordLen + 1 > actualMaxLen && !wordChunk.isEmpty {
                                chunks.append(wordChunk.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
                                wordChunk = ""
                                wordChunkLen = 0
                            }
                            
                            if !wordChunk.isEmpty {
                                wordChunk += " "
                                wordChunkLen += 1
                            }
                            wordChunk += word
                            wordChunkLen += wordLen
                        }
                        
                        if !wordChunk.isEmpty {
                            chunks.append(wordChunk.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
                        }
                    } else {
                        if currentLen + partLen + 1 > actualMaxLen && !current.isEmpty {
                            chunks.append(current.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
                            current = ""
                            currentLen = 0
                        }
                        
                        if !current.isEmpty {
                            current += ", "
                            currentLen += 2
                        }
                        current += trimmedPart
                        currentLen += partLen
                    }
                }
                continue
            }
            
            if currentLen + sentenceLen + 1 > actualMaxLen && !current.isEmpty {
                chunks.append(current.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
                current = ""
                currentLen = 0
            }
            
            if !current.isEmpty {
                current += " "
                currentLen += 1
            }
            current += trimmedSentence
            currentLen += sentenceLen
        }
        
        if !current.isEmpty {
            chunks.append(current.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines))
        }
    }
    
    return chunks.isEmpty ? [""] : chunks
}

func splitSentences(_ text: String) -> [String] {
    // Swift's regex doesn't support lookbehind reliably, so we use a simpler approach
    // Split on sentence boundaries and then check if they're abbreviations
    let regex = try! NSRegularExpression(pattern: "([.!?])\\s+")
    let range = NSRange(text.startIndex..., in: text)
    
    // Find all matches
    let matches = regex.matches(in: text, range: range)
    if matches.isEmpty {
        return [text]
    }
    
    var sentences = [String]()
    var lastEnd = text.startIndex
    
    for match in matches {
        guard let matchRange = Range(match.range, in: text) else { continue }
        
        // Get the text before the punctuation
        let beforePunc = String(text[lastEnd..<matchRange.lowerBound])
        
        // Get the punctuation character
        let puncRange = Range(NSRange(location: match.range.location, length: 1), in: text)!
        let punc = String(text[puncRange])
        
        // Check if this ends with an abbreviation
        var isAbbrev = false
        let combined = beforePunc.trimmingCharacters(in: CharacterSet.whitespaces) + punc
        for abbrev in ABBREVIATIONS {
            if combined.hasSuffix(abbrev) {
                isAbbrev = true
                break
            }
        }
        
        if !isAbbrev {
            // This is a real sentence boundary
            sentences.append(String(text[lastEnd..<matchRange.upperBound]))
            lastEnd = matchRange.upperBound
        }
    }
    
    // Add the remaining text
    if lastEnd < text.endIndex {
        sentences.append(String(text[lastEnd...]))
    }
    
    return sentences.isEmpty ? [text] : sentences
}

// MARK: - Utility Functions

func timer<T>(_ name: String, _ f: () throws -> T) rethrows -> T {
    let start = Date()
    print("\(name)...")
    let result = try f()
    let elapsed = Date().timeIntervalSince(start)
    print(String(format: "  -> %@ completed in %.2f sec", name, elapsed))
    return result
}

func sanitizeFilename(_ text: String, maxLen: Int) -> String {
    let truncated = text.count > maxLen ? String(text.prefix(maxLen)) : text
    return truncated.map { char in
        if char.isLetter || char.isNumber {
            return char
        } else {
            return Character("_")
        }
    }.map(String.init).joined()
}

func loadCfgs(_ onnxDir: String) throws -> Config {
    let cfgPath = "\(onnxDir)/tts.json"
    let data = try Data(contentsOf: URL(fileURLWithPath: cfgPath))
    let config = try JSONDecoder().decode(Config.self, from: data)
    return config
}

// MARK: - ONNX Runtime Integration

struct Style {
    let ttl: ORTValue
    let dp: ORTValue
}

class TextToSpeech {
    let cfgs: Config
    let textProcessor: UnicodeProcessor
    let dpOrt: ORTSession
    let textEncOrt: ORTSession
    let vectorEstOrt: ORTSession
    let vocoderOrt: ORTSession
    let sampleRate: Int
    
    init(cfgs: Config, textProcessor: UnicodeProcessor,
         dpOrt: ORTSession, textEncOrt: ORTSession,
         vectorEstOrt: ORTSession, vocoderOrt: ORTSession) {
        self.cfgs = cfgs
        self.textProcessor = textProcessor
        self.dpOrt = dpOrt
        self.textEncOrt = textEncOrt
        self.vectorEstOrt = vectorEstOrt
        self.vocoderOrt = vocoderOrt
        self.sampleRate = cfgs.ae.sample_rate
    }
    
    private func _infer(_ textList: [String], _ langList: [String], _ style: Style, _ totalStep: Int, speed: Float = 1.05) throws -> (wav: [Float], duration: [Float]) {
        let bsz = textList.count
        
        // Process text
        let (textIds, textMask) = textProcessor.call(textList, langList)
        
        // Flatten text IDs
        let textIdsFlat = textIds.flatMap { $0 }
        let textIdsShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: textIds[0].count)]
        let textIdsValue = try ORTValue(tensorData: NSMutableData(bytes: textIdsFlat, length: textIdsFlat.count * MemoryLayout<Int64>.size),
                                        elementType: .int64,
                                        shape: textIdsShape)
        
        // Flatten text mask
        let textMaskFlat = textMask.flatMap { $0.flatMap { $0 } }
        let textMaskShape: [NSNumber] = [NSNumber(value: bsz), 1, NSNumber(value: textMask[0][0].count)]
        let textMaskValue = try ORTValue(tensorData: NSMutableData(bytes: textMaskFlat, length: textMaskFlat.count * MemoryLayout<Float>.size),
                                         elementType: .float,
                                         shape: textMaskShape)
        
        // Predict duration
        let dpOutputs = try dpOrt.run(withInputs: ["text_ids": textIdsValue, "style_dp": style.dp, "text_mask": textMaskValue],
                                      outputNames: ["duration"],
                                      runOptions: nil)
        
        let durationData = try dpOutputs["duration"]!.tensorData() as Data
        var duration = durationData.withUnsafeBytes { ptr in
            Array(ptr.bindMemory(to: Float.self))
        }
        
        // Apply speed factor to duration
        for i in 0..<duration.count {
            duration[i] /= speed
        }
        
        // Encode text
        let textEncOutputs = try textEncOrt.run(withInputs: ["text_ids": textIdsValue, "style_ttl": style.ttl, "text_mask": textMaskValue],
                                                outputNames: ["text_emb"],
                                                runOptions: nil)
        
        let textEmbValue = textEncOutputs["text_emb"]!
        
        // Sample noisy latent
        var (xt, latentMask) = sampleNoisyLatent(duration: duration, sampleRate: sampleRate,
                                                  baseChunkSize: cfgs.ae.base_chunk_size,
                                                  chunkCompress: cfgs.ttl.chunk_compress_factor,
                                                  latentDim: cfgs.ttl.latent_dim)
        
        // Prepare constant arrays
        let totalStepArray = Array(repeating: Float(totalStep), count: bsz)
        let totalStepValue = try ORTValue(tensorData: NSMutableData(bytes: totalStepArray, length: totalStepArray.count * MemoryLayout<Float>.size),
                                          elementType: .float,
                                          shape: [NSNumber(value: bsz)])
        
        // Denoising loop
        for step in 0..<totalStep {
            let currentStepArray = Array(repeating: Float(step), count: bsz)
            let currentStepValue = try ORTValue(tensorData: NSMutableData(bytes: currentStepArray, length: currentStepArray.count * MemoryLayout<Float>.size),
                                                elementType: .float,
                                                shape: [NSNumber(value: bsz)])
            
            // Flatten xt
            let xtFlat = xt.flatMap { $0.flatMap { $0 } }
            let xtShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: xt[0].count), NSNumber(value: xt[0][0].count)]
            let xtValue = try ORTValue(tensorData: NSMutableData(bytes: xtFlat, length: xtFlat.count * MemoryLayout<Float>.size),
                                       elementType: .float,
                                       shape: xtShape)
            
            // Flatten latent mask
            let latentMaskFlat = latentMask.flatMap { $0.flatMap { $0 } }
            let latentMaskShape: [NSNumber] = [NSNumber(value: bsz), 1, NSNumber(value: latentMask[0][0].count)]
            let latentMaskValue = try ORTValue(tensorData: NSMutableData(bytes: latentMaskFlat, length: latentMaskFlat.count * MemoryLayout<Float>.size),
                                               elementType: .float,
                                               shape: latentMaskShape)
            
            let vectorEstOutputs = try vectorEstOrt.run(withInputs: [
                "noisy_latent": xtValue,
                "text_emb": textEmbValue,
                "style_ttl": style.ttl,
                "latent_mask": latentMaskValue,
                "text_mask": textMaskValue,
                "current_step": currentStepValue,
                "total_step": totalStepValue
            ], outputNames: ["denoised_latent"], runOptions: nil)
            
            let denoisedData = try vectorEstOutputs["denoised_latent"]!.tensorData() as Data
            let denoisedFlat = denoisedData.withUnsafeBytes { ptr in
                Array(ptr.bindMemory(to: Float.self))
            }
            
            // Reshape to 3D
            let latentDimVal = xt[0].count
            let latentLen = xt[0][0].count
            xt = []
            var idx = 0
            for _ in 0..<bsz {
                var batch = [[Float]]()
                for _ in 0..<latentDimVal {
                    var row = [Float]()
                    for _ in 0..<latentLen {
                        row.append(denoisedFlat[idx])
                        idx += 1
                    }
                    batch.append(row)
                }
                xt.append(batch)
            }
        }
        
        // Generate waveform
        let finalXtFlat = xt.flatMap { $0.flatMap { $0 } }
        let finalXtShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: xt[0].count), NSNumber(value: xt[0][0].count)]
        let finalXtValue = try ORTValue(tensorData: NSMutableData(bytes: finalXtFlat, length: finalXtFlat.count * MemoryLayout<Float>.size),
                                        elementType: .float,
                                        shape: finalXtShape)
        
        let vocoderOutputs = try vocoderOrt.run(withInputs: ["latent": finalXtValue],
                                                outputNames: ["wav_tts"],
                                                runOptions: nil)
        
        let wavData = try vocoderOutputs["wav_tts"]!.tensorData() as Data
        let wav = wavData.withUnsafeBytes { ptr in
            Array(ptr.bindMemory(to: Float.self))
        }
        
        return (wav, duration)
    }
    
    func call(_ text: String, _ lang: String, _ style: Style, _ totalStep: Int, speed: Float = 1.05, silenceDuration: Float = 0.3) throws -> (wav: [Float], duration: Float) {
        let maxLen = (lang == "ko" || lang == "ja") ? 120 : 300
        let chunks = chunkText(text, maxLen: maxLen)
        let langList = Array(repeating: lang, count: chunks.count)
        
        var wavCat = [Float]()
        var durCat: Float = 0.0
        
        for (i, chunk) in chunks.enumerated() {
            let result = try _infer([chunk], [langList[i]], style, totalStep, speed: speed)
            
            let dur = result.duration[0]
            let wavLen = Int(Float(sampleRate) * dur)
            let wavChunk = Array(result.wav.prefix(wavLen))
            
            if i == 0 {
                wavCat = wavChunk
                durCat = dur
            } else {
                let silenceLen = Int(silenceDuration * Float(sampleRate))
                let silence = [Float](repeating: 0.0, count: silenceLen)
                
                wavCat.append(contentsOf: silence)
                wavCat.append(contentsOf: wavChunk)
                durCat += silenceDuration + dur
            }
        }
        
        return (wavCat, durCat)
    }
    
    func batch(_ textList: [String], _ langList: [String], _ style: Style, _ totalStep: Int, speed: Float = 1.05) throws -> (wav: [Float], duration: [Float]) {
        return try _infer(textList, langList, style, totalStep, speed: speed)
    }
}

// MARK: - Component Loading Functions

func loadVoiceStyle(_ voiceStylePaths: [String], verbose: Bool) throws -> Style {
    let bsz = voiceStylePaths.count
    
    // Read first file to get dimensions
    let firstData = try Data(contentsOf: URL(fileURLWithPath: voiceStylePaths[0]))
    let firstStyle = try JSONDecoder().decode(VoiceStyleData.self, from: firstData)
    
    let ttlDims = firstStyle.style_ttl.dims
    let dpDims = firstStyle.style_dp.dims
    
    let ttlDim1 = ttlDims[1]
    let ttlDim2 = ttlDims[2]
    let dpDim1 = dpDims[1]
    let dpDim2 = dpDims[2]
    
    // Pre-allocate arrays with full batch size
    let ttlSize = bsz * ttlDim1 * ttlDim2
    let dpSize = bsz * dpDim1 * dpDim2
    var ttlFlat = [Float](repeating: 0.0, count: ttlSize)
    var dpFlat = [Float](repeating: 0.0, count: dpSize)
    
    // Fill in the data
    for (i, path) in voiceStylePaths.enumerated() {
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        let voiceStyle = try JSONDecoder().decode(VoiceStyleData.self, from: data)
        
        // Flatten TTL data
        let ttlOffset = i * ttlDim1 * ttlDim2
        var idx = 0
        for batch in voiceStyle.style_ttl.data {
            for row in batch {
                for val in row {
                    ttlFlat[ttlOffset + idx] = val
                    idx += 1
                }
            }
        }
        
        // Flatten DP data
        let dpOffset = i * dpDim1 * dpDim2
        idx = 0
        for batch in voiceStyle.style_dp.data {
            for row in batch {
                for val in row {
                    dpFlat[dpOffset + idx] = val
                    idx += 1
                }
            }
        }
    }
    
    let ttlShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: ttlDim1), NSNumber(value: ttlDim2)]
    let dpShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: dpDim1), NSNumber(value: dpDim2)]
    
    let ttlValue = try ORTValue(tensorData: NSMutableData(bytes: &ttlFlat, length: ttlFlat.count * MemoryLayout<Float>.size),
                                elementType: .float,
                                shape: ttlShape)
    let dpValue = try ORTValue(tensorData: NSMutableData(bytes: &dpFlat, length: dpFlat.count * MemoryLayout<Float>.size),
                               elementType: .float,
                               shape: dpShape)
    
    if verbose {
        print("Loaded \(bsz) voice styles\n")
    }
    
    return Style(ttl: ttlValue, dp: dpValue)
}

func loadTextToSpeech(_ onnxDir: String, _ useGpu: Bool, _ env: ORTEnv) throws -> TextToSpeech {
    if useGpu {
        throw NSError(domain: "TTS", code: 1, userInfo: [NSLocalizedDescriptionKey: "GPU mode is not supported yet"])
    }
    print("Using CPU for inference\n")
    
    let cfgs = try loadCfgs(onnxDir)
    
    let sessionOptions = try ORTSessionOptions()
    
    let dpPath = "\(onnxDir)/duration_predictor.onnx"
    let textEncPath = "\(onnxDir)/text_encoder.onnx"
    let vectorEstPath = "\(onnxDir)/vector_estimator.onnx"
    let vocoderPath = "\(onnxDir)/vocoder.onnx"
    
    let dpOrt = try ORTSession(env: env, modelPath: dpPath, sessionOptions: sessionOptions)
    let textEncOrt = try ORTSession(env: env, modelPath: textEncPath, sessionOptions: sessionOptions)
    let vectorEstOrt = try ORTSession(env: env, modelPath: vectorEstPath, sessionOptions: sessionOptions)
    let vocoderOrt = try ORTSession(env: env, modelPath: vocoderPath, sessionOptions: sessionOptions)
    
    let unicodeIndexerPath = "\(onnxDir)/unicode_indexer.json"
    let textProcessor = try UnicodeProcessor(unicodeIndexerPath: unicodeIndexerPath)
    
    return TextToSpeech(cfgs: cfgs, textProcessor: textProcessor,
                       dpOrt: dpOrt, textEncOrt: textEncOrt,
                       vectorEstOrt: vectorEstOrt, vocoderOrt: vocoderOrt)
}
