# Daily Atlas

A daily geography trivia game. Each day is one new place, with a pin-the-city warm-up and about eight quick questions across history, pop culture, food, flags, music and more. Questions you miss come back as callbacks on later days and in the Sunday recap.

Play it at **https://1piemanpie.github.io/daily-atlas/**

## How it's put together

- `src/daily-atlas.html` is the whole game in one file: content, map data, styles and script.
- `build.py` wraps it into `index.html`, the page GitHub Pages serves. Run `python3 build.py` after any change to `src/`.
- `content/` holds each week's questions (`*-week.js`) and fact cards (`*-fx.js`) as they were written, before being merged into the game.
- `mapgen/` has the scripts that turn Natural Earth data into the projected SVG maps (`genworld.mjs` for the world map, one script per regional week map), plus `genpinll.mjs`, which turns the warm-up cities and their landmark hints (`pinhints.json`) into latitude and longitude for the world satellite warm-up.
- `sources/` lists a reference for every question, week by week.

## Weeks so far

1. USA
2. UK & Ireland
3. Mexico & the Caribbean

The calendar starts on Monday 26 October 2026, and each week moves to the next region. A new week is written every week.

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain), via world-atlas and us-atlas.
