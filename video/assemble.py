"""Puts the recorded screen clips and the voiceover together into one captioned mp4.
Usage: python assemble.py <work dir with audio/ and clips/> <output.mp4>"""
import json, re, subprocess, sys
from pathlib import Path

work, out = Path(sys.argv[1]), Path(sys.argv[2])
scenes = json.loads((Path(__file__).parent / "script.json").read_text())
lengths = json.loads((work / "audio/lengths.json").read_text())
offsets = json.loads((work / "clips/offsets.json").read_text())
parts = work / "parts"
parts.mkdir(exist_ok=True)

def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(r.stdout.strip())

def stamp(t):
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{s:06.3f}".replace(".", ",")

def captions(text, voice_len, path):
    """One caption per sentence, shown for a share of the voice time equal to its share of the characters."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    total = sum(len(s) for s in sentences)
    t, lines = 0.0, []
    for i, s in enumerate(sentences, 1):
        d = voice_len * len(s) / total
        lines.append(f"{i}\n{stamp(t)} --> {stamp(t + d)}\n{s}\n")
        t += d
    path.write_text("\n".join(lines))

for sc in scenes:
    i = sc["id"]
    clip = work / f"clips/{i}.webm"
    start = max(0.0, offsets.get(i, 0) - 0.2)
    picture = probe(clip) - start
    dur = max(picture, lengths[i] + 1.0)
    srt = parts / f"{i}.srt"
    captions(sc["text"], lengths[i], srt)
    style = "FontName=Noto Sans,FontSize=17,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=34,Alignment=2"
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-ss", f"{start:.2f}", "-i", str(clip), "-i", str(work / f"audio/{i}.wav"),
        "-filter_complex", f"[0:v]fps=30,scale=1280:720,tpad=stop_mode=clone:stop_duration=3,trim=duration={dur:.2f},setpts=PTS-STARTPTS,subtitles={srt}:force_style='{style}'[v];[1:a]aresample=44100,apad=whole_dur={dur:.2f}[a]",
        "-map", "[v]", "-map", "[a]", "-t", f"{dur:.2f}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", str(parts / f"{i}.mp4"),
    ], check=True)
    print(i, f"{dur:.1f}s")

(parts / "list.txt").write_text("".join(f"file '{parts / (s['id'] + '.mp4')}'\n" for s in scenes))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(parts / "list.txt"), "-c", "copy", str(out)], check=True)
print("done", out, f"{probe(out):.1f}s")
