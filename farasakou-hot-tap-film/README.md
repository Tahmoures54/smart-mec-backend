# اتصال زنده در ساحل خلیج فارس
## FARASAKOU / فراسکو عسلویه — industrial documentary

فیلم مستند صنعتی ۳ دقیقه‌ای درباره هات‌تپ خط ۳۶ اینچ سراسری کندنسات در عسلویه.

Production method: photoreal cinematic stills (16:9) assembled with Ken Burns camera moves, original industrial score, Persian neural narration, and bilingual lower-thirds. Native real-time 3D CGI for a continuous 180-second 4K shot is not available in this environment; this pipeline is the broadcast-style substitute used in industrial documentaries.

### Specs
- Duration: 03:00
- Picture: 16:9, 24 fps
- Masters: 1080p and 4K UHD (3840×2160)
- Audio: original epic-industrial score + site beds (wind, gulf, hydraulic, fluid, control room)
- Narration: Persian (`fa-IR-FaridNeural`)
- Safety: no fire, no explosion, no leak, no shutdown, full HSE PPE

### Rebuild
```bash
cd farasakou-hot-tap-film
pip install -r requirements.txt
bash scripts/build.sh
```

Outputs land in `output/`:
- `FARASAKOU_live_hot_tap_1080p_24fps.mp4`
- `FARASAKOU_live_hot_tap_4K_24fps.mp4`
- `scene_01_*.mp4` … `scene_08_*.mp4`

Open `index.html` for the storyboard player.
