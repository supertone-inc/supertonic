#!/usr/bin/env python3
"""Convert Supertonic 3 ONNX assets into MLX graph assets."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import numpy as np
import onnx
from onnx import numpy_helper


MODELS = ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"]


def _attr_value(attr: onnx.AttributeProto) -> Any:
    value = onnx.helper.get_attribute_value(attr)
    if isinstance(value, bytes):
        return value.decode()
    if isinstance(value, onnx.TensorProto):
        arr = numpy_helper.to_array(value)
        return {
            "dtype": str(arr.dtype),
            "shape": list(arr.shape),
            "data": arr.reshape(-1).tolist(),
        }
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (list, tuple)):
        return [v.decode() if isinstance(v, bytes) else v for v in value]
    return value


def convert_graph(onnx_path: Path, graph_path: Path, weights_path: Path) -> None:
    model = onnx.load(onnx_path, load_external_data=True)
    weights: dict[str, np.ndarray] = {}
    weight_map: dict[str, str] = {}

    for idx, init in enumerate(model.graph.initializer):
        key = f"w{idx:06d}"
        weight_map[init.name] = key
        weights[key] = numpy_helper.to_array(init)

    nodes = []
    const_idx = 0
    for node in model.graph.node:
        if node.op_type == "Constant":
            assert len(node.output) == 1
            attrs = {attr.name: _attr_value(attr) for attr in node.attribute}
            value = attrs.get("value")
            if value is None:
                raise ValueError(f"Unsupported Constant node without tensor: {node.name}")
            key = f"c{const_idx:06d}"
            const_idx += 1
            weight_map[node.output[0]] = key
            weights[key] = np.array(value["data"], dtype=np.dtype(value["dtype"])).reshape(value["shape"])
            continue
        nodes.append(
            {
                "op_type": node.op_type,
                "name": node.name,
                "inputs": list(node.input),
                "outputs": list(node.output),
                "attrs": {attr.name: _attr_value(attr) for attr in node.attribute},
            }
        )

    graph = {
        "ir_version": model.ir_version,
        "opsets": [{"domain": op.domain, "version": op.version} for op in model.opset_import],
        "inputs": [value.name for value in model.graph.input if value.name not in weight_map],
        "outputs": [value.name for value in model.graph.output],
        "weight_map": weight_map,
        "nodes": nodes,
    }
    graph_path.parent.mkdir(parents=True, exist_ok=True)
    weights_path.parent.mkdir(parents=True, exist_ok=True)
    graph_path.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
    np.savez(weights_path, **weights)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Official Supertone/supertonic-3 checkout")
    parser.add_argument("--output", required=True, help="Output MLX asset directory")
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    (output / "graphs").mkdir(exist_ok=True)
    (output / "weights").mkdir(exist_ok=True)

    for name in MODELS:
        convert_graph(
            source / "onnx" / f"{name}.onnx",
            output / "graphs" / f"{name}.json",
            output / "weights" / f"{name}.npz",
        )

    shutil.copy2(source / "onnx" / "tts.json", output / "tts.json")
    shutil.copy2(source / "onnx" / "unicode_indexer.json", output / "unicode_indexer.json")
    if (source / "voice_styles").exists():
        shutil.copytree(source / "voice_styles", output / "voice_styles", dirs_exist_ok=True)
    if (source / "README.md").exists():
        shutil.copy2(source / "README.md", output / "README.official.md")
        official = (source / "README.md").read_text(encoding="utf-8")
    else:
        official = "# Supertonic 3\n"
    manifest = {
        "format": "supertonic-mlx-graph",
        "source_repo": "Supertone/supertonic-3",
        "target_repo": "mlx-community/supertonic-3",
        "graphs": MODELS,
        "sample_rate": 44100,
    }
    (output / "mlx_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    note = """---
license: openrail
base_model: Supertone/supertonic-3
library_name: mlx
tags:
- mlx
- text-to-speech
- on-device
- audio
---

# Supertonic 3 MLX

This repository contains a community MLX conversion of [`Supertone/supertonic-3`](https://huggingface.co/Supertone/supertonic-3).

The original ONNX graphs are converted into JSON topology plus NPZ initializers. Inference is executed with MLX arrays through the Supertonic-specific graph runtime in [`ailuntx/supertonic`](https://github.com/ailuntx/supertonic).

```bash
git clone https://github.com/ailuntx/supertonic
cd supertonic
python scripts/infer_mlx.py \\
  --model /path/to/supertonic-3 \\
  --text "Supertonic 3 is running with MLX." \\
  --lang en \\
  --voice M1 \\
  --total-step 8 \\
  --output output.wav
```

The MLX graph runtime has been checked against ONNX Runtime on the official assets; per-stage maximum absolute errors are around `1e-5`.

## Original Model Card

"""
    (output / "README.md").write_text(note + official, encoding="utf-8")
    (output / ".gitattributes").write_text(
        "*.npz filter=lfs diff=lfs merge=lfs -text\n"
        "*.wav filter=lfs diff=lfs merge=lfs -text\n",
        encoding="utf-8",
    )
    print(output)


if __name__ == "__main__":
    main()
