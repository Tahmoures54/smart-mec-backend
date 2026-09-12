#!/usr/bin/env python3
"""Assemble 24fps cinematic film from stills, overlays, score, and narration."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import (  # noqa: E402
    AUDIO,
    FPS,
    HEIGHT,
    HEIGHT_4K,
    OUTPUT,
    OVERLAYS,
    SCENES,
    STILLS,
    TOTAL_DURATION,
    WIDTH,
    WIDTH_4K,
)

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


def run(cmd: list[str], **kw) -> None:
    print("+", " ".join(str(c) for c in cmd[:12]), "..." if len(cmd) > 12 else "")
    subprocess.run(cmd, check=True, **kw)


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            FFPROBE,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ]
    )
    return float(json.loads(out)["format"]["duration"])


def motion_crop(motion: str, duration: float) -> str:
    """Ken-Burns crop from an oversized canvas. Expressions use t in seconds."""
    sw, sh = int(WIDTH * 1.22), int(HEIGHT * 1.22)
    d = max(duration, 0.001)
    if motion == "in":
        x, y = "(iw-ow)/2", f"(ih-oh)/2-(ih-oh)/5*t/{d:.3f}"
    elif motion == "out":
        x, y = "(iw-ow)/2", f"(ih-oh)*0.2+(ih-oh)*0.4*t/{d:.3f}"
    elif motion == "left":
        x, y = f"(iw-ow)*(1-t/{d:.3f})", "(ih-oh)/2"
    elif motion == "right":
        x, y = f"(iw-ow)*t/{d:.3f}", "(ih-oh)/2"
    else:
        x, y = "(iw-ow)/2", "(ih-oh)/2"
    return f"scale={sw}:{sh}:flags=lanczos,crop={WIDTH}:{HEIGHT}:{x}:{y}"


def grade_filter(scene: dict) -> str:
    g = scene["grade"]
    return (
        f"eq=contrast={g['contrast']}:brightness={g['brightness']}:"
        f"saturation={g['saturation']}:gamma={g['gamma']}"
    )


def render_shot(shot: dict, scene: dict, out: Path, overlay: Path, extra_overlay: Path | None = None) -> None:
    duration = shot["duration"]
    src = STILLS / shot["file"]
    if not src.exists():
        raise FileNotFoundError(src)

    vf_parts = [
        motion_crop(shot["motion"], duration),
        "setsar=1",
        grade_filter(scene),
        "unsharp=5:5:0.35:5:5:0.0",
        "vignette=PI/8",
        "format=rgba",
    ]
    vf = ",".join(vf_parts)

    # Overlay lower-third; scene 1 also gets center logo; scene 8 last shot gets end card.
    filter_complex = f"[0:v]{vf}[base];[base][1:v]overlay=0:0:format=auto[v1]"
    inputs = [
        FFMPEG, "-y",
        "-loop", "1", "-framerate", str(FPS), "-t", f"{duration:.3f}", "-i", str(src),
        "-i", str(overlay),
    ]
    last = "v1"
    idx = 2
    if extra_overlay is not None:
        filter_complex += f";[{last}][{idx}:v]overlay=0:0:format=auto[v2]"
        inputs += ["-i", str(extra_overlay)]
        last = "v2"
        idx += 1

    inputs += [
        "-filter_complex", filter_complex,
        "-map", f"[{last}]",
        "-t", f"{duration:.3f}",
        "-r", str(FPS),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out),
    ]
    run(inputs)


def concat_clips(clips: list[Path], out: Path) -> None:
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips), encoding="utf-8")
    run(
        [
            FFMPEG, "-y",
            "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c", "copy",
            str(out),
        ]
    )


def fade_master(src: Path, out: Path, duration: float) -> None:
    run(
        [
            FFMPEG, "-y", "-i", str(src),
            "-vf", f"fade=t=in:st=0:d=1.2,fade=t=out:st={duration-2.2:.2f}:d=2.2,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
            "-r", str(FPS), "-an",
            str(out),
        ]
    )


def mix_audio(video: Path, out: Path) -> None:
    score = AUDIO / "score_industrial_epic.wav"
    narr_files = [AUDIO / f"narration_{s['id']:02d}.mp3" for s in SCENES]
    for p in [score, *narr_files]:
        if not p.exists():
            raise FileNotFoundError(p)

    # Fit each narration into 88% of its scene (leave head/tail breathing room).
    narr_filters = []
    labels = []
    inputs = [FFMPEG, "-y", "-i", str(video), "-i", str(score)]
    for i, scene in enumerate(SCENES):
        path = narr_files[i]
        inputs += ["-i", str(path)]
        dur = probe_duration(path)
        budget = max(scene["duration"] - 1.6, 4.0)
        chain = f"[{i+2}:a]aformat=sample_rates=48000:channel_layouts=stereo"
        if dur > budget:
            chain += f",atempo={min(dur / budget, 1.18):.4f}"
        delay_ms = int((scene["start"] + 0.7) * 1000)
        chain += (
            f",adelay={delay_ms}|{delay_ms},apad=whole_dur={TOTAL_DURATION},"
            f"atrim=0:{TOTAL_DURATION},volume=1.25[n{i}]"
        )
        narr_filters.append(chain)
        labels.append(f"[n{i}]")

    nmix = "".join(labels) + f"amix=inputs={len(labels)}:duration=first:dropout_transition=0[narr]"
    # Duck score when narrator speaks, then blend. asplit because a pad can be used once.
    fc = (
        ";".join(narr_filters)
        + ";"
        + nmix
        + ";"
        + "[narr]asplit=2[narr_sc][narr_mix]"
        + ";"
        + "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.42[score]"
        + ";"
        + "[score][narr_sc]sidechaincompress=threshold=0.05:ratio=6:attack=40:release=500:makeup=3[ducked]"
        + ";"
        + "[ducked][narr_mix]amix=inputs=2:duration=first:weights=1 1.2,alimiter=limit=0.94[a]"
    )
    run(
        inputs
        + [
            "-filter_complex", fc,
            "-map", "0:v",
            "-map", "[a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            str(out),
        ]
    )


def export_scene_clips(master: Path) -> None:
    for scene in SCENES:
        out = OUTPUT / f"scene_{scene['id']:02d}_{scene['slug']}.mp4"
        run(
            [
                FFMPEG, "-y",
                "-ss", f"{scene['start']:.3f}",
                "-i", str(master),
                "-t", f"{scene['duration']:.3f}",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart",
                str(out),
            ]
        )


def upscale_4k(src: Path, out: Path) -> None:
    run(
        [
            FFMPEG, "-y", "-i", str(src),
            "-vf", f"scale={WIDTH_4K}:{HEIGHT_4K}:flags=lanczos,unsharp=5:5:0.25,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "copy",
            "-r", str(FPS),
            "-movflags", "+faststart",
            str(out),
        ]
    )


def main() -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    OUTPUT.mkdir(parents=True, exist_ok=True)
    shots_dir = OUTPUT / "shots"
    shots_dir.mkdir(exist_ok=True)

    jobs = []
    shot_i = 0
    for scene in SCENES:
        overlay = OVERLAYS / f"scene_{scene['id']:02d}.png"
        for sidx, shot in enumerate(scene["shots"]):
            extra = None
            if scene["id"] == 1 and sidx == 0:
                extra = OVERLAYS / "logo_center.png"
            if scene["id"] == 8 and sidx == 2:
                extra = OVERLAYS / "end_card.png"
            out = shots_dir / f"{shot_i:02d}_s{scene['id']:02d}.mp4"
            jobs.append((shot_i, shot, scene, out, overlay, extra))
            shot_i += 1

    all_clips: list[Path] = [Path()] * len(jobs)
    pending = [j for j in jobs if not j[3].exists()]
    for idx, shot, scene, out, overlay, extra in jobs:
        if out.exists():
            all_clips[idx] = out
    if pending:
        with ThreadPoolExecutor(max_workers=2) as pool:
            futs = {
                pool.submit(render_shot, shot, scene, out, overlay, extra): (idx, out)
                for idx, shot, scene, out, overlay, extra in pending
            }
            for fut in as_completed(futs):
                idx, out = futs[fut]
                fut.result()
                all_clips[idx] = out
                print("shot ready", out.name)
    else:
        print("reusing existing shots")

    silent = OUTPUT / "picture_silent.mp4"
    if not silent.exists():
        concat_clips(all_clips, silent)
    faded = OUTPUT / "picture_faded.mp4"
    if not faded.exists():
        fade_master(silent, faded, TOTAL_DURATION)

    hd = OUTPUT / "FARASAKOU_live_hot_tap_1080p_24fps.mp4"
    mix_audio(faded, hd)
    export_scene_clips(hd)

    uhd = OUTPUT / "FARASAKOU_live_hot_tap_4K_24fps.mp4"
    print("upscaling master to 4K UHD...")
    upscale_4k(hd, uhd)
    print("done", hd, uhd)


if __name__ == "__main__":
    main()
