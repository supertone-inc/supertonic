# Supertonic Flutter Example

This example demonstrates how to use Supertonic in a Flutter application using ONNX Runtime.

> **Note:** This project uses the `flutter_onnxruntime` package ([https://pub.dev/packages/flutter_onnxruntime](https://pub.dev/packages/flutter_onnxruntime)).


## 📰 Update News

**2025.11.28** - Added iOS platform support.

**2025.11.23** - Added and tested macOS support.

## Requirements

- Flutter SDK version ^3.5.0
- iOS 16.0+ or macOS 14.0+

## Running the Demo

### macOS

```bash
flutter clean
flutter pub get
flutter run -d macos
```

### iOS

```bash
flutter clean
flutter pub get
cd ios && pod install && cd ..
flutter run -d ios --release # debug mode has performance issue
```

Or run on a specific iOS device/simulator:

```bash
# List available devices
flutter devices

# Run on a specific device
flutter run -d <device_id>
```

## Platform-Specific Notes

### iOS
- Requires iOS 16.0 or later (due to ONNX Runtime requirements)
- Generated audio files are saved to the app's Documents directory
- Files can be accessed via the Files app (On My iPhone → Supertonic)
- File sharing is enabled for easy access via iTunes/Finder

### macOS
- Requires macOS 14.0 or later
- Generated audio files can be saved to the Downloads folder
