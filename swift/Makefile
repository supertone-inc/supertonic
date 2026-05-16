.PHONY: build run run-release run-bench clean

# Setup and download models (if not already done), else fails
setup:
	brew install git-lfs
	git lfs install
	@if [ -d assets ]; then \
		echo "assets already exists - skipping"; \
	else \
		rm -f assets; \
		git clone https://huggingface.co/Supertone/supertonic-3 ../assets; \
		ln -s ../assets assets; \
	fi
	@if [ -d ../assets/voice_styles ]; then \
		echo "../assets/voice_styles already exists - skipping"; \
	else \
		git clone https://huggingface.co/Supertone/supertonic-3 ../assets/voice_styles; \
	fi

# Build the project (debug configuration)
build:
	swift build

# Run TTS inference (debug build)
run:
	swift run example_onnx

# Run TTS inference (release build, optimized for benchmarking)
run-release:
	swift run -c release example_onnx

# Clear build artifacts and CoreML compiled model cache
clean:
	rm -rf .build
	rm -rf ../assets/coreml_cache
