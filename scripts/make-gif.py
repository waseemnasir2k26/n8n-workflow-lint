"""Dev-only: renders docs/scorecard-before-after.gif from the REAL CLI output in examples/sample-output-*.txt.
Needs Pillow. Run: python scripts/make-gif.py
"""
from PIL import Image, ImageDraw, ImageFont
import re

W, H = 1040, 640
BG, FG, DIM = (16, 20, 31), (230, 234, 242), (140, 150, 170)
COL = {"CRITICAL": (255, 107, 107), "HIGH": (255, 140, 105), "MEDIUM": (255, 200, 87), "LOW": (110, 180, 255), "INFO": (150, 160, 180)}
FONT = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 15)
BOLD = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 15)
BIG = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 34)


def short(path, keep_fix=False):
    out = []
    for line in open(path, encoding="utf-8").read().splitlines():
        if line.strip().startswith("fix:") or line.strip().startswith("est. LLM"):
            continue
        out.append(line[:118])
    return out


def frame(cmd, lines, shown, score=None, label=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 34], fill=(28, 34, 52))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([14 + i * 22, 11, 26 + i * 22, 23], fill=c)
    d.text((100, 9), "n8n-workflow-lint", font=FONT, fill=DIM)
    y = 48
    d.text((16, y), "$ " + cmd, font=BOLD, fill=(120, 220, 160))
    y += 26
    for line in lines[:shown]:
        color = FG
        m = re.match(r"\s+\[(\w+)\]", line)
        if m:
            color = COL.get(m.group(1), FG)
        d.text((16, y), line, font=FONT, fill=color)
        y += 19
    if score is not None:
        d.rounded_rectangle([W - 330, H - 100, W - 20, H - 20], radius=14, fill=(28, 34, 52))
        d.text((W - 312, H - 92), label, font=FONT, fill=DIM)
        d.text((W - 312, H - 70), f"{score}/100", font=BIG, fill=(255, 107, 107) if score < 60 else (110, 230, 150))
    return im


frames, durations = [], []
before = short("examples/sample-output-before.txt")
after = short("examples/sample-output-after.txt")
cmd1 = "npx n8n-workflow-lint examples/risky-workflow.json"
cmd2 = "npx n8n-workflow-lint examples/fixed-workflow.json"

for n in range(0, len(before) + 1, 3):
    frames.append(frame(cmd1, before, n)); durations.append(120)
frames.append(frame(cmd1, before, len(before), 0, "BEFORE: risky workflow")); durations.append(2600)
for n in range(0, len(after) + 1, 2):
    frames.append(frame(cmd2, after, n)); durations.append(200)
frames.append(frame(cmd2, after, len(after), 100, "AFTER: hardened workflow")); durations.append(3200)

frames[0].save("docs/scorecard-before-after.gif", save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
print("gif frames:", len(frames))
