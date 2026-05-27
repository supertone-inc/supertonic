import argparse
import csv
import hashlib
import json
import os
import resource
import statistics
import time
from dataclasses import dataclass
from typing import Any

import yaml

from helper import load_text_to_speech, load_voice_style, sanitize_filename


@dataclass(frozen=True)
class BenchmarkCase:
    case_id: str
    category: str
    method_id: str
    text: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Vietnamese text-normalization benchmark for Supertonic ONNX."
    )
    parser.add_argument(
        "--config",
        default="configs/vietnamese_text_normalization_benchmark.yaml",
        help="Path to benchmark YAML config.",
    )
    parser.add_argument("--max-cases", type=int, default=None)
    parser.add_argument("--output-prefix", default=None)
    parser.add_argument("--save-audio", action="store_true")
    parser.add_argument("--total-step", type=int, default=None)
    parser.add_argument("--speed", type=float, default=None)
    parser.add_argument("--voice-style", default=None)
    return parser.parse_args()


def as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def load_config(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    if "test_cases_from" in config:
        base_path = config["test_cases_from"]
        if not os.path.isabs(base_path):
            base_path = os.path.join(os.path.dirname(path), base_path)
        with open(base_path, "r", encoding="utf-8") as f:
            base_config = yaml.safe_load(f)
        config.setdefault("normalization_methods", base_config["normalization_methods"])
        config["test_cases"] = base_config["test_cases"]
    return config


def build_run_fingerprint(config: dict[str, Any], args: argparse.Namespace) -> str:
    payload = {
        "config": config,
        "container": read_cgroup_limits(),
        "env": {
            "MALLOC_ARENA_MAX": os.environ.get("MALLOC_ARENA_MAX"),
            "OMP_NUM_THREADS": os.environ.get("OMP_NUM_THREADS"),
            "OPENBLAS_NUM_THREADS": os.environ.get("OPENBLAS_NUM_THREADS"),
            "MKL_NUM_THREADS": os.environ.get("MKL_NUM_THREADS"),
            "NUMEXPR_NUM_THREADS": os.environ.get("NUMEXPR_NUM_THREADS"),
        },
        "overrides": {
            "max_cases": args.max_cases,
            "save_audio": args.save_audio,
            "total_step": args.total_step,
            "speed": args.speed,
            "voice_style": args.voice_style,
        },
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:10]


def build_default_output_prefix(
    config: dict[str, Any], args: argparse.Namespace, output_dir: str
) -> tuple[str, str]:
    benchmark_name = config.get("benchmark", {}).get("name", "benchmark")
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in benchmark_name)
    fingerprint = build_run_fingerprint(config, args)
    return os.path.join(output_dir, f"{safe_name}_{fingerprint}"), fingerprint


def expand_cases(config: dict[str, Any]) -> list[BenchmarkCase]:
    methods = config["normalization_methods"]
    cases: list[BenchmarkCase] = []
    for item in config["test_cases"]:
        for method in methods:
            field = method["input_field"]
            cases.append(
                BenchmarkCase(
                    case_id=item["id"],
                    category=item["category"],
                    method_id=method["id"],
                    text=item[field],
                )
            )
    return cases


def mb_from_kb(value: int) -> float:
    return value / 1024.0


def read_process_status() -> dict[str, int | None]:
    values: dict[str, int | None] = {
        "rss_mb": None,
        "threads": None,
        "voluntary_context_switches": None,
        "nonvoluntary_context_switches": None,
    }
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as f:
            for line in f:
                key, _, raw_value = line.partition(":")
                raw_value = raw_value.strip()
                if key == "VmRSS":
                    values["rss_mb"] = int(raw_value.split()[0]) // 1024
                elif key == "Threads":
                    values["threads"] = int(raw_value)
                elif key == "voluntary_ctxt_switches":
                    values["voluntary_context_switches"] = int(raw_value)
                elif key == "nonvoluntary_ctxt_switches":
                    values["nonvoluntary_context_switches"] = int(raw_value)
    except FileNotFoundError:
        pass
    return values


def read_cgroup_limits() -> dict[str, str]:
    limits: dict[str, str] = {}
    for name, path in {
        "cgroup_memory_max": "/sys/fs/cgroup/memory.max",
        "cgroup_cpu_max": "/sys/fs/cgroup/cpu.max",
        "cgroup_pids_max": "/sys/fs/cgroup/pids.max",
    }.items():
        try:
            with open(path, "r", encoding="utf-8") as f:
                limits[name] = f.read().strip()
        except FileNotFoundError:
            limits[name] = ""
    return limits


def read_cgroup_memory_current_mb() -> float | None:
    try:
        with open("/sys/fs/cgroup/memory.current", "r", encoding="utf-8") as f:
            return int(f.read().strip()) / 1024 / 1024
    except (FileNotFoundError, ValueError):
        return None


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row["method_id"], []).append(row)

    method_summary: dict[str, dict[str, float | int]] = {}
    for method_id, items in grouped.items():
        latencies = [float(x["latency_seconds"]) for x in items]
        rtfs = [float(x["rtf"]) for x in items]
        text_chars = [int(x["text_chars"]) for x in items]
        cpu_seconds = [float(x["cpu_seconds"]) for x in items]
        rss_after = [
            float(x["rss_after_mb"])
            for x in items
            if x["rss_after_mb"] not in (None, "")
        ]
        cgroup_memory_after = [
            float(x["cgroup_memory_after_mb"])
            for x in items
            if x["cgroup_memory_after_mb"] not in (None, "")
        ]
        thread_counts = [
            int(x["threads_after"])
            for x in items
            if x["threads_after"] not in (None, "")
        ]
        char_throughputs = [float(x["throughput_chars_per_second"]) for x in items]
        audio_throughputs = [
            float(x["throughput_audio_seconds_per_second"]) for x in items
        ]
        method_summary[method_id] = {
            "cases": len(items),
            "text_chars_total": sum(text_chars),
            "text_chars_mean": statistics.fmean(text_chars),
            "text_chars_min": min(text_chars),
            "text_chars_max": max(text_chars),
            "total_wall_seconds": sum(latencies),
            "total_audio_duration_seconds": sum(
                float(x["audio_duration_seconds"]) for x in items
            ),
            "latency_mean_seconds": statistics.fmean(latencies),
            "latency_p50_seconds": statistics.median(latencies),
            "latency_max_seconds": max(latencies),
            "cpu_seconds_mean": statistics.fmean(cpu_seconds),
            "cpu_seconds_max": max(cpu_seconds),
            "rss_after_mean_mb": statistics.fmean(rss_after) if rss_after else None,
            "rss_after_max_mb": max(rss_after) if rss_after else None,
            "cgroup_memory_after_mean_mb": statistics.fmean(cgroup_memory_after)
            if cgroup_memory_after
            else None,
            "cgroup_memory_after_max_mb": max(cgroup_memory_after)
            if cgroup_memory_after
            else None,
            "threads_after_mean": statistics.fmean(thread_counts)
            if thread_counts
            else None,
            "threads_after_max": max(thread_counts) if thread_counts else None,
            "rtf_mean": statistics.fmean(rtfs),
            "rtf_p50": statistics.median(rtfs),
            "rtf_max": max(rtfs),
            "throughput_chars_per_second_mean": statistics.fmean(char_throughputs),
            "throughput_audio_seconds_per_second_mean": statistics.fmean(
                audio_throughputs
            ),
        }

    return {
        "total_cases": len(rows),
        "methods": method_summary,
    }


def write_csv(path: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    # Excel on Windows often guesses ANSI unless UTF-8 BOM is present.
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def flatten_summary(summary: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    runtime = summary.get("runtime", {})
    for method_id, metrics in summary.get("methods", {}).items():
        row = {
            "method_id": method_id,
            "total_cases": summary.get("total_cases"),
            "elapsed_wall_seconds": summary.get("elapsed_wall_seconds"),
            **runtime,
            **metrics,
        }
        rows.append(row)
    return rows


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    runtime = config["runtime"]
    lang = config["benchmark"]["language"]

    onnx_dir = runtime["onnx_dir"]
    voice_style = args.voice_style or runtime["voice_style"]
    total_step = args.total_step or int(runtime["total_step"])
    speed = args.speed or float(runtime["speed"])
    intra_op_num_threads = runtime.get("intra_op_num_threads")
    inter_op_num_threads = runtime.get("inter_op_num_threads")
    if intra_op_num_threads is not None:
        intra_op_num_threads = int(intra_op_num_threads)
    if inter_op_num_threads is not None:
        inter_op_num_threads = int(inter_op_num_threads)
    execution_mode = runtime.get("execution_mode", "sequential")
    enable_cpu_mem_arena = as_bool(runtime.get("enable_cpu_mem_arena", True))
    enable_mem_pattern = as_bool(runtime.get("enable_mem_pattern", True))
    enable_mem_reuse = as_bool(runtime.get("enable_mem_reuse", True))
    disable_prepacking = as_bool(runtime.get("disable_prepacking", False))
    allow_spinning = as_bool(runtime.get("allow_spinning", True))
    repeats = int(runtime.get("repeats_per_case", 1))
    warmup_runs = int(runtime.get("warmup_runs", 0))
    save_audio = bool(runtime.get("save_audio", False) or args.save_audio)
    output_dir = runtime["output_dir"]
    os.makedirs(output_dir, exist_ok=True)

    if args.output_prefix:
        output_prefix = args.output_prefix
        run_fingerprint = None
    else:
        output_prefix, run_fingerprint = build_default_output_prefix(
            config, args, output_dir
        )
    audio_output_dir = f"{output_prefix}.audio"
    if save_audio:
        os.makedirs(audio_output_dir, exist_ok=True)

    cases = expand_cases(config)
    if args.max_cases is not None:
        cases = cases[: args.max_cases]

    print(
        f"Loaded {len(cases)} expanded cases from {len(config['test_cases'])} base cases"
    )
    print(f"Runtime: total_step={total_step}, speed={speed}, voice_style={voice_style}")
    print(
        "ONNX threads: "
        f"intra_op={intra_op_num_threads or 'default'}, "
        f"inter_op={inter_op_num_threads or 'default'}"
    )
    print(
        "ONNX memory/perf: "
        f"mode={execution_mode}, arena={enable_cpu_mem_arena}, "
        f"mem_pattern={enable_mem_pattern}, mem_reuse={enable_mem_reuse}, "
        f"disable_prepacking={disable_prepacking}, spinning={allow_spinning}"
    )
    if run_fingerprint:
        print(f"Config fingerprint: {run_fingerprint}")
    print(f"Output prefix: {output_prefix}")

    tts = load_text_to_speech(
        onnx_dir,
        use_gpu=False,
        intra_op_num_threads=intra_op_num_threads,
        inter_op_num_threads=inter_op_num_threads,
        execution_mode=execution_mode,
        enable_cpu_mem_arena=enable_cpu_mem_arena,
        enable_mem_pattern=enable_mem_pattern,
        enable_mem_reuse=enable_mem_reuse,
        disable_prepacking=disable_prepacking,
        allow_spinning=allow_spinning,
    )
    style = load_voice_style([voice_style], verbose=True)

    if warmup_runs:
        print(f"Running {warmup_runs} warmup run(s)...")
    for _ in range(warmup_runs):
        tts("Khởi động bộ đo hiệu năng tiếng Việt.", lang, style, total_step, speed)

    rows: list[dict[str, Any]] = []
    benchmark_started = time.perf_counter()
    for index, case in enumerate(cases, start=1):
        for repeat_index in range(repeats):
            status_before = read_process_status()
            cgroup_memory_before_mb = read_cgroup_memory_current_mb()
            usage_before = resource.getrusage(resource.RUSAGE_SELF)
            started = time.perf_counter()
            wav, duration = tts(case.text, lang, style, total_step, speed)
            latency = time.perf_counter() - started
            usage_after = resource.getrusage(resource.RUSAGE_SELF)
            status_after = read_process_status()
            cgroup_memory_after_mb = read_cgroup_memory_current_mb()
            cpu_seconds = (
                usage_after.ru_utime
                - usage_before.ru_utime
                + usage_after.ru_stime
                - usage_before.ru_stime
            )
            audio_duration = float(duration[0].item())
            text_chars = len(case.text)
            rtf = latency / audio_duration if audio_duration > 0 else None
            chars_per_second = text_chars / latency if latency > 0 else None
            audio_per_second = audio_duration / latency if latency > 0 else None
            peak_rss_mb = mb_from_kb(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)

            audio_path = ""
            if save_audio:
                filename = (
                    f"{index:03d}_{case.method_id}_"
                    f"{sanitize_filename(case.text, 32)}_{repeat_index + 1}.wav"
                )
                audio_path = os.path.join(audio_output_dir, filename)
                import soundfile as sf

                sf.write(audio_path, wav[0, : int(tts.sample_rate * audio_duration)], tts.sample_rate)

            row = {
                "case_index": index,
                "case_id": case.case_id,
                "category": case.category,
                "method_id": case.method_id,
                "repeat_index": repeat_index,
                "text": case.text,
                "text_chars": text_chars,
                "latency_seconds": latency,
                "audio_duration_seconds": audio_duration,
                "rtf": rtf,
                "throughput_chars_per_second": chars_per_second,
                "throughput_audio_seconds_per_second": audio_per_second,
                "cpu_seconds": cpu_seconds,
                "cpu_utilization_ratio": cpu_seconds / latency if latency > 0 else None,
                "rss_before_mb": status_before["rss_mb"],
                "rss_after_mb": status_after["rss_mb"],
                "rss_delta_mb": (
                    status_after["rss_mb"] - status_before["rss_mb"]
                    if status_before["rss_mb"] is not None
                    and status_after["rss_mb"] is not None
                    else None
                ),
                "cgroup_memory_before_mb": cgroup_memory_before_mb,
                "cgroup_memory_after_mb": cgroup_memory_after_mb,
                "cgroup_memory_delta_mb": (
                    cgroup_memory_after_mb - cgroup_memory_before_mb
                    if cgroup_memory_before_mb is not None
                    and cgroup_memory_after_mb is not None
                    else None
                ),
                "peak_rss_mb": peak_rss_mb,
                "threads_before": status_before["threads"],
                "threads_after": status_after["threads"],
                "threads_delta": (
                    status_after["threads"] - status_before["threads"]
                    if status_before["threads"] is not None
                    and status_after["threads"] is not None
                    else None
                ),
                "voluntary_context_switches_delta": (
                    status_after["voluntary_context_switches"]
                    - status_before["voluntary_context_switches"]
                    if status_before["voluntary_context_switches"] is not None
                    and status_after["voluntary_context_switches"] is not None
                    else None
                ),
                "nonvoluntary_context_switches_delta": (
                    status_after["nonvoluntary_context_switches"]
                    - status_before["nonvoluntary_context_switches"]
                    if status_before["nonvoluntary_context_switches"] is not None
                    and status_after["nonvoluntary_context_switches"] is not None
                    else None
                ),
                "audio_path": audio_path,
            }
            rows.append(row)
            print(
                f"[{index:03d}/{len(cases)}] {case.method_id} {case.case_id}: "
                f"latency={latency:.3f}s audio={audio_duration:.3f}s rtf={rtf:.3f}"
            )

    elapsed = time.perf_counter() - benchmark_started
    summary = summarize(rows)
    summary["elapsed_wall_seconds"] = elapsed
    summary["runtime"] = {
        "onnx_dir": onnx_dir,
        "voice_style": voice_style,
        "total_step": total_step,
        "speed": speed,
        "intra_op_num_threads": intra_op_num_threads,
        "inter_op_num_threads": inter_op_num_threads,
        "execution_mode": execution_mode,
        "enable_cpu_mem_arena": enable_cpu_mem_arena,
        "enable_mem_pattern": enable_mem_pattern,
        "enable_mem_reuse": enable_mem_reuse,
        "disable_prepacking": disable_prepacking,
        "allow_spinning": allow_spinning,
        "repeats_per_case": repeats,
        "warmup_runs": warmup_runs,
        "save_audio": save_audio,
        "config_fingerprint": run_fingerprint,
        "output_prefix": output_prefix,
        "audio_output_dir": audio_output_dir if save_audio else "",
        **read_cgroup_limits(),
    }

    csv_path = f"{output_prefix}.csv"
    json_path = f"{output_prefix}.json"
    summary_json_path = f"{output_prefix}.summary.json"
    summary_csv_path = f"{output_prefix}.summary.csv"
    write_csv(csv_path, rows)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "rows": rows}, f, ensure_ascii=False, indent=2)
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    write_csv(summary_csv_path, flatten_summary(summary))

    print("\nBenchmark completed")
    print(f"CSV: {csv_path}")
    print(f"JSON: {json_path}")
    print(f"Summary JSON: {summary_json_path}")
    print(f"Summary CSV: {summary_csv_path}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
