// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Supertonic",
    platforms: [
        .iOS(.v15), .macOS(.v14)
    ],
    dependencies: [
        .package(url: "https://github.com/microsoft/onnxruntime-swift-package-manager.git", from: "1.24.2"),
    ],
    targets: [
        .executableTarget(
            name: "example_onnx",
            dependencies: [
                .product(name: "onnxruntime", package: "onnxruntime-swift-package-manager")
            ],
            path: "Sources"
        )
    ]
)

