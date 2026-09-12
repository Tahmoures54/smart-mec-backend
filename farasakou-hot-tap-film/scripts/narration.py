#!/usr/bin/env python3
"""Persian documentary narration via Microsoft Edge neural TTS."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import AUDIO, NARRATOR_PITCH, NARRATOR_RATE, NARRATOR_VOICE, SCENES  # noqa: E402


async def synth_one(text: str, path: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(
        text,
        NARRATOR_VOICE,
        rate=NARRATOR_RATE,
        pitch=NARRATOR_PITCH,
    )
    await communicate.save(str(path))


async def main_async() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    tasks = []
    for scene in SCENES:
        path = AUDIO / f"narration_{scene['id']:02d}.mp3"
        print(f"scene {scene['id']}: {text_preview(scene['narration'])}")
        tasks.append(synth_one(scene["narration"], path))
    await asyncio.gather(*tasks)
    print("narration files ready")


def text_preview(text: str) -> str:
    return text[:48] + "…"


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
