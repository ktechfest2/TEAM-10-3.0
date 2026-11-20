"""Puts the recorded screen clips, the voiceover and a few sound effects together into one captioned mp4.
Usage: python assemble.py <work dir with <audio>/ and clips/> <output.mp4> [audio dir name, default audio]"""
import json, re, subprocess, sys
from pathlib import Path

work, out = Path(sys.argv[1]), Path(sys.argv[2])
audio_dir = sys.argv[3] if len(sys.argv) > 3 else "audio"
scenes = json.loads((Path(__file__).parent / "script.json").read_text())
lengths = json.loads((work / audio_dir / "lengths.json").read_text())
offsets = json.loads((work / "clips/offsets.json").read_text())
cuts_file = work / "clips/cuts.json"
cuts = json.loads(cuts_file.read_text()) if cuts_file.exists() else {}
parts = work / "parts"
parts.mkdir(exist_ok=True)
sfx_dir = work / "sfx"
sfx_dir.mkdir(exist_ok=True)

# Sound effects are synthesised here, so there is nothing to download or license.
SFX = {
    "tick": "aevalsrc=0.5*sin(2*PI*1046*t)*exp(-30*t):d=0.18:s=44100",
    "chime": "aevalsrc=0.45*(sin(2*PI*1318*t)+0.6*sin(2*PI*1760*t)+0.3*sin(2*PI*2637*t))*exp(-4.5*t):d=1.2:s=44100",
    "alarm": "aevalsrc=0.4*sin(2*PI*(620+260*floor(mod(t*5\\,2)))*t)*exp(-1.6*t):d=1.0:s=44100",
}
for name, expr in SFX.items():
    if not (sfx_dir / f"{name}.wav").exists():
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", expr, str(sfx_dir / f"{name}.wav")], check=True)


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(r.stdout.strip())


def stamp(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
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


STYLE = "FontName=Noto Sans,FontSize=17,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=34,Alignment=2"

for sc in scenes:
    i = sc["id"]
    clip = work / f"clips/{i}.webm"
    start = max(0.0, offsets.get(i, 0) - 0.2)
    picture = probe(clip) - start
    srt = parts / f"{i}.srt"
    captions(sc["text"], lengths[i], srt)

    video = "[0:v]fps=30,scale=1280:720"
    if i in cuts:
        # The rumour answer takes a while to arrive: that wait is shown sped up, so the scene stays tight.
        ws = cuts[i]["offsetFromMark"] + cuts[i]["from"] + 0.2
        we = cuts[i]["offsetFromMark"] + cuts[i]["to"] + 0.2
        video += (
            f",split=3[va][vb][vc];[va]trim=0:{ws:.2f},setpts=PTS-STARTPTS[a1];"
            f"[vb]trim={ws:.2f}:{we:.2f},setpts=(PTS-STARTPTS)/8[b1];"
            f"[vc]trim=start={we:.2f},setpts=PTS-STARTPTS[c1];[a1][b1][c1]concat=n=3:v=1:a=0"
        )
        picture = ws + (we - ws) / 8 + (picture - we)
    dur = max(picture, lengths[i] + 1.0)
    video += f",tpad=stop_mode=clone:stop_duration=3,trim=duration={dur:.2f},setpts=PTS-STARTPTS,subtitles={srt}:force_style='{STYLE}'[v]"

    inputs = ["-ss", f"{start:.2f}", "-i", str(clip), "-i", str(work / audio_dir / f"{i}.wav")]
    effects = sc.get("sfx", [])
    for fx in effects:
        inputs += ["-i", str(sfx_dir / f"{fx['kind']}.wav")]
    if effects:
        delayed = ";".join(f"[{n + 2}:a]aresample=44100,adelay={int(fx['t'] * 1000)}|{int(fx['t'] * 1000)},volume=0.35[x{n}]" for n, fx in enumerate(effects))
        mix = "[voice]" + "".join(f"[x{n}]" for n in range(len(effects))) + f"amix=inputs={len(effects) + 1}:duration=first:normalize=0[a]"
        audio = f"[1:a]aresample=44100,apad=whole_dur={dur:.2f}[voice];{delayed};{mix}"
    else:
        audio = f"[1:a]aresample=44100,apad=whole_dur={dur:.2f}[a]"

    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", f"{video};{audio}", "-map", "[v]", "-map", "[a]", "-t", f"{dur:.2f}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", str(parts / f"{i}.mp4")],
        check=True,
    )
    print(i, f"{dur:.1f}s")

(parts / "list.txt").write_text("".join(f"file '{parts / (s['id'] + '.mp4')}'\n" for s in scenes))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(parts / "list.txt"), "-c", "copy", str(out)], check=True)
print("done", out, f"{probe(out):.1f}s")
