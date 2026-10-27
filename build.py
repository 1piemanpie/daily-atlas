"""Builds index.html for the website from src/daily-atlas.html (the same page published as the Claude artifact).

The artifact source is a page fragment (title, fonts and styles first, then the markup and script);
this wraps it in a full document with the head pieces moved into <head>.
"""
import re

src = open("src/daily-atlas.html", encoding="utf-8").read()
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]
head = re.sub(r'<meta name="claude:[^>]*>\n?', "", head)
favicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8C%8D%3C/text%3E%3C/svg%3E"
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="A few minutes a day: one new place, a pin-the-city warm-up and quick trivia that brings back what you missed.">
<meta property="og:title" content="Daily Atlas">
<meta property="og:description" content="One new place a day. Pin the cities, answer the trivia, remember more.">
<link rel="icon" href="{favicon}">
{head}
</head>
<body>{body}
</body>
</html>
"""
open("index.html", "w", encoding="utf-8").write(page)
print("index.html", len(page))
