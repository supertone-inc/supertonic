import Foundation
import Accelerate
import OnnxRuntimeBindings

// MARK: - Available Languages

let AVAILABLE_LANGS = ["en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi"]

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

// MARK: - Language-Specific Expression Replacements

func expressionReplacements(for lang: String) -> [(String, String)] {
    switch lang {

    case "en":
        return [
            ("e.g.", "for example, "),
            ("i.e.", "that is, "),
            ("@", " at "),
        ]

    case "ko":
        return [
            ("@", " 골뱅이 "),
        ]

    case "ja":
        return [
            ("@", " アットマーク "),
        ]

    case "ar":
        return [
            ("@", " آت "),
        ]

    case "bg":
        return [
            ("напр.", "например "),
            ("т.е.", "тоест "),
            ("т. е.", "тоест "),
            ("@", " кльомба "),
        ]

    case "cs":
        return [
            ("např.", "například "),
            ("tj.", "to jest "),
            ("tzn.", "to znamená "),
            ("@", " zavináč "),
        ]

    case "da":
        return [
            ("f.eks.", "for eksempel "),
            ("dvs.", "det vil sige "),
            ("@", " snabel a "),
        ]

    case "de":
        return [
            ("z.B.", "zum Beispiel, "),
            ("z. B.", "zum Beispiel, "),
            ("d.h.", "das heißt, "),
            ("d. h.", "das heißt, "),
            ("@", " ät "),
        ]

    case "el":
        return [
            ("π.χ.", "παραδείγματος χάρη "),
            ("δηλ.", "δηλαδή "),
            ("@", " παπάκι "),
        ]

    case "es":
        return [
            ("p. ej.", "por ejemplo "),
            ("p.ej.", "por ejemplo "),
            ("ej.", "ejemplo "),
            ("@", " arroba "),
        ]

    case "et":
        return [
            ("nt.", "näiteks "),
            ("s.t.", "see tähendab "),
            ("@", " ätt "),
        ]

    case "fi":
        return [
            ("esim.", "esimerkiksi "),
            ("ts.", "toisin sanoen "),
            ("@", " ät merkki "),
        ]

    case "fr":
        return [
            ("c.-à-d.", "c'est-à-dire "),
            ("c.-a-d.", "c'est-à-dire "),
            ("ex.", "par exemple "),
            ("@", " arobase "),
        ]

    case "hi":
        return [
            ("@", " ऐट "),
        ]

    case "hr":
        return [
            ("npr.", "na primjer "),
            ("tj.", "to jest "),
            ("@", " et "),
        ]

    case "hu":
        return [
            ("pl.", "például "),
            ("azaz", "azaz "),
            ("@", " kukac "),
        ]

    case "id":
        return [
            ("mis.", "misalnya "),
            ("yaitu", "yaitu "),
            ("@", " at "),
        ]

    case "it":
        return [
            ("es.", "per esempio "),
            ("cioè", "cioè "),
            ("@", " chiocciola "),
        ]

    case "lt":
        return [
            ("pvz.", "pavyzdžiui "),
            ("t. y.", "tai yra "),
            ("@", " eta "),
        ]

    case "lv":
        return [
            ("piem.", "piemēram "),
            ("t.i.", "tas ir "),
            ("t. i.", "tas ir "),
            ("@", " et "),
        ]

    case "nl":
        return [
            ("bijv.", "bijvoorbeeld "),
            ("d.w.z.", "dat wil zeggen "),
            ("@", " apenstaartje "),
        ]

    case "pl":
        return [
            ("np.", "na przykład "),
            ("tj.", "to jest "),
            ("@", " małpa "),
        ]

    case "pt":
        return [
            ("ex.", "por exemplo "),
            ("isto é", "isto é "),
            ("@", " arroba "),
        ]

    case "ro":
        return [
            ("de ex.", "de exemplu "),
            ("adică", "adică "),
            ("@", " a rond "),
        ]

    case "ru":
        return [
            ("напр.", "например "),
            ("т.е.", "то есть "),
            ("т. е.", "то есть "),
            ("@", " собака "),
        ]

    case "sk":
        return [
            ("napr.", "napríklad "),
            ("t. j.", "to jest "),
            ("t.j.", "to jest "),
            ("@", " zavináč "),
        ]

    case "sl":
        return [
            ("npr.", "na primer "),
            ("tj.", "to je "),
            ("@", " afna "),
        ]

    case "sv":
        return [
            ("t.ex.", "till exempel "),
            ("t. ex.", "till exempel "),
            ("dvs.", "det vill säga "),
            ("@", " snabel a "),
        ]

    case "tr":
        return [
            ("örn.", "örneğin "),
            ("yani", "yani "),
            ("@", " et "),
        ]

    case "uk":
        return [
            ("напр.", "наприклад "),
            ("тобто", "тобто "),
            ("@", " ет "),
        ]

    case "vi":
        return [
            ("ví dụ", "ví dụ "),
            ("tức là", "tức là "),
            ("@", " a còng "),
        ]

    default:
        return [
            ("@", " at "),
        ]
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

    // Replace known expressions (language-specific)
    let exprReplacements = expressionReplacements(for: lang)
    for (old, replacement) in exprReplacements {
        text = text.replacingOccurrences(of: old, with: replacement)
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

/// Calculate and print the real-time factor (RTF).
/// RTF = wall-clock-seconds / audio-duration-seconds.
/// RTF < 1.0 means faster than real-time; RTF > 1.0 means slower.
func printRealtimeFactor(_ wallClockSeconds: Double, _ audioDurationSeconds: Double) {
    guard audioDurationSeconds > 0 else {
        print("  -> RTF: N/A (zero audio duration)")
        return
    }
    let rtf = wallClockSeconds / audioDurationSeconds
    print(String(format: "  -> RTF: %.3f  (wall: %.2fs / audio: %.2fs)", rtf, wallClockSeconds, audioDurationSeconds))
}

/// Return the current process resident memory in MB.
func currentResidentMemoryMB() -> Double {
    #if os(macOS)
    var info = task_vm_info_data_t()
    var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
    let kr = withUnsafeMutablePointer(to: &info) { ptr -> kern_return_t in
        ptr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { intPtr in
            task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), intPtr, &count)
        }
    }
    if kr == KERN_SUCCESS {
        return Double(info.resident_size) / (1024.0 * 1024.0)
    }
    #endif
    return 0
}

// MARK: - Thermal / Power Proxy Diagnostics

struct SystemSnapshot {
    let elapsedSeconds: Double
    let thermalState: String
    let thermalRank: Int
    let lowPowerMode: Bool
    let residentMemoryMB: Double
    let cpuUserSeconds: Double
    let cpuSystemSeconds: Double

    var cpuTotalSeconds: Double {
        cpuUserSeconds + cpuSystemSeconds
    }
}

func thermalStateLabelAndRank() -> (String, Int) {
    switch ProcessInfo.processInfo.thermalState {
    case .nominal:
        return ("nominal", 0)
    case .fair:
        return ("fair", 1)
    case .serious:
        return ("serious", 2)
    case .critical:
        return ("critical", 3)
    @unknown default:
        return ("unknown", -1)
    }
}

func currentProcessCPUSeconds() -> (user: Double, system: Double) {
    var usage = rusage()
    guard getrusage(RUSAGE_SELF, &usage) == 0 else {
        return (0, 0)
    }
    let user = Double(usage.ru_utime.tv_sec) + Double(usage.ru_utime.tv_usec) / 1_000_000.0
    let system = Double(usage.ru_stime.tv_sec) + Double(usage.ru_stime.tv_usec) / 1_000_000.0
    return (user, system)
}

func makeSystemSnapshot(startDate: Date) -> SystemSnapshot {
    let thermal = thermalStateLabelAndRank()
    let cpu = currentProcessCPUSeconds()
    return SystemSnapshot(
        elapsedSeconds: Date().timeIntervalSince(startDate),
        thermalState: thermal.0,
        thermalRank: thermal.1,
        lowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled,
        residentMemoryMB: currentResidentMemoryMB(),
        cpuUserSeconds: cpu.user,
        cpuSystemSeconds: cpu.system
    )
}

func percentChange(_ old: Double, _ new: Double) -> Double {
    guard old != 0 else { return 0 }
    return ((new - old) / old) * 100.0
}

/// Print the current process resident RAM in MB.
func printPeakMemory() {
    let mb = currentResidentMemoryMB()
    if mb > 0 {
        print(String(format: "  -> Process RAM: %.1f MB", mb))
    } else {
        print("  -> Process RAM: unavailable")
    }
}

/// Print a performance summary averaging RTF and memory across all test runs.
func printPerformanceSummary(
    rtfValues: [Double],
    memoryValues: [Double],
    snapshots: [SystemSnapshot],
    nTest: Int,
    computeUnits: String,
    intraOpThreads: Int32,
    batchSize: Int = 1,
    totalStep: Int = 8
) {
    guard !rtfValues.isEmpty else { return }

    let rtf = stats(rtfValues)!
    let memory = stats(memoryValues) ?? Stats(avg: 0, min: 0, max: 0)

    let threadsLabel: String = intraOpThreads > 0
        ? "\(intraOpThreads) (with spinning)"
        : "ORT default"

    let split = max(1, rtfValues.count / 2)
    let firstHalf = Array(rtfValues.prefix(split))
    let secondHalf = Array(rtfValues.suffix(rtfValues.count - split))

    let firstAvg = firstHalf.reduce(0, +) / Double(firstHalf.count)
    let secondAvg = secondHalf.isEmpty
        ? firstAvg
        : secondHalf.reduce(0, +) / Double(secondHalf.count)

    let rtfDriftPct = percentChange(firstAvg, secondAvg)

    let firstSnapshot = snapshots.first
    let lastSnapshot = snapshots.last
    let worstSnapshot = snapshots.max { $0.thermalRank < $1.thermalRank }

    let cpuSummary: String
    if let first = firstSnapshot, let last = lastSnapshot {
        let cpuDelta = max(0, last.cpuTotalSeconds - first.cpuTotalSeconds)
        let wallDelta = max(0.000_001, last.elapsedSeconds - first.elapsedSeconds)
        let avgCoreEquivalent = cpuDelta / wallDelta
        let totalCores = ProcessInfo.processInfo.activeProcessorCount
        let pctOfAllCores = (avgCoreEquivalent / Double(totalCores)) * 100.0

        cpuSummary = String(
            format: "  CPU: avg %.2f cores (%.0f%% of %d cores)",
            avgCoreEquivalent,
            pctOfAllCores,
            totalCores
        )
    } else {
        cpuSummary = "  CPU: unavailable"
    }

    let thermalSummary: String
    if let first = firstSnapshot, let last = lastSnapshot, let worst = worstSnapshot {
        thermalSummary = String(
            "  Thermal: \(first.thermalState) → \(last.thermalState) (worst: \(worst.thermalState))  LowPower: \(last.lowPowerMode ? "yes" : "no")"
        )
    } else {
        thermalSummary = "  Thermal: unavailable"
    }

    print("\n=== Performance / Thermal Summary (\(nTest) runs) ===")
    print("  Compute units: \(computeUnits)")
    print("  Denoising steps: \(totalStep)")
    print("  Batch size: \(batchSize)")
    print("  Intra-op threads: \(threadsLabel)")

    print(String(format: "  RTF: avg=%.3f  min=%.3f  max=%.3f", rtf.avg, rtf.min, rtf.max))
    print(String(format: "  RTF first-half avg: %.3f", firstAvg))
    print(String(format: "  RTF second-half avg: %.3f", secondAvg))
    print(String(format: "  RTF drift under load: %+.1f%%", rtfDriftPct))

    print(String(format: "  Process RAM: avg=%.1f MB  peak=%.1f MB", memory.avg, memory.max))
    print(thermalSummary)
    print(cpuSummary)
    print("===================================================")
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

func loadCfgs(_ configPath: String) throws -> Config {
    let data = try Data(contentsOf: URL(fileURLWithPath: configPath))
    return try JSONDecoder().decode(Config.self, from: data)
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
        let textIdsValue = try makeInt64Tensor(textIdsFlat, shape: textIdsShape)
        
        // Flatten text mask
        let textMaskFlat = textMask.flatMap { $0.flatMap { $0 } }
        let textMaskShape: [NSNumber] = [NSNumber(value: bsz), 1, NSNumber(value: textMask[0][0].count)]
        let textMaskValue = try makeFloatTensor(textMaskFlat, shape: textMaskShape)
        
        // Predict duration
        let dpOutputs = try dpOrt.run(withInputs: ["text_ids": textIdsValue, "style_dp": style.dp, "text_mask": textMaskValue],
                                      outputNames: ["duration"],
                                      runOptions: nil)
        
        var duration = try floatArray(from: dpOutputs["duration"]!)
        
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
        let totalStepValue = try makeFloatTensor(totalStepArray, shape: [NSNumber(value: bsz)])
        
        // Denoising loop
        for step in 0..<totalStep {
            let currentStepArray = Array(repeating: Float(step), count: bsz)
            let currentStepValue = try makeFloatTensor(currentStepArray, shape: [NSNumber(value: bsz)])
            
            // Flatten xt
            let xtFlat = xt.flatMap { $0.flatMap { $0 } }
            let xtShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: xt[0].count), NSNumber(value: xt[0][0].count)]
            let xtValue = try makeFloatTensor(xtFlat, shape: xtShape)
            
            // Flatten latent mask
            let latentMaskFlat = latentMask.flatMap { $0.flatMap { $0 } }
            let latentMaskShape: [NSNumber] = [NSNumber(value: bsz), 1, NSNumber(value: latentMask[0][0].count)]
            let latentMaskValue = try makeFloatTensor(latentMaskFlat, shape: latentMaskShape)
            
            let vectorEstOutputs = try vectorEstOrt.run(withInputs: [
                "noisy_latent": xtValue,
                "text_emb": textEmbValue,
                "style_ttl": style.ttl,
                "latent_mask": latentMaskValue,
                "text_mask": textMaskValue,
                "current_step": currentStepValue,
                "total_step": totalStepValue
            ], outputNames: ["denoised_latent"], runOptions: nil)
            
            let denoisedFlat = try floatArray(from: vectorEstOutputs["denoised_latent"]!)
            
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
        let finalXtValue = try makeFloatTensor(finalXtFlat, shape: finalXtShape)
        
        let vocoderOutputs = try vocoderOrt.run(withInputs: ["latent": finalXtValue],
                                                outputNames: ["wav_tts"],
                                                runOptions: nil)
        
        let wav = try floatArray(from: vocoderOutputs["wav_tts"]!)
        
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
        
        copyStyleComponent(voiceStyle.style_ttl, into: &ttlFlat, batchIndex: i, dim1: ttlDim1, dim2: ttlDim2)
        copyStyleComponent(voiceStyle.style_dp, into: &dpFlat, batchIndex: i, dim1: dpDim1, dim2: dpDim2)
    }
    
    let ttlShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: ttlDim1), NSNumber(value: ttlDim2)]
    let dpShape: [NSNumber] = [NSNumber(value: bsz), NSNumber(value: dpDim1), NSNumber(value: dpDim2)]
    
    let ttlValue = try makeFloatTensor(ttlFlat, shape: ttlShape)
    let dpValue = try makeFloatTensor(dpFlat, shape: dpShape)
    
    if verbose {
        print("Loaded \(bsz) voice styles\n")
    }
    
    return Style(ttl: ttlValue, dp: dpValue)
}

// MARK: - Power Watts via powermetrics

struct PowerSample {
    var cpuMW: Double?
    var gpuMW: Double?
    var aneMW: Double?
    var combinedMW: Double?
    var eClusterFreqMHz: Double?
    var pClusterFreqMHz: Double?
    var gpuFreqMHz: Double?

    var totalMW: Double {
        combinedMW ?? ((cpuMW ?? 0) + (gpuMW ?? 0) + (aneMW ?? 0))
    }
}

final class PowerMetricsMonitor {
    private let queue = DispatchQueue(label: "tts.powermetrics.monitor")
    private let process = Process()
    private let pipe = Pipe()
    private let stderrPipe = Pipe()

    private var current = PowerSample()
    private var currentHasData = false
    private var samples = [PowerSample]()

    func start() {
        guard geteuid() == 0 else {
            print("Power watts: unavailable; run the binary with sudo and --power-watts")
            return
        }

        process.executableURL = URL(fileURLWithPath: "/usr/bin/powermetrics")
        process.arguments = [
            "-i", "1000",
            "-n", "0",
            "-s", "cpu_power,gpu_power",
            "--show-usage-summary"
        ]
        process.standardOutput = pipe
        process.standardError = stderrPipe

        stderrPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            for line in text.split(separator: "\n") {
                print("[powermetrics-stderr] \(line)")
            }
        }

        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }

            self?.queue.async {
                self?.consume(text)
            }
        }

        do {
            try process.run()
            print("Power watts: enabled via powermetrics")
        } catch {
            print("Power watts: failed to start powermetrics: \(error)")
        }
    }

    func stop() -> [PowerSample] {
        if process.isRunning {
            process.terminate()
            process.waitUntilExit()
        }

        // Drain any remaining buffered data before clearing the handler.
        // The readabilityHandler is async, so data arriving after terminate()
        // would otherwise be lost when we nil it out.
        let remainingStdout = pipe.fileHandleForReading.readDataToEndOfFile()
        let remainingStderr = stderrPipe.fileHandleForReading.readDataToEndOfFile()

        pipe.fileHandleForReading.readabilityHandler = nil
        stderrPipe.fileHandleForReading.readabilityHandler = nil

        if let text = String(data: remainingStderr, encoding: .utf8) {
            for line in text.split(separator: "\n") {
                print("[powermetrics-stderr] \(line)")
            }
        }

        if process.terminationStatus != 0 {
            print("Power watts: powermetrics exited with status \(process.terminationStatus)")
        }

        return queue.sync {
            // Process any remaining stdout data before committing.
            if let text = String(data: remainingStdout, encoding: .utf8) {
                consume(text)
            }
            commitCurrentIfNeeded()
            // Debug: print first sample raw values.
            if let first = samples.first {
                print("[powermetrics-debug] first sample: cpu=\(first.cpuMW ?? 0) gpu=\(first.gpuMW ?? 0) ane=\(first.aneMW ?? 0) total=\(first.totalMW) mW")
            }
            return samples
        }
    }

    private func consume(_ text: String) {
        for rawLine in text.split(separator: "\n", omittingEmptySubsequences: false) {
            parseLine(String(rawLine))
        }
    }

    private func parseLine(_ line: String) {
        if line.contains("Sampled system activity") {
            commitCurrentIfNeeded()
            current = PowerSample()
            currentHasData = false
            return
        }

        if let mw = parseMW(line, label: "CPU Power") {
            current.cpuMW = mw
            currentHasData = true
            return
        }

        if let mw = parseMW(line, label: "Combined Power") {
            current.combinedMW = mw
            currentHasData = true
            return
        }

        if let freq = parseFreqMHz(line, label: "E-Cluster HW active frequency") {
            current.eClusterFreqMHz = freq
            currentHasData = true
            return
        }

        if let freq = parseFreqMHz(line, label: "P-Cluster HW active frequency") {
            current.pClusterFreqMHz = freq
            currentHasData = true
            return
        }
    }

    private func parseFreqMHz(_ line: String, label: String) -> Double? {
        parseNumericValue(line, label: label, pattern: #":\s*([0-9]+(?:\.[0-9]+)?)\s*MHz\b"#) { value, _ in value }
    }

    private func parseMW(_ line: String, label: String) -> Double? {
        parseNumericValue(line, label: label, pattern: #"([0-9]+(?:\.[0-9]+)?)\s*(mW|W)\b"#) { value, unit in
            unit == "W" ? value * 1000.0 : value
        }
    }

    private func parseNumericValue(
        _ line: String,
        label: String,
        pattern: String,
        transform: (Double, String?) -> Double
    ) -> Double? {
        guard line.contains(label) else { return nil }
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(line.startIndex..<line.endIndex, in: line)
        guard let match = regex.firstMatch(in: line, range: range),
              let valueRange = Range(match.range(at: 1), in: line),
              let value = Double(line[valueRange]) else {
            return nil
        }
        let unit: String? = (match.numberOfRanges > 2 && match.range(at: 2).length > 0)
            ? String(line[Range(match.range(at: 2), in: line)!])
            : nil
        return transform(value, unit)
    }

    private func commitCurrentIfNeeded() {
        if currentHasData {
            samples.append(current)
            current = PowerSample()
            currentHasData = false
        }
    }
}

// MARK: - Statistics Helpers

struct Stats {
    let avg: Double
    let min: Double
    let max: Double
}

func stats(_ values: [Double]) -> Stats? {
    guard !values.isEmpty else { return nil }
    return Stats(
        avg: values.reduce(0, +) / Double(values.count),
        min: values.min()!,
        max: values.max()!
    )
}

func summarizePower(_ samples: [PowerSample]) -> String {
    guard !samples.isEmpty else {
        return "  Power watts: unavailable"
    }

    let total = samples.map { $0.totalMW / 1000.0 }
    let totalStats = stats(total)!

    let eFreqs = samples.compactMap { $0.eClusterFreqMHz }
    let pFreqs = samples.compactMap { $0.pClusterFreqMHz }
    let eStats = stats(eFreqs) ?? Stats(avg: 0, min: 0, max: 0)
    let pStats = stats(pFreqs) ?? Stats(avg: 0, min: 0, max: 0)

    return String(
        format:
        """
          Power samples: %d
          Power overall: avg=%.2f W  peak=%.2f W
          Freq E-Cluster: avg=%.0f MHz  peak=%.0f MHz
          Freq P-Cluster: avg=%.0f MHz  peak=%.0f MHz
        """,
        samples.count,
        totalStats.avg, totalStats.max,
        eStats.avg, eStats.max,
        pStats.avg, pStats.max,
    )
}

// MARK: - Scheduler Boosting (QoS + Task Role + Activity)

/// Declares foreground task role, latency-critical activity, and QoS.
/// Keep an instance alive for the entire inference run.
final class SchedulerBoost {
    private var activity: NSObjectProtocol?

    init() {
        // Prevent App Nap / energy throttling hints.
        activity = ProcessInfo.processInfo.beginActivity(
            options: [
                .userInitiated,           // indicate this is a user-initiated task that should be prioritized
                .latencyCritical,         // optimize for latency, not power
                .idleSystemSleepDisabled  // prevent sleep due to inactivity during long runs (backgrounded or not)
            ],
            reason: "Low-latency TTS inference"
        )

        // Current thread QoS.
        pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0) // Also set the higher-level QoS for any APIs that check it instead of pthread directly
        Thread.current.qualityOfService = .userInteractive

        // Optional Mach task foreground role.
        setTaskForegroundRole()
    }

    deinit {
        if let activity {
            ProcessInfo.processInfo.endActivity(activity)
        }
    }
}

private func setTaskForegroundRole() {
    #if os(macOS)
    var policy = task_category_policy_data_t()
    policy.role = TASK_FOREGROUND_APPLICATION
    let count = mach_msg_type_number_t(
        MemoryLayout<task_category_policy_data_t>.size /
        MemoryLayout<integer_t>.size
    )
    let kr = withUnsafeMutablePointer(to: &policy) { ptr in
        ptr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { intPtr in
            task_policy_set(
                mach_task_self_,
                task_policy_flavor_t(TASK_CATEGORY_POLICY),
                intPtr,
                count
            )
        }
    }
    if kr != KERN_SUCCESS {
        print("Warning: task_policy_set foreground failed: \(kr)")
    }
    #endif
}

// MARK: - CoreML Execution Provider (GPU Mode)

enum CoreMLComputeUnits: String, CaseIterable {
    case allUnits = "ALL"
    case cpuAndGpu = "CPUAndGPU"
    case cpuOnly = "CPUOnly"
}

func makeCoreMLProviderOptions(computeUnits: String, modelFormat: String, cacheDir: String?) -> [AnyHashable: Any] {
    var options: [AnyHashable: Any] = [
        "MLComputeUnits": computeUnits,
        "ModelFormat": modelFormat,
        "RequireStaticInputShapes": "1", // no dynamic shapes, force to settle for better optimization
        "EnableOnSubgraphs": "0",        // subgraph support is still spotty
        "ProfileComputePlan": "0",       // disable internal profiling to reduce overhead and noise
        "SpecializationStrategy": "FastPrediction" // optimize for latency over memory (we have plenty of RAM headroom in typical use cases)
    ]
    if let cacheDir {
        options["ModelCacheDirectory"] = cacheDir
    }
    return options
}

// MARK: - ORT Output Extraction

func floatArray(from value: ORTValue) throws -> [Float] {
    let data = try value.tensorData() as Data
    return data.withUnsafeBytes {
        Array($0.bindMemory(to: Float.self))
    }
}

// MARK: - Tensor Helpers

func makeFloatTensor(_ data: [Float], shape: [NSNumber]) throws -> ORTValue {
    return try ORTValue(tensorData: NSMutableData(bytes: data, length: data.count * MemoryLayout<Float>.size),
                        elementType: .float,
                        shape: shape)
}

func makeInt64Tensor(_ data: [Int64], shape: [NSNumber]) throws -> ORTValue {
    return try ORTValue(tensorData: NSMutableData(bytes: data, length: data.count * MemoryLayout<Int64>.size),
                        elementType: .int64,
                        shape: shape)
}

// MARK: - Style Helpers

func copyStyleComponent(
    _ component: VoiceStyleData.StyleComponent,
    into flat: inout [Float],
    batchIndex: Int,
    dim1: Int,
    dim2: Int
) {
    let offset = batchIndex * dim1 * dim2
    var idx = 0
    for batch in component.data {
        for row in batch {
            for val in row {
                flat[offset + idx] = val
                idx += 1
            }
        }
    }
}

// MARK: - Session Option Helpers

func makeORTSessionOptions(intraOpThreads: Int32) throws -> ORTSessionOptions {
    let options = try ORTSessionOptions()
    try options.setGraphOptimizationLevel(.all)
    if intraOpThreads > 0 {
        try options.setIntraOpNumThreads(intraOpThreads)

        // values as a result of a small grid search study
        try options.addConfigEntry(withKey: "session.intra_op.allow_spinning", value: "1")
        try options.addConfigEntry(withKey: "session.intra_op.spin_duration_us", value: "750")
        try options.addConfigEntry(withKey: "session.intra_op.spin_backoff_max", value: "16")
    }
    return options
}

func createCPUSession(
    env: ORTEnv,
    modelPath: String,
    intraOpThreads: Int32
) throws -> ORTSession {
    let options = try makeORTSessionOptions(intraOpThreads: intraOpThreads)
    return try ORTSession(env: env, modelPath: modelPath, sessionOptions: options)
}

func coreMLFallbackTiers(preferred: String) -> [(computeUnits: String, label: String)] {
    let allTiers: [(computeUnits: String, label: String)] = [
        ("CPUAndNeuralEngine", "CoreML (CPU+ANE)"),
        ("ALL", "CoreML (CPU+GPU+ANE)"),
        ("CPUAndGPU", "CoreML (CPU+GPU)"),
        ("CPUOnly", "CoreML (CPU only)")
    ]
    let fallbacks = allTiers.filter { $0.computeUnits != preferred }
    return allTiers.first(where: { $0.computeUnits == preferred }).map { [$0] + fallbacks } ?? fallbacks
}

func createSessionWithCoreMLFallback(
    env: ORTEnv,
    modelPath: String,
    computeUnits: String,
    cacheDir: String?,
    intraOpThreads: Int32 = 0,
    modelFormat: String = "MLProgram"
) throws -> ORTSession {
    // "CPU" means pure CPU (no CoreML EP)
    guard computeUnits != "CPU" else {
        print("Using CPU for inference")
        return try createCPUSession(env: env, modelPath: modelPath, intraOpThreads: intraOpThreads)
    }

    guard ORTIsCoreMLExecutionProviderAvailable() else {
        print("Warning: CoreML EP is not available in this ONNX Runtime build. Falling back to CPU.")
        return try createCPUSession(env: env, modelPath: modelPath, intraOpThreads: intraOpThreads)
    }

    let tiers = coreMLFallbackTiers(preferred: computeUnits)

    for (tierComputeUnits, label) in tiers {
        do {
            let options = try makeORTSessionOptions(intraOpThreads: intraOpThreads)
            let providerOptions = makeCoreMLProviderOptions(
                computeUnits: tierComputeUnits,
                modelFormat: modelFormat,
                cacheDir: cacheDir
            )
            try options.appendCoreMLExecutionProvider(withOptionsV2: providerOptions)
            let session = try ORTSession(env: env, modelPath: modelPath, sessionOptions: options)
            print("Using \(label) for inference")
            return session
        } catch {
            if tiers.last?.computeUnits == tierComputeUnits {
                // Last tier failed, fall back to CPU
                print("Warning: CoreML EP failed. Falling back to CPU.")
                return try createCPUSession(env: env, modelPath: modelPath, intraOpThreads: intraOpThreads)
            }
            // Continue to next tier
        }
    }

    // Should not reach here, but just in case
    return try createCPUSession(env: env, modelPath: modelPath, intraOpThreads: intraOpThreads)
}

// MARK: - Model Paths & Sessions

struct ModelPaths {
    let config: String
    let unicodeIndexer: String
    let durationPredictor: String
    let textEncoder: String
    let vectorEstimator: String
    let vocoder: String
    let cacheDir: String
}

func makeModelPaths(_ onnxDir: String) -> ModelPaths {
    let p = { (onnxDir as NSString).appendingPathComponent($0) }
    return ModelPaths(
        config: p("tts.json"),
        unicodeIndexer: p("unicode_indexer.json"),
        durationPredictor: p("duration_predictor.onnx"),
        textEncoder: p("text_encoder.onnx"),
        vectorEstimator: p("vector_estimator.onnx"),
        vocoder: p("vocoder.onnx"),
        cacheDir: (onnxDir as NSString).appendingPathComponent("../coreml_cache")
    )
}

struct TTSSessions {
    let dp: ORTSession
    let textEnc: ORTSession
    let vectorEst: ORTSession
    let vocoder: ORTSession
}

func loadTTSSessions(
    env: ORTEnv,
    paths: ModelPaths,
    computeUnits: String,
    intraOpThreads: Int32
) throws -> TTSSessions {
    // dp/textEnc/vectorEst run CPU (vectorEst is in the denoising loop;
    // CoreML partition overhead is multiplied by totalStep).
    // Only vocoder uses CoreML when requested.
    let dp = try createSessionWithCoreMLFallback(
        env: env,
        modelPath: paths.durationPredictor,
        computeUnits: "CPU",
        cacheDir: paths.cacheDir,
        intraOpThreads: intraOpThreads
    )
    let textEnc = try createSessionWithCoreMLFallback(
        env: env,
        modelPath: paths.textEncoder,
        computeUnits: "CPU",
        cacheDir: paths.cacheDir,
        intraOpThreads: intraOpThreads
    )
    let vectorEst = try createSessionWithCoreMLFallback(
        env: env,
        modelPath: paths.vectorEstimator,
        computeUnits: "CPU",
        cacheDir: paths.cacheDir,
        intraOpThreads: intraOpThreads
    )
    let vocoder = try createSessionWithCoreMLFallback(
        env: env,
        modelPath: paths.vocoder,
        computeUnits: computeUnits,
        cacheDir: paths.cacheDir,
        intraOpThreads: intraOpThreads
    )
    return TTSSessions(dp: dp, textEnc: textEnc, vectorEst: vectorEst, vocoder: vocoder)
}

func loadTextToSpeech(_ onnxDir: String, _ computeUnits: String, _ intraOpThreads: Int32, _ env: ORTEnv) throws -> TextToSpeech {
    let paths = makeModelPaths(onnxDir)
    let cfgs = try loadCfgs(paths.config)
    let sessions = try loadTTSSessions(env: env, paths: paths, computeUnits: computeUnits, intraOpThreads: intraOpThreads)
    let textProcessor = try UnicodeProcessor(unicodeIndexerPath: paths.unicodeIndexer)

    return TextToSpeech(cfgs: cfgs, textProcessor: textProcessor,
                       dpOrt: sessions.dp, textEncOrt: sessions.textEnc,
                       vectorEstOrt: sessions.vectorEst, vocoderOrt: sessions.vocoder)
}
