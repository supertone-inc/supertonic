import importlib.util
import contextlib
import io
import sys
import types
import unittest

if importlib.util.find_spec("onnxruntime") is None:
    sys.modules["onnxruntime"] = types.SimpleNamespace(
        SessionOptions=lambda: object(),
        InferenceSession=object,
    )

if importlib.util.find_spec("soundfile") is None:
    sys.modules["soundfile"] = types.SimpleNamespace(
        write=lambda *args, **kwargs: None,
    )

import numpy as np

from example_onnx import parse_args
from helper import (
    MAX_BATCH_SIZE,
    MAX_N_TEST,
    MAX_SPEED,
    MAX_TEXT_CHARS,
    MAX_TOTAL_STEP,
    MIN_N_TEST,
    MIN_SPEED,
    MIN_TOTAL_STEP,
    Style,
    TextToSpeech,
    validate_synthesis_inputs,
)


def make_style(batch_size: int) -> Style:
    ttl = np.zeros((batch_size, 1, 1), dtype=np.float32)
    dp = np.zeros((batch_size, 1, 1), dtype=np.float32)
    return Style(ttl, dp)


class RecordingTextToSpeech(TextToSpeech):
    def __init__(self):
        cfgs = {
            "ae": {"sample_rate": 44100, "base_chunk_size": 2048},
            "ttl": {"chunk_compress_factor": 1, "latent_dim": 1},
        }
        super().__init__(cfgs, None, None, None, None, None)
        self.inferred_texts = []

    def _infer(self, text_list, lang_list, style, total_step, speed=1.05):
        self.inferred_texts.extend(text_list)
        return np.zeros((1, 1), dtype=np.float32), np.array([0.001], dtype=np.float32)


class ValidateSynthesisInputsTests(unittest.TestCase):
    def test_accepts_valid_defaults(self):
        validate_synthesis_inputs(
            ["hello"],
            ["en"],
            total_step=8,
            speed=1.05,
            style=make_style(1),
            n_test=4,
        )

    def test_accepts_numpy_integer_scalars(self):
        validate_synthesis_inputs(
            ["hello"],
            ["en"],
            total_step=np.int64(8),
            speed=1.05,
            style_count=np.int64(1),
            n_test=np.int64(4),
        )

    def test_rejects_total_step_outside_bounds(self):
        for total_step in (MIN_TOTAL_STEP - 1, MAX_TOTAL_STEP + 1):
            with self.subTest(total_step=total_step):
                with self.assertRaisesRegex(ValueError, "total_step"):
                    validate_synthesis_inputs(["hello"], ["en"], total_step, 1.05)

    def test_rejects_invalid_speed(self):
        for speed in (float("nan"), float("inf"), MIN_SPEED - 0.01, MAX_SPEED + 0.01):
            with self.subTest(speed=speed):
                with self.assertRaisesRegex(ValueError, "speed"):
                    validate_synthesis_inputs(["hello"], ["en"], 8, speed)

    def test_rejects_n_test_outside_bounds(self):
        for n_test in (MIN_N_TEST - 1, MAX_N_TEST + 1):
            with self.subTest(n_test=n_test):
                with self.assertRaisesRegex(ValueError, "n_test"):
                    validate_synthesis_inputs(["hello"], ["en"], 8, 1.05, n_test=n_test)

    def test_rejects_overlong_text(self):
        text = "a" * (MAX_TEXT_CHARS + 1)
        with self.assertRaisesRegex(ValueError, "at most"):
            validate_synthesis_inputs([text], ["en"], 8, 1.05)

    def test_rejects_batch_size_over_limit(self):
        text_list = ["hello"] * (MAX_BATCH_SIZE + 1)
        lang_list = ["en"] * (MAX_BATCH_SIZE + 1)
        with self.assertRaisesRegex(ValueError, "batch size"):
            validate_synthesis_inputs(text_list, lang_list, 8, 1.05)

    def test_rejects_mismatched_language_count(self):
        with self.assertRaisesRegex(ValueError, "languages"):
            validate_synthesis_inputs(["hello", "bonjour"], ["en"], 8, 1.05)

    def test_rejects_mismatched_style_count(self):
        with self.assertRaisesRegex(ValueError, "style vectors"):
            validate_synthesis_inputs(
                ["hello", "bonjour"],
                ["en", "fr"],
                8,
                1.05,
                style=make_style(1),
            )

    def test_rejects_empty_and_blank_text(self):
        with self.assertRaisesRegex(ValueError, "at least one"):
            validate_synthesis_inputs([], [], 8, 1.05)

        with self.assertRaisesRegex(ValueError, "blank"):
            validate_synthesis_inputs(["   "], ["en"], 8, 1.05)


class TextToSpeechValidationTests(unittest.TestCase):
    def test_call_preserves_long_form_chunking_before_text_limit(self):
        tts = RecordingTextToSpeech()
        text = "This is a sentence. " * ((MAX_TEXT_CHARS // 20) + 10)

        wav, duration = tts(text, "en", make_style(1), 8, 1.05)

        self.assertGreater(len(text), MAX_TEXT_CHARS)
        self.assertGreater(len(tts.inferred_texts), 1)
        self.assertTrue(all(len(chunk) <= MAX_TEXT_CHARS for chunk in tts.inferred_texts))
        self.assertEqual(wav.shape[0], 1)
        self.assertEqual(duration.shape, (1,))


class CliValidationTests(unittest.TestCase):
    def assert_parse_exits_code_2(self, argv):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            with self.assertRaises(SystemExit) as exc:
                parse_args(argv)
        self.assertEqual(exc.exception.code, 2)

    def test_parse_args_accepts_valid_defaults(self):
        args = parse_args([])
        self.assertEqual(args.total_step, 8)
        self.assertEqual(args.speed, 1.05)
        self.assertEqual(args.n_test, 4)

    def test_parse_args_accepts_long_form_non_batch_text(self):
        text = "This is a sentence. " * ((MAX_TEXT_CHARS // 20) + 10)
        args = parse_args(["--text", text])
        self.assertGreater(len(args.text[0]), MAX_TEXT_CHARS)
        self.assertFalse(args.batch)

    def test_parse_args_rejects_overlong_batch_text_with_code_2(self):
        self.assert_parse_exits_code_2(
            [
                "--batch",
                "--text",
                "a" * (MAX_TEXT_CHARS + 1),
                "--voice-style",
                "a.json",
                "--lang",
                "en",
            ]
        )

    def test_parse_args_rejects_bad_speed_with_code_2(self):
        self.assert_parse_exits_code_2(["--speed", "0"])

    def test_parse_args_rejects_style_text_mismatch_with_code_2(self):
        self.assert_parse_exits_code_2(["--voice-style", "a.json", "b.json", "--text", "hello"])

    def test_parse_args_rejects_multiple_non_batch_texts_with_code_2(self):
        self.assert_parse_exits_code_2(
            [
                "--voice-style",
                "a.json",
                "b.json",
                "--text",
                "hello",
                "bonjour",
                "--lang",
                "en",
                "fr",
            ]
        )


if __name__ == "__main__":
    unittest.main()
