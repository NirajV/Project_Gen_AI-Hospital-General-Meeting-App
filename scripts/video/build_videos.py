"""
BioMedMeet video build pipeline.

Steps (per video):
  1. For each segment, generate MP3 narration via OpenAI TTS (emergentintegrations).
  2. For each segment, render the slide HTML to a 1920x1080 PNG via Playwright.
  3. For each segment, use ffmpeg to build a per-segment MP4 from PNG + MP3.
  4. Concatenate all segment MP4s into the final video.
  5. Save final MP4 to /app/frontend/public/marketing/<id>.mp4

Run:
    cd /app && python3 -m scripts.video.build_videos
"""
import asyncio
import os
import shlex
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load EMERGENT_LLM_KEY from backend/.env
load_dotenv("/app/backend/.env")

from emergentintegrations.llm.openai import OpenAITextToSpeech  # noqa: E402
from playwright.async_api import async_playwright  # noqa: E402

from scripts.video.scripts_data import VIDEOS, VOICE, MODEL, SPEED  # noqa: E402

ROOT = Path("/app/scripts/video")
STAGE_HTML = ROOT / "stage.html"
AUDIO_DIR = ROOT / "audio"
SLIDE_DIR = ROOT / "slides"
SEG_DIR = ROOT / "segments"
OUT_DIR = Path("/app/frontend/public/marketing")

for d in (AUDIO_DIR, SLIDE_DIR, SEG_DIR, OUT_DIR):
    d.mkdir(parents=True, exist_ok=True)


def run(cmd: str, **kw) -> None:
    """Run a shell command, raise on failure, stream output."""
    print(f"\n$ {cmd}")
    proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr)
        raise SystemExit(f"command failed: {cmd}")


def ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        f"ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 {shlex.quote(str(path))}",
        shell=True,
        text=True,
    ).strip()
    return float(out)


# ------------------------------------------------------------------
# 1) Generate all narration MP3 files
# ------------------------------------------------------------------
async def generate_all_audio() -> None:
    key = os.environ["EMERGENT_LLM_KEY"]
    tts = OpenAITextToSpeech(api_key=key)
    for video in VIDEOS:
        vid_audio_dir = AUDIO_DIR / video["id"]
        vid_audio_dir.mkdir(parents=True, exist_ok=True)
        for i, seg in enumerate(video["segments"]):
            mp3_path = vid_audio_dir / f"{i:02d}.mp3"
            if mp3_path.exists() and mp3_path.stat().st_size > 0:
                print(f"   ↳ audio exists  {mp3_path.relative_to(ROOT)}")
                continue
            print(f"   ↳ TTS → {mp3_path.relative_to(ROOT)}  ({len(seg['narration'])} chars)")
            audio = await tts.generate_speech(
                text=seg["narration"], model=MODEL, voice=VOICE, speed=SPEED
            )
            mp3_path.write_bytes(audio)


# ------------------------------------------------------------------
# 2) Render every slide PNG via Playwright
# ------------------------------------------------------------------
async def render_all_slides() -> None:
    file_url = f"file://{STAGE_HTML}"
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = await ctx.new_page()
        await page.goto(file_url, wait_until="networkidle")
        # Wait for webfonts
        await page.evaluate("document.fonts.ready")
        for video in VIDEOS:
            vid_slide_dir = SLIDE_DIR / video["id"]
            vid_slide_dir.mkdir(parents=True, exist_ok=True)
            for i, seg in enumerate(video["segments"]):
                png_path = vid_slide_dir / f"{i:02d}.png"
                if png_path.exists() and png_path.stat().st_size > 0:
                    print(f"   ↳ slide exists  {png_path.relative_to(ROOT)}")
                    continue
                await page.evaluate(
                    "([s,c]) => window.renderScene(s, c)",
                    [seg["scene_id"], seg["caption"]],
                )
                # Let layout/fonts settle
                await page.wait_for_timeout(120)
                await page.screenshot(path=str(png_path), full_page=False, type="png")
                print(f"   ↳ slide  → {png_path.relative_to(ROOT)}")
        await browser.close()


# ------------------------------------------------------------------
# 3+4) Build per-segment MP4, then concat to final video
# ------------------------------------------------------------------
def build_videos() -> None:
    for video in VIDEOS:
        vid_id = video["id"]
        seg_dir = SEG_DIR / vid_id
        seg_dir.mkdir(parents=True, exist_ok=True)
        seg_files = []
        for i, seg in enumerate(video["segments"]):
            png = SLIDE_DIR / vid_id / f"{i:02d}.png"
            mp3 = AUDIO_DIR / vid_id / f"{i:02d}.mp3"
            out = seg_dir / f"{i:02d}.mp4"
            seg_files.append(out)

            audio_dur = ffprobe_duration(mp3)
            # Hold = max(planned hold, audio duration + 0.6s tail) for breathing room.
            hold = max(seg.get("hold", 4.0), audio_dur + 0.6)
            # Per-segment MP4: still PNG + audio, 30fps, fade-in/out.
            cmd = (
                f"ffmpeg -y -loop 1 -framerate 30 -t {hold:.3f} -i {shlex.quote(str(png))} "
                f"-i {shlex.quote(str(mp3))} "
                f"-vf \"format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st={max(hold-0.35,0):.3f}:d=0.35\" "
                f"-af \"afade=t=in:st=0:d=0.25,afade=t=out:st={max(hold-0.4,0):.3f}:d=0.4,apad\" "
                f"-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "
                f"-c:a aac -b:a 192k -ar 48000 -ac 2 "
                f"-t {hold:.3f} "
                f"-movflags +faststart {shlex.quote(str(out))}"
            )
            run(cmd)

        # Concatenate via the concat demuxer.
        list_path = seg_dir / "concat.txt"
        list_path.write_text("\n".join(f"file '{p}'" for p in seg_files))
        final = OUT_DIR / f"{vid_id}.mp4"
        cmd = (
            f"ffmpeg -y -f concat -safe 0 -i {shlex.quote(str(list_path))} "
            f"-c copy -movflags +faststart {shlex.quote(str(final))}"
        )
        run(cmd)
        dur = ffprobe_duration(final)
        size_mb = final.stat().st_size / (1024 * 1024)
        print(f"\n✅ {vid_id}.mp4  ·  {dur:.1f}s  ·  {size_mb:.2f} MB  →  {final}")


# ------------------------------------------------------------------
async def main():
    print("== Step 1: TTS narration ==")
    await generate_all_audio()
    print("\n== Step 2: Render slide PNGs ==")
    await render_all_slides()
    print("\n== Step 3: Build per-segment MP4 + concat ==")
    build_videos()
    print("\n🎬  ALL VIDEOS BUILT — see /app/frontend/public/marketing/")


if __name__ == "__main__":
    asyncio.run(main())
