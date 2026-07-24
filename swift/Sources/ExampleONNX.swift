import Foundation
import Darwin
import OnnxRuntimeBindings

struct Args {
    var computeUnits: String = "ALL"  // ALL, CPUAndGPU, CPUAndNeuralEngine, CPUOnly, CPU, see README.md
    var intraOpThreads: Int32 = 2     // Pareto-optimal default for modern Apple Silicon devices (Macbook Air M4, etc.), set to 0 for ORT default
    var powerWatts: Bool = false      // Enable power monitoring via powermetrics (requires sudo) - significant overhead, so disabled by default
    var batchSize: Int = 1            // Expand single input into N identical copies for throughput benchmarking
    var onnxDir: String = "../assets/onnx"
    var totalStep: Int = 8            // Total number of decoding steps to generate. Set to 1 for pure single-step latency benchmarking, or higher for more realistic continuous generation scenarios.
    var speed: Float = 1.45
    var nTest: Int = 4                // Number of measured runs (excluding warmup), set to 50 for more stable benchmarking under continuous load
    var voiceStyle: [String] = ["../assets/voice_styles/M1.json"]
    var text: [String] = ["This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."]
    var lang: [String] = ["en"]
    var saveDir: String = "results"
    var batch: Bool = true            // Batching helps in all continuous generation scenarios tested
}

// MARK: - CLI Parsing Helpers

func readStringArg(_ arguments: [String], _ i: inout Int) -> String? {
    guard i + 1 < arguments.count else { return nil }
    i += 1
    return arguments[i]
}

func readIntArg(_ arguments: [String], _ i: inout Int) -> Int? {
    guard i + 1 < arguments.count else { return nil }
    i += 1
    return Int(arguments[i])
}

func readFloatArg(_ arguments: [String], _ i: inout Int) -> Float? {
    guard i + 1 < arguments.count else { return nil }
    i += 1
    return Float(arguments[i])
}

func readInt32Arg(_ arguments: [String], _ i: inout Int) -> Int32? {
    guard i + 1 < arguments.count else { return nil }
    i += 1
    return Int32(arguments[i])
}

// MARK: - Batch Expansion

func expandIfSingle<T>(_ values: [T], to count: Int) -> [T] {
    values.count == 1 ? Array(repeating: values[0], count: count) : values
}

// MARK: - Argument Validation

func validateArgs(_ args: Args) -> String? {
    if args.batch {
        if args.voiceStyle.count != args.text.count {
            return "Error: Number of voice styles (\(args.voiceStyle.count)) must match number of texts (\(args.text.count))"
        }
        if args.lang.count != args.text.count {
            return "Error: Number of languages (\(args.lang.count)) must match number of texts (\(args.text.count))"
        }
    }
    return nil
}

// MARK: - Argument Parsing

func parseArgs() -> Args {
    var args = Args()
    let arguments = CommandLine.arguments
    
    var i = 1
    while i < arguments.count {
        let arg = arguments[i]
        
        switch arg {

        case "--compute-units":
            if let value = readStringArg(arguments, &i) { args.computeUnits = value }

        case "--threads":
            if let value = readInt32Arg(arguments, &i) { args.intraOpThreads = value }

        case "--power-watts":
            args.powerWatts = true
            
        case "--onnx-dir":
            if let value = readStringArg(arguments, &i) { args.onnxDir = value }

        case "--total-step":
            if let value = readIntArg(arguments, &i) { args.totalStep = value }

        case "--speed":
            if let value = readFloatArg(arguments, &i) { args.speed = value }

        case "--n-test":
            if let value = readIntArg(arguments, &i) { args.nTest = value }

        case "--voice-style":
            if let value = readStringArg(arguments, &i) { args.voiceStyle = value.components(separatedBy: ",") }

        case "--text":
            if let value = readStringArg(arguments, &i) { args.text = value.components(separatedBy: "|") }

        case "--lang":
            if let value = readStringArg(arguments, &i) { args.lang = value.components(separatedBy: ",") }

        case "--save-dir":
            if let value = readStringArg(arguments, &i) { args.saveDir = value }

        case "--batch":
            args.batch = true

        case "--batch-size":
            if let value = readIntArg(arguments, &i) { args.batchSize = max(1, value) }

        default:
            break
        }
        
        i += 1
    }
    
    return args
}

// MARK: - Synthesis Helpers

func synthesize(
    textToSpeech: TextToSpeech,
    args: Args,
    style: Style,
    totalStep: Int,
    speed: Float
) throws -> (wav: [Float], duration: [Float]) {
    if args.batch {
        return try textToSpeech.batch(args.text, args.lang, style, totalStep, speed: speed)
    } else {
        let result = try textToSpeech.call(args.text[0], args.lang[0], style, totalStep, speed: speed, silenceDuration: 0.3)
        return (result.wav, [result.duration])
    }
}

func timedSynthesis(
    textToSpeech: TextToSpeech,
    args: Args,
    style: Style,
    totalStep: Int,
    speed: Float
) throws -> (wav: [Float], duration: [Float], wallClock: Double) {
    let start = Date()
    let result = try timer("Generating speech from text") {
        try synthesize(textToSpeech: textToSpeech, args: args, style: style, totalStep: totalStep, speed: speed)
    }
    let wallClock = Date().timeIntervalSince(start)
    return (result.wav, result.duration, wallClock)
}

func extractWavOutput(
    wav: [Float],
    duration: [Float],
    index: Int,
    batchSize: Int,
    sampleRate: Int,
    isBatch: Bool
) -> [Float] {
    if isBatch {
        let wavLen = wav.count / batchSize
        let actualLen = Int(Float(sampleRate) * duration[index])
        let wavStart = index * wavLen
        let wavEnd = min(wavStart + actualLen, wavStart + wavLen)
        return Array(wav[wavStart..<wavEnd])
    } else {
        let actualLen = Int(Float(sampleRate) * duration[0])
        return Array(wav.prefix(actualLen))
    }
}

@main
struct ExampleONNX {
    static func main() async {
        print("=== TTS Inference with ONNX Runtime (Swift) ===\n")
        
        // --- 1. Parse arguments --- //
        var args = parseArgs()

        // Expand single input into N identical copies for throughput benchmarking.
        if args.batchSize > 1 {
            args.batch = true
            args.text = expandIfSingle(args.text, to: args.batchSize)
            args.lang = expandIfSingle(args.lang, to: args.batchSize)
            args.voiceStyle = expandIfSingle(args.voiceStyle, to: args.batchSize)
        }

        if let error = validateArgs(args) {
            print(error)
            return
        }

        let bsz = args.voiceStyle.count
        
        do {
            // --- 1.5. Scheduler boost (QoS + task role + activity) --- //
            // Keep alive for the entire benchmark so deinit doesn't end the activity early.
            let schedulerBoost = SchedulerBoost()
            defer { withExtendedLifetime(schedulerBoost) {} }

            // --- 1.6. Nice value (display only; set via outer `nice` command or `--nice` CLI) --- //
            let env = try ORTEnv(loggingLevel: .warning)

            // --- 2. Load TTS components --- //
            if args.intraOpThreads > 0 {
                print("Intra-op threads: \(args.intraOpThreads) (with spinning)")
            } else {
                print("Intra-op threads: ORT default")
            }
            print("")
            let textToSpeech = try loadTextToSpeech(args.onnxDir, args.computeUnits, args.intraOpThreads, env)
            
            // --- 3. Load voice styles --- //
            let style = try loadVoiceStyle(args.voiceStyle, verbose: true)
            
            // --- 3.5. Power monitor (optional) --- //
            let powerMonitor: PowerMetricsMonitor?
            if args.powerWatts {
                let monitor = PowerMetricsMonitor()
                monitor.start()
                powerMonitor = monitor
            } else {
                powerMonitor = nil
            }

            // --- 4. Warmup run (not measured) --- //
            print("\n--- Warmup run (not measured) ---")
            _ = try synthesize(textToSpeech: textToSpeech, args: args, style: style, totalStep: args.totalStep, speed: args.speed)
            print("  -> Warmup complete\n")

            // --- 5. Measured runs --- //
            try? FileManager.default.createDirectory(atPath: args.saveDir, withIntermediateDirectories: true)

            let diagnosticsStartDate = Date()
            var systemSnapshots = [SystemSnapshot]()
            systemSnapshots.append(makeSystemSnapshot(startDate: diagnosticsStartDate))

            var rtfValues = [Double]()
            var memoryValues = [Double]()

            for n in 0..<args.nTest {
                print("\n[\(n + 1)/\(args.nTest)] Starting synthesis...")

                let result = try timedSynthesis(
                    textToSpeech: textToSpeech,
                    args: args,
                    style: style,
                    totalStep: args.totalStep,
                    speed: args.speed
                )

                // Collect diagnostics
                let totalAudioDuration = Double(result.duration.reduce(0, +))
                let rtf = totalAudioDuration > 0 ? result.wallClock / totalAudioDuration : 0
                rtfValues.append(rtf)
                memoryValues.append(currentResidentMemoryMB())
                systemSnapshots.append(makeSystemSnapshot(startDate: diagnosticsStartDate))
                printRealtimeFactor(result.wallClock, totalAudioDuration)
                printPeakMemory()

                // Save outputs
                for i in 0..<bsz {
                    let fname = "\(args.totalStep)_steps_\(sanitizeFilename(args.text[i], maxLen: 20))_\(n + 1).wav"
                    let wavOut = extractWavOutput(
                        wav: result.wav,
                        duration: result.duration,
                        index: i,
                        batchSize: bsz,
                        sampleRate: textToSpeech.sampleRate,
                        isBatch: args.batch
                    )

                    let outputPath = "\(args.saveDir)/\(fname)"
                    try writeWavFile(outputPath, wavOut, textToSpeech.sampleRate)
                    print("Saved: \(outputPath)")
                }
            }
            
            // Stop power monitor
            let powerSamples = powerMonitor?.stop() ?? []

            // Print performance summary
            printPerformanceSummary(
                rtfValues: rtfValues,
                memoryValues: memoryValues,
                snapshots: systemSnapshots,
                nTest: args.nTest,
                computeUnits: args.computeUnits,
                intraOpThreads: args.intraOpThreads,
                batchSize: bsz,
                totalStep: args.totalStep
            )

            // Print power summary if enabled and data available
            if args.powerWatts, !powerSamples.isEmpty {
                print(summarizePower(powerSamples))
            } else if args.powerWatts {
                print("  Power watts: skipped (run with sudo for powermetrics access)")
            }
            
            print("\n=== Synthesis completed successfully! ===")
            
        } catch {
            print("Error during inference: \(error)")
            exit(1)
        }
    }
}
