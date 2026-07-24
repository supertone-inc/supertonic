#include "helper.h"
#include <iostream>
#include <filesystem>
#include <algorithm>
#include <string>
#include <vector>

namespace fs = std::filesystem;

struct Args {
    std::string onnx_dir = "../../assets/onnx";
    int total_step = 8;
    float speed = 1.05f;
    int n_test = 4;
    std::vector<std::string> voice_style = {"../../assets/voice_styles/M1.json"};
    std::vector<std::string> text = {
        "This morning, I took a walk in the park, and the sound of the birds and the breeze was so pleasant that I stopped for a long time just to listen."
    };
    std::vector<std::string> lang = {"en"};
    std::string save_dir = "results";
    bool batch = false;
};

auto splitString = [](const std::string& str, char delim) {
    std::vector<std::string> result;
    size_t start = 0, pos;
    while ((pos = str.find(delim, start)) != std::string::npos) {
        result.push_back(str.substr(start, pos - start));
        start = pos + 1;
    }
    result.push_back(str.substr(start));
    return result;
};

Args parseArgs(int argc, char* argv[]) {
    Args args;
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--onnx-dir" && i + 1 < argc) args.onnx_dir = argv[++i];
        else if (arg == "--total-step" && i + 1 < argc) args.total_step = std::stoi(argv[++i]);
        else if (arg == "--speed" && i + 1 < argc) args.speed = std::stof(argv[++i]);
        else if (arg == "--n-test" && i + 1 < argc) args.n_test = std::stoi(argv[++i]);
        else if (arg == "--voice-style" && i + 1 < argc) args.voice_style = splitString(argv[++i], ',');
        else if (arg == "--text" && i + 1 < argc) args.text = splitString(argv[++i], '|');
        else if (arg == "--lang" && i + 1 < argc) args.lang = splitString(argv[++i], ',');
        else if (arg == "--save-dir" && i + 1 < argc) args.save_dir = argv[++i];
        else if (arg == "--batch") args.batch = true;
    }
    return args;
}

int main(int argc, char* argv[]) {
    std::cout << "=== TTS Inference with ONNX Runtime (C++) ===\n\n";
    
    // --- 1. Parse arguments --- //
    Args args = parseArgs(argc, argv);
    int total_step = args.total_step;
    float speed = args.speed;
    int n_test = args.n_test;
    std::string save_dir = args.save_dir;
    std::vector<std::string> voice_style_paths = args.voice_style;
    std::vector<std::string> text_list = args.text;
    std::vector<std::string> lang_list = args.lang;
    bool batch = args.batch;
    
    if (voice_style_paths.size() != text_list.size()) {
        std::cerr << "Error: Number of voice styles (" << voice_style_paths.size() 
                  << ") must match number of texts (" << text_list.size() << ")\n";
        return 1;
    }
    int bsz = voice_style_paths.size();
    
    // --- 2. Load Text to Speech --- //
    auto providers = Ort::GetAvailableProviders();
    bool has_cuda = false | std::find(providers.begin(), providers.end(),
                            "CUDAExecutionProvider") != providers.end();

    std::cout << "CUDA available: " << std::boolalpha << has_cuda << std::endl;
    Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "TTS");
    Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(
        OrtAllocatorType::OrtArenaAllocator, OrtMemType::OrtMemTypeDefault
    );
    
    auto text_to_speech = loadTextToSpeech(env, args.onnx_dir, has_cuda);
    std::cout << std::endl;
    
    // --- 3. Load Voice Style --- //
    auto style = loadVoiceStyle(voice_style_paths, true);
    
    // --- 4. Synthesize speech --- //
    fs::create_directories(save_dir);
    
    for (int n = 0; n < n_test; n++) {
        std::cout << "\n[" << (n + 1) << "/" << n_test << "] Starting synthesis...\n";
        
        auto result = timer("Generating speech from text", [&]() {
            if (batch) {
                return text_to_speech->batch(memory_info, text_list, lang_list, style, total_step, speed);
            } else {
                return text_to_speech->call(memory_info, text_list[0], lang_list[0], style, total_step, speed);
            }
        });
        
        int sample_rate = text_to_speech->getSampleRate();
        int wav_shape_1 = result.wav.size() / bsz;
        
        for (int b = 0; b < bsz; b++) {
            std::string fname = sanitizeFilename(text_list[b], 20) + "_" + std::to_string(n + 1) + ".wav";
            int wav_len = static_cast<int>(sample_rate * result.duration[b]);
            
            std::vector<float> wav_out(
                result.wav.begin() + b * wav_shape_1,
                result.wav.begin() + b * wav_shape_1 + wav_len
            );
            
            std::string output_path = save_dir + "/" + fname;
            writeWavFile(output_path, wav_out, sample_rate);
            std::cout << "Saved: " << output_path << "\n";
        }
        
        clearTensorBuffers();
    }
    
    std::cout << "\n=== Synthesis completed successfully! ===\n";
    return 0;
}
