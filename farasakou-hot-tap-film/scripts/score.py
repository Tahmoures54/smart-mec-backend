#!/usr/bin/env python3
"""Original epic-industrial score + environmental beds (no copyrighted music)."""

from __future__ import annotations

import math
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import AUDIO, SAMPLE_RATE, TOTAL_DURATION  # noqa: E402

RNG = np.random.default_rng(36)


def midi(n: float) -> float:
    return 440.0 * (2.0 ** ((n - 69.0) / 12.0))


def env_adsr(n: int, sr: int, a=0.02, d=0.1, s=0.7, r=0.3) -> np.ndarray:
    att = int(a * sr)
    dec = int(d * sr)
    rel = int(r * sr)
    sus = max(n - att - dec - rel, 0)
    e = np.concatenate(
        [
            np.linspace(0, 1, att, endpoint=False) if att else np.zeros(0),
            np.linspace(1, s, dec, endpoint=False) if dec else np.zeros(0),
            np.full(sus, s),
            np.linspace(s, 0, rel) if rel else np.zeros(0),
        ]
    )
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n].astype(np.float64)


def sine(freq, n, sr, phase=0.0):
    t = np.arange(n) / sr
    return np.sin(2 * math.pi * freq * t + phase)


def saw_like(freq, n, sr, harmonics=8):
    t = np.arange(n) / sr
    sig = np.zeros(n, dtype=np.float64)
    for k in range(1, harmonics + 1):
        sig += (1.0 / k) * np.sin(2 * math.pi * freq * k * t)
    return sig * 0.55


def lowpass(x: np.ndarray, cutoff: float, sr: int) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / sr)
    cutoff = max(float(cutoff), 10.0)
    h = 1.0 / (1.0 + 1j * (freqs / cutoff))
    y = np.fft.irfft(spec * h, n=len(x))
    return y.real


def highpass(x: np.ndarray, cutoff: float, sr: int) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / sr)
    cutoff = max(float(cutoff), 10.0)
    h = (1j * (freqs / cutoff)) / (1.0 + 1j * (freqs / cutoff))
    y = np.fft.irfft(spec * h, n=len(x))
    return y.real


def brown_noise(n: int) -> np.ndarray:
    w = RNG.standard_normal(n)
    y = np.cumsum(w)
    y = y - np.mean(y)
    peak = np.max(np.abs(y)) or 1.0
    return y / peak


def place(dest: np.ndarray, src: np.ndarray, at: int) -> None:
    if at >= len(dest):
        return
    end = min(len(dest), at + len(src))
    dest[at:end] += src[: end - at]


def stereo(mono: np.ndarray, width: float = 0.15) -> np.ndarray:
    n = len(mono)
    delay = int(0.012 * SAMPLE_RATE)
    right = np.pad(mono, (delay, 0))[:n]
    left = mono * (1.0 - width) + np.roll(mono, -3) * width
    return np.stack([left, right * (1.0 + width * 0.3)], axis=1)


def pad_chord(freqs, n, sr, brightness=0.4):
    sig = np.zeros(n)
    for i, f in enumerate(freqs):
        det = 1.0 + (i - 1) * 0.003
        sig += sine(f * det, n, sr, phase=i) * 0.45
        sig += sine(f * 2 * det, n, sr) * 0.12 * brightness
        sig += sine(f * 0.5, n, sr) * 0.2
    sig *= env_adsr(n, sr, a=1.8, d=1.0, s=0.85, r=2.5)
    return sig


def metallic_hit(sr, dur=1.4):
    n = int(dur * sr)
    freqs = [midi(62), midi(69), midi(74), midi(81), 180, 340, 890]
    sig = np.zeros(n)
    noise = highpass(RNG.standard_normal(n) * 0.4, 800, sr)
    sig += noise * np.exp(-np.linspace(0, 18, n))
    for f in freqs:
        sig += sine(f, n, sr, phase=f) * np.exp(-np.linspace(0, 6 + f / 200, n)) * 0.25
    return np.tanh(sig * 1.4)


def boom(sr, dur=0.9):
    n = int(dur * sr)
    t = np.arange(n) / sr
    body = np.sin(2 * math.pi * (90 * np.exp(-t * 8) + 38) * t)
    body *= np.exp(-t * 4.5)
    click = highpass(RNG.standard_normal(n), 2000, sr) * np.exp(-t * 70) * 0.3
    return np.tanh(body * 1.6 + click)


def fluid_whoosh(n, sr):
    x = lowpass(brown_noise(n), 280, sr)
    t = np.arange(n) / sr
    mod = 0.55 + 0.45 * np.sin(2 * math.pi * 0.11 * t)
    return x * mod


def wind_bed(n, sr):
    x = lowpass(brown_noise(n), 400, sr)
    y = highpass(lowpass(RNG.standard_normal(n), 1800, sr), 200, sr) * 0.25
    t = np.arange(n) / sr
    gust = 0.6 + 0.4 * np.sin(2 * math.pi * 0.07 * t + 0.4)
    return (x * 0.7 + y) * gust


def waves_bed(n, sr):
    x = lowpass(brown_noise(n), 220, sr)
    t = np.arange(n) / sr
    swell = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * math.pi * 0.08 * t)) ** 2
    return x * swell


def weld_crackle(n, sr):
    x = highpass(RNG.standard_normal(n), 1500, sr)
    t = np.arange(n) / sr
    gate = (RNG.random(n) > 0.82).astype(np.float64)
    # smooth gate
    gate = lowpass(gate, 40, sr)
    return x * gate * (0.4 + 0.2 * np.sin(2 * math.pi * 6 * t))


def hydraulic(n, sr):
    t = np.arange(n) / sr
    pump = np.sin(2 * math.pi * 28 * t) * 0.35
    pump += np.sin(2 * math.pi * 56 * t) * 0.12
    hiss = lowpass(RNG.standard_normal(n), 900, sr) * 0.12
    pulse = 0.7 + 0.3 * np.sin(2 * math.pi * 1.6 * t)
    return (pump + hiss) * pulse


def control_beeps(n, sr):
    out = np.zeros(n)
    interval = int(2.4 * sr)
    beep_n = int(0.07 * sr)
    t = 0
    freq = 880
    while t + beep_n < n:
        tone = sine(freq, beep_n, sr) * env_adsr(beep_n, sr, 0.005, 0.01, 0.4, 0.04) * 0.09
        place(out, tone, t)
        t += interval
        freq = 880 if freq > 700 else 990
    return out


def riser(n, sr):
    t = np.arange(n) / sr
    f = 40 + 420 * (t / t[-1]) ** 1.4
    phase = 2 * math.pi * np.cumsum(f) / sr
    tone = np.sin(phase) * 0.25
    noise = highpass(RNG.standard_normal(n), 400, sr) * (t / t[-1]) ** 2 * 0.35
    return (tone + noise) * (t / t[-1])


def write_wav(path: Path, stereo_audio: np.ndarray, sr: int = SAMPLE_RATE) -> None:
    peak = np.max(np.abs(stereo_audio)) or 1.0
    audio = np.clip(stereo_audio / peak * 0.92, -1, 1)
    pcm = (audio * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def build_score() -> np.ndarray:
    sr = SAMPLE_RATE
    n = int(TOTAL_DURATION * sr)
    music = np.zeros(n)
    sfx = np.zeros(n)

    # --- harmonic plan in D minor / F ---
    # 0-35 ambient Dm
    # 35-80 building
    # 80-110 industrial groove
    # 110-140 climax
    # 140-180 resolution to F / D
    sections = [
        (0.0, 35.0, [midi(38), midi(45), midi(50), midi(57)], 0.22, 0.25),  # D A D A
        (35.0, 55.0, [midi(38), midi(41), midi(45), midi(48)], 0.28, 0.35),  # tension
        (55.0, 80.0, [midi(36), midi(43), midi(48), midi(55)], 0.32, 0.4),
        (80.0, 110.0, [midi(38), midi(45), midi(50), midi(53)], 0.4, 0.55),
        (110.0, 140.0, [midi(38), midi(45), midi(50), midi(57), midi(62)], 0.55, 0.85),
        (140.0, 165.0, [midi(41), midi(48), midi(53), midi(57)], 0.38, 0.5),  # F
        (165.0, 180.0, [midi(38), midi(45), midi(50), midi(57), midi(62)], 0.3, 0.4),
    ]
    for t0, t1, freqs, amp, bright in sections:
        length = t1 - t0
        # overlapping pad grains
        grain = 8.0
        t = t0
        while t < t1 - 0.5:
            gn = int(min(grain, t1 - t) * sr)
            g = pad_chord(freqs, gn, sr, brightness=bright) * amp
            place(music, g, int(t * sr))
            t += 5.5

    # slow melody (D F G A C) appearing after :35
    melody = [
        (36.0, 50, 3.5, 0.09),
        (42.0, 53, 2.8, 0.08),
        (48.0, 57, 4.0, 0.1),
        (58.0, 50, 3.0, 0.09),
        (66.0, 48, 2.5, 0.08),
        (72.0, 53, 4.2, 0.11),
        (82.0, 57, 3.0, 0.12),
        (88.0, 62, 3.5, 0.13),
        (96.0, 60, 2.4, 0.1),
        (102.0, 57, 3.2, 0.12),
        (112.0, 62, 2.0, 0.16),
        (115.0, 65, 2.2, 0.16),
        (118.5, 69, 3.0, 0.18),
        (124.0, 65, 2.5, 0.14),
        (129.0, 62, 3.5, 0.13),
        (142.0, 60, 3.0, 0.11),
        (148.0, 57, 3.5, 0.1),
        (156.0, 53, 3.0, 0.09),
        (166.0, 57, 4.0, 0.12),
        (171.0, 62, 5.0, 0.13),
        (176.0, 74, 3.5, 0.08),
    ]
    for t0, note, dur, amp in melody:
        nn = int(dur * sr)
        tone = saw_like(midi(note), nn, sr, harmonics=6)
        tone = lowpass(tone, 1400 + amp * 2000, sr)
        tone *= env_adsr(nn, sr, 0.25, 0.3, 0.7, 0.8) * amp
        place(music, tone, int(t0 * sr))

    # percussion: 72bpm then 96bpm at climax
    def hits(t0, t1, bpm, boom_every, clang_every):
        step = 60.0 / bpm
        t = t0
        i = 0
        while t < t1:
            if i % boom_every == 0:
                place(music, boom(sr) * (0.18 if t < 110 else 0.32), int(t * sr))
            if i % clang_every == 0 and t >= 55:
                place(music, metallic_hit(sr) * (0.12 if t < 110 else 0.22), int(t * sr + 0.02 * sr))
            t += step
            i += 1

    hits(8.0, 80.0, 72, 8, 16)
    hits(80.0, 110.0, 80, 4, 8)
    hits(110.0, 140.0, 96, 2, 4)
    hits(140.0, 175.0, 72, 8, 16)

    # climax riser into the cut
    place(music, riser(int(18 * sr), sr) * 0.55, int(96 * sr))

    # extra low drone throughout
    drone_n = n
    drone = sine(midi(26), drone_n, sr) * 0.12 + sine(midi(38), drone_n, sr) * 0.06
    # swell
    t = np.arange(n) / sr
    swell = 0.35 + 0.65 * np.clip((t - 20) / 90, 0, 1)
    swell *= np.clip((180 - t) / 12, 0, 1)
    music += drone * swell

    # --- SFX beds ---
    sfx += wind_bed(n, sr) * 0.22
    # waves stronger at open/close
    waves = waves_bed(n, sr)
    wave_env = np.clip(1.0 - (t - 0) / 40, 0, 1) * 0.28 + np.clip((t - 155) / 20, 0, 1) * 0.3
    sfx += waves * wave_env

    fluid = fluid_whoosh(n, sr)
    fluid_env = np.zeros(n)
    for a, b, amp in [(35, 55, 0.22), (110, 140, 0.18), (140, 165, 0.2)]:
        fluid_env += np.clip((t - a) / 2, 0, 1) * np.clip((b - t) / 2, 0, 1) * amp
    sfx += fluid * fluid_env

    hyd = hydraulic(n, sr)
    hyd_env = np.clip((t - 80) / 5, 0, 1) * np.clip((140 - t) / 4, 0, 1) * 0.28
    hyd_env += np.clip((t - 110) / 2, 0, 1) * np.clip((140 - t) / 2, 0, 1) * 0.25
    sfx += hyd * hyd_env

    weld = weld_crackle(n, sr)
    weld_env = np.clip((t - 80) / 1, 0, 1) * np.clip((96 - t) / 2, 0, 1) * 0.16
    sfx += weld * weld_env

    beeps = control_beeps(n, sr)
    beep_env = np.clip((t - 148) / 2, 0, 1) * np.clip((165 - t) / 2, 0, 1)
    sfx += beeps * beep_env

    # mix and gentle limiter
    mix = music * 0.85 + sfx * 0.9
    mix = np.tanh(mix * 1.15)
    # fade
    fade_in = np.clip(t / 2.5, 0, 1)
    fade_out = np.clip((TOTAL_DURATION - t) / 3.0, 0, 1)
    mix *= fade_in * fade_out
    return stereo(mix, width=0.18)


def main() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    print("synthesizing 180s industrial score...")
    audio = build_score()
    path = AUDIO / "score_industrial_epic.wav"
    write_wav(path, audio)
    print("wrote", path, "seconds=", len(audio) / SAMPLE_RATE)


if __name__ == "__main__":
    main()
