import os
from pathlib import Path
import onnxruntime as ort

def get_best_provider(use_gpu: bool = True):
    """
    Returns the best available ONNX Runtime execution provider.
    Prioritizes CUDA, then DirectML, then CPU.
    """
    if not use_gpu:
        return ["CPUExecutionProvider"]

    available = ort.get_available_providers()
    print(f"🔎 Available Providers: {available}")
    
    providers_list = []

    if 'CUDAExecutionProvider' in available:
        print("✅ Found CUDA! Configuring for NVIDIA GPU...")
        providers_list.append('CUDAExecutionProvider')

    if 'DmlExecutionProvider' in available:
        print("✅ Found DirectML! Configuring for GPU...")
        providers_list.append('DmlExecutionProvider')

    providers_list.append('CPUExecutionProvider')
    
    print(f"🚀 Selected Providers: {providers_list}")
    return providers_list