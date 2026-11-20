"""Voiceover with Kokoro (offline neural voice), one wav per scene.
Usage: python tts_kokoro.py <kokoro.onnx> <voices.bin> <out dir> [voice] [speed]"""
import json, sys, wave
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.config import EspeakConfig

model, voices, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
voice = sys.argv[4] if len(sys.argv) > 4 else "am_michael"
speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
out.mkdir(parents=True, exist_ok=True)
# The pronunciation data bundled with the package points at a build machine, so use the system espeak-ng (install espeak-ng).
k = Kokoro(model, voices, espeak_config=EspeakConfig(lib_path="/usr/lib64/libespeak-ng.so.1", data_path="/usr/share/espeak-ng-data"))
lengths = {}
for scene in json.loads((Path(__file__).parent / "script.json").read_text()):
    samples, rate = k.create(scene["text"], voice=voice, speed=speed, lang="en-us")
    # a short breath of silence at the end of each scene
    samples = np.concatenate([samples, np.zeros(int(rate * 0.35), dtype=samples.dtype)])
    path = out / f"{scene['id']}.wav"
    sf.write(path, samples, rate, subtype="PCM_16")
    lengths[scene["id"]] = round(len(samples) / rate, 2)
(out / "lengths.json").write_text(json.dumps(lengths))
print(voice, lengths, "total", round(sum(lengths.values()), 1))
