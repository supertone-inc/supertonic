"""Small ONNX graph executor for the Supertonic 3 MLX export.

The converter stores ONNX topology as JSON and all initializers/constants in
NPZ files. This module executes the subset of ONNX ops used by Supertonic 3
with MLX arrays.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import mlx.core as mx
import numpy as np


_NP_DTYPES = {
    1: np.float32,
    2: np.uint8,
    3: np.int8,
    4: np.uint16,
    5: np.int16,
    6: np.int32,
    7: np.int64,
    9: np.bool_,
    10: np.float16,
    11: np.float64,
}


def _is_mx(x: Any) -> bool:
    return isinstance(x, mx.array)


def _np(x: Any) -> np.ndarray:
    if isinstance(x, np.ndarray):
        return x
    if isinstance(x, mx.array):
        return np.array(x)
    return np.array(x)


def _shape_tuple(x: Any) -> tuple[int, ...]:
    arr = _np(x).astype(np.int64).reshape(-1)
    return tuple(int(v) for v in arr)


def _axes(x: Any) -> tuple[int, ...]:
    return tuple(int(v) for v in _np(x).astype(np.int64).reshape(-1))


def _binary(a: Any, b: Any, fn_mx, fn_np):
    if _is_mx(a) or _is_mx(b):
        if not _is_mx(a):
            a = mx.array(a)
        if not _is_mx(b):
            b = mx.array(b)
        return fn_mx(a, b)
    return fn_np(a, b)


def _dtype_from_onnx(to: int):
    if to in (1, 10):
        return mx.float16 if to == 10 else mx.float32
    if to == 7:
        return mx.int64
    if to == 6:
        return mx.int32
    if to == 9:
        return mx.bool_
    return None


class MLXGraph:
    def __init__(self, graph_json: str | Path, weights_npz: str | Path):
        with open(graph_json, encoding="utf-8") as f:
            data = json.load(f)
        self.inputs = data["inputs"]
        self.outputs = data["outputs"]
        self.nodes = data["nodes"]
        self.weight_map = data["weight_map"]
        loaded = np.load(weights_npz)
        self.weights = {
            name: self._prepare_weight(loaded[key])
            for name, key in self.weight_map.items()
        }

    @staticmethod
    def _prepare_weight(arr: np.ndarray):
        if arr.dtype.kind in "f":
            return mx.array(arr)
        return arr

    def __call__(self, **inputs):
        env: dict[str, Any] = dict(self.weights)
        for name, value in inputs.items():
            if isinstance(value, mx.array):
                env[name] = value
            elif isinstance(value, np.ndarray) and value.dtype.kind in "f":
                env[name] = mx.array(value)
            else:
                env[name] = value

        for node in self.nodes:
            op = node["op_type"]
            ins = [env[name] for name in node["inputs"] if name]
            attrs = node.get("attrs", {})
            out_names = node["outputs"]
            res = self._run_node(op, ins, attrs)
            if len(out_names) == 1:
                env[out_names[0]] = res
            else:
                for name, value in zip(out_names, res):
                    env[name] = value

        return [env[name] for name in self.outputs]

    def _run_node(self, op: str, ins: list[Any], attrs: dict[str, Any]):
        if op == "Add":
            return _binary(ins[0], ins[1], lambda a, b: a + b, np.add)
        if op == "Sub":
            return _binary(ins[0], ins[1], lambda a, b: a - b, np.subtract)
        if op == "Mul":
            return _binary(ins[0], ins[1], lambda a, b: a * b, np.multiply)
        if op == "Div":
            return _binary(ins[0], ins[1], lambda a, b: a / b, np.divide)
        if op == "Pow":
            return _binary(ins[0], ins[1], lambda a, b: mx.power(a, b), np.power)
        if op == "Equal":
            return _binary(ins[0], ins[1], lambda a, b: a == b, np.equal)
        if op == "Where":
            cond, x, y = ins
            if _is_mx(x) or _is_mx(y):
                return mx.where(mx.array(cond) if not _is_mx(cond) else cond, x, y)
            return np.where(cond, x, y)
        if op == "MatMul":
            return ins[0] @ ins[1]
        if op == "Gemm":
            a, b = ins[0], ins[1]
            if attrs.get("transA", 0):
                a = a.T
            if attrs.get("transB", 0):
                b = b.T
            y = (float(attrs.get("alpha", 1.0)) * (a @ b))
            if len(ins) > 2:
                y = y + float(attrs.get("beta", 1.0)) * ins[2]
            return y
        if op == "Conv":
            x, w = ins[0], ins[1]
            bias = ins[2] if len(ins) > 2 else None
            stride = int(attrs.get("strides", [1])[0])
            dilation = int(attrs.get("dilations", [1])[0])
            group = int(attrs.get("group", 1))
            pads = attrs.get("pads", [0, 0])
            x = mx.transpose(x, (0, 2, 1))
            if pads and (pads[0] or pads[1]):
                x = mx.pad(x, [(0, 0), (int(pads[0]), int(pads[1])), (0, 0)])
            w = mx.transpose(w, (0, 2, 1))
            y = mx.conv1d(x, w, stride=stride, padding=0, dilation=dilation, groups=group)
            y = mx.transpose(y, (0, 2, 1))
            if bias is not None:
                y = y + bias.reshape(1, -1, 1)
            return y
        if op == "BatchNormalization":
            x, scale, bias, mean, var = ins[:5]
            eps = float(attrs.get("epsilon", 1e-5))
            shape = [1] * len(x.shape)
            shape[1] = -1
            return (x - mean.reshape(shape)) / mx.sqrt(var.reshape(shape) + eps) * scale.reshape(shape) + bias.reshape(shape)
        if op == "PRelu":
            x, slope = ins
            return mx.maximum(x, 0) + slope * mx.minimum(x, 0)
        if op == "Relu":
            return mx.maximum(ins[0], 0)
        if op == "Erf":
            return mx.erf(ins[0])
        if op == "Exp":
            return mx.exp(ins[0])
        if op == "Sin":
            return mx.sin(ins[0])
        if op == "Cos":
            return mx.cos(ins[0])
        if op == "Tanh":
            return mx.tanh(ins[0])
        if op == "Softplus":
            return mx.logaddexp(ins[0], mx.array(0, dtype=ins[0].dtype))
        if op == "Softmax":
            return mx.softmax(ins[0], axis=int(attrs.get("axis", -1)))
        if op == "LayerNormalization":
            x = ins[0]
            weight = ins[1] if len(ins) > 1 else None
            bias = ins[2] if len(ins) > 2 else None
            axis = int(attrs.get("axis", -1))
            eps = float(attrs.get("epsilon", 1e-5))
            if axis not in (-1, len(x.shape) - 1):
                raise NotImplementedError("LayerNormalization only supports last axis")
            return mx.fast.layer_norm(x, weight, bias, eps)
        if op == "Shape":
            return np.array(ins[0].shape, dtype=np.int64)
        if op == "Gather":
            axis = int(attrs.get("axis", 0))
            data, idx = ins
            if _is_mx(data):
                return mx.take(data, mx.array(idx), axis=axis)
            return np.take(data, _np(idx), axis=axis)
        if op == "Concat":
            axis = int(attrs.get("axis", 0))
            if any(_is_mx(x) for x in ins):
                return mx.concatenate([x if _is_mx(x) else mx.array(x) for x in ins], axis=axis)
            return np.concatenate([_np(x) for x in ins], axis=axis)
        if op == "Unsqueeze":
            x = ins[0]
            axes = sorted(_axes(ins[1]))
            for axis in axes:
                x = mx.expand_dims(x, axis) if _is_mx(x) else np.expand_dims(x, axis)
            return x
        if op == "Squeeze":
            x = ins[0]
            axes = _axes(ins[1]) if len(ins) > 1 else None
            return mx.squeeze(x, axis=axes) if _is_mx(x) else np.squeeze(x, axis=axes)
        if op == "Reshape":
            return mx.reshape(ins[0], _shape_tuple(ins[1])) if _is_mx(ins[0]) else np.reshape(ins[0], _shape_tuple(ins[1]))
        if op == "Transpose":
            perm = attrs.get("perm")
            return mx.transpose(ins[0], tuple(perm) if perm else None) if _is_mx(ins[0]) else np.transpose(ins[0], tuple(perm) if perm else None)
        if op == "Slice":
            data = ins[0]
            starts = _np(ins[1]).astype(np.int64).reshape(-1)
            ends = _np(ins[2]).astype(np.int64).reshape(-1)
            axes = _np(ins[3]).astype(np.int64).reshape(-1) if len(ins) > 3 else np.arange(len(starts))
            steps = _np(ins[4]).astype(np.int64).reshape(-1) if len(ins) > 4 else np.ones_like(starts)
            slc = [slice(None)] * len(data.shape)
            for st, en, ax, step in zip(starts, ends, axes, steps):
                dim = data.shape[int(ax)]
                st = int(st + dim if st < 0 else st)
                en = int(en + dim if en < 0 else en)
                if en > dim:
                    en = dim
                slc[int(ax)] = slice(st, en, int(step))
            return data[tuple(slc)]
        if op == "Pad":
            x = ins[0]
            pads = _np(ins[1]).astype(np.int64).reshape(-1)
            rank = len(x.shape)
            pad_width = [(int(pads[i]), int(pads[i + rank])) for i in range(rank)]
            value = float(_np(ins[2]).reshape(-1)[0]) if len(ins) > 2 else 0.0
            mode = attrs.get("mode", "constant")
            if isinstance(mode, bytes):
                mode = mode.decode()
            if _is_mx(x):
                return mx.pad(x, pad_width, mode="edge" if mode == "edge" else "constant", constant_values=value)
            return np.pad(x, pad_width, mode="edge" if mode == "edge" else "constant", constant_values=value)
        if op == "Cast":
            to = int(attrs["to"])
            if _is_mx(ins[0]):
                dtype = _dtype_from_onnx(to)
                return ins[0].astype(dtype) if dtype is not None else ins[0]
            return _np(ins[0]).astype(_NP_DTYPES.get(to, _np(ins[0]).dtype))
        if op == "ConstantOfShape":
            shape = _shape_tuple(ins[0])
            value = attrs.get("value")
            if value is None:
                return mx.zeros(shape, dtype=mx.float32)
            arr = np.array(value["data"], dtype=np.dtype(value["dtype"])).reshape(value["shape"])
            fill = arr.reshape(-1)[0]
            if arr.dtype.kind in "f":
                return mx.full(shape, float(fill), dtype=mx.float32)
            return np.full(shape, fill, dtype=arr.dtype)
        if op == "Clip":
            x = ins[0]
            lo = _np(ins[1]).reshape(-1)[0] if len(ins) > 1 else None
            hi = _np(ins[2]).reshape(-1)[0] if len(ins) > 2 else None
            if _is_mx(x):
                if lo is not None:
                    x = mx.maximum(x, float(lo))
                if hi is not None:
                    x = mx.minimum(x, float(hi))
                return x
            return np.clip(x, lo, hi)
        if op == "Expand":
            requested = list(_shape_tuple(ins[1]))
            input_shape = list(ins[0].shape)
            rank = max(len(requested), len(input_shape))
            requested = [1] * (rank - len(requested)) + requested
            input_shape = [1] * (rank - len(input_shape)) + input_shape
            shape = tuple(max(int(a), int(b)) for a, b in zip(requested, input_shape))
            return mx.broadcast_to(ins[0], shape) if _is_mx(ins[0]) else np.broadcast_to(ins[0], shape)
        if op == "Tile":
            reps = _shape_tuple(ins[1])
            return mx.tile(ins[0], reps) if _is_mx(ins[0]) else np.tile(ins[0], reps)
        if op == "Split":
            axis = int(attrs.get("axis", 0))
            split = _np(ins[1]).astype(np.int64).reshape(-1) if len(ins) > 1 else None
            if split is None:
                return mx.split(ins[0], len(split), axis=axis) if _is_mx(ins[0]) else np.array_split(ins[0], len(split), axis=axis)
            indices = np.cumsum(split)[:-1].tolist()
            return mx.split(ins[0], indices, axis=axis) if _is_mx(ins[0]) else np.split(ins[0], indices, axis=axis)
        if op == "ReduceSum":
            axes = _axes(ins[1]) if len(ins) > 1 else None
            keepdims = bool(attrs.get("keepdims", 1))
            return mx.sum(ins[0], axis=axes, keepdims=keepdims)
        if op == "Reciprocal":
            return 1 / ins[0]
        raise NotImplementedError(f"Unsupported ONNX op: {op}")
