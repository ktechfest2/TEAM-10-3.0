"""Turns video/script.json into one wav per scene with the Piper voice, and prints each length in seconds.
Usage: python tts.py <voice.onnx> <out dir>"""
import json, sys, wave
from pathlib import Path
from piper import PiperVoice

voice_path, out = sys.argv[1], Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(voice_path)
lengths = {}
for scene in json.loads((Path(__file__).parent / "script.json").read_text()):
    path = out / f"{scene['id']}.wav"
    with wave.open(str(path), "wb") as wav:
        voice.synthesize_wav(scene["text"], wav)
    with wave.open(str(path)) as w:
        lengths[scene["id"]] = round(w.getnframes() / w.getframerate(), 2)
(out / "lengths.json").write_text(json.dumps(lengths))
print(lengths, "total", round(sum(lengths.values()), 1))
