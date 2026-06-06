from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path("public/game/sprites")
GREEN = "#062817"
CREAM = "#fff4c9"
GOLD = "#e1a21a"
RED = "#d21f13"
INK = "#020617"
BLUE = "#9fd6ff"
BROWN = "#8b4a16"


def rect(draw, xy, fill, outline=INK, width=4):
    draw.rectangle(xy, fill=fill, outline=outline, width=width)


def make_skater(direction="right"):
    img = Image.new("RGBA", (160, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    rect(d, (61, 9, 93, 33), GREEN)
    d.rectangle((67, 13, 87, 18), fill=GOLD)
    rect(d, (64, 31, 101, 41), CREAM, width=3)
    d.rectangle((78, 40, 87, 52), fill=GOLD)

    rect(d, (53, 45, 111, 92), GREEN, width=5)
    d.rectangle((53, 64, 111, 73), fill=CREAM)
    d.rectangle((53, 74, 111, 80), fill=RED)

    rect(d, (41, 51, 63, 92), GREEN)
    d.rectangle((42, 66, 64, 73), fill=CREAM)
    rect(d, (100, 55, 122, 96), GREEN)
    d.rectangle((101, 70, 123, 77), fill=CREAM)

    rect(d, (52, 88, 73, 123), GREEN)
    d.rectangle((53, 103, 74, 110), fill=CREAM)
    rect(d, (85, 86, 106, 125), GREEN)
    d.rectangle((86, 101, 107, 108), fill=CREAM)

    d.rectangle((32, 118, 80, 128), fill=INK)
    d.rectangle((80, 121, 132, 131), fill=INK)

    d.line((107, 88, 145, 130), fill=BROWN, width=8)
    d.line((135, 119, 158, 119), fill=CREAM, width=8)
    d.ellipse((126, 110, 139, 123), fill=INK)

    if direction == "left":
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    img.save(OUT / f"skater-{direction}.png")


def make_goalie():
    img = Image.new("RGBA", (190, 145), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rect(d, (77, 8, 115, 40), GREEN, width=5)
    d.rectangle((83, 15, 109, 21), fill=CREAM)
    rect(d, (68, 39, 126, 94), GREEN, width=5)
    d.rectangle((69, 61, 126, 72), fill=CREAM)
    d.rectangle((69, 73, 126, 79), fill=RED)
    rect(d, (22, 52, 66, 118), CREAM, width=5)
    rect(d, (126, 52, 170, 118), CREAM, width=5)
    rect(d, (49, 94, 78, 136), GREEN)
    rect(d, (112, 94, 142, 136), GREEN)
    d.rectangle((29, 130, 85, 140), fill=INK)
    d.rectangle((105, 130, 162, 140), fill=INK)
    d.line((38, 78, 38, 144), fill=BROWN, width=8)
    img.save(OUT / "goalie.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make_skater("right")
    make_skater("left")
    make_goalie()
