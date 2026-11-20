# Demo video pipeline

Builds a captioned demo video from `script.json` (the spoken lines) and the live app.

1. Voiceover: `python tts.py <piper voice .onnx> <work>/audio` (Piper, offline; voice `en_US-ryan-high`).
2. Screens: run the app, then `node record.mjs <base url> <work>/audio <work>/clips` (Playwright driving Chrome; Playwright is installed in the work dir, not the app).
3. Assemble: `python assemble.py <work> out/tally-demo.mp4` (ffmpeg).

Change a line in `script.json` and run the three steps again to rebuild.
The two-phone signing scene is an animation from `/sketch`; replace `s2` with real phone footage if you have it.
