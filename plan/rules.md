# Daily Atlas: content rules for every new week

These are Micah's standing rules. The weekly scheduled task (Tuesdays) reads this file before writing a week.

## Who it's for
- A **US English-speaking audience**. Spell the American way, use miles first, and pitch questions so a curious American adult can reason their way to the answer.
- The game is about remembering, not gatekeeping: every question hangs off a place, and the fact card is what we want to stick.

## How the calendar works
- One region per week, chosen internally. Players never see week names or region tabs: just Mon to Sun and a calendar.
- Monday to Saturday: one place a day (a state, province, region, city or small country). Sunday: the recap.
- Stay **2 to 3 weeks ahead** of today. Weeks loop if we ever run out, so never let that happen.

## Easy and hard weeks alternate
- **Easy** = the Americas and western Europe. **Hard** = everything else (see `tier` in `coverage.json`).
- Weeks **alternate easy and hard**. Never spend the easy regions up front, and never run two hard weeks in a row. Ten weeks from now should look as varied as the next two.
- Inside a hard week, open with a place most Americans have heard of (a capital, a famous city, a landmark) and mix the obscure places between familiar ones. Lean on links to things the player already knows (the British Raj, Marco Polo, K-pop, the Olympics) to give the facts something to hang on.
- `schedule.md` holds the queue. Take the next week from it, then add one more to its end so the queue stays about ten weeks long, keeping the alternation.

## Cover the whole world, a subdivision at a time
- Over time, every country's **major first-level subdivisions** get a day: every US state, every Canadian province, every Japanese prefecture, every Indian state, and so on. `coverage.json` lists them for every country.
- Use discretion where a country has many minor subdivisions. `coverage.json` groups those already (Chad becomes 4 areas, Russia its 6 federal districts). Groups marked `"how": "grouped"` are a first guess: when you plan that country's week, regroup them so each place has enough well-known facts for a day, then mark the country `"manual": true` so the generator keeps your version.
- Some places only have a handful of facts a player could reasonably learn. Combine them with a neighbor ("Nashville & Memphis", "Belfast & the Causeway Coast") rather than padding a day with trivia nobody could know.
- Small island nations and microstates are one place each. Several can share a week (the Caribbean week did Cuba, Jamaica and Puerto Rico).

## Places come back, forever, with new facts
- Covering a place once is not the end. Once a region has had its first pass, keep coming back: Louisiana should return months or years later with **new** facts.
- Before writing a revisit, read that place's `visits` in `coverage.json` and its earlier questions in the game (search `src/daily-atlas.html` for the day id). Do not repeat a question or a fact card. New angles: a different city, a different era, food, sport, music, a famous person, nature.
- A revisit counts as the tier of its country. It can sit inside a mixed week (for example "The Gulf Coast": Louisiana again, plus Mississippi, Alabama...).
- After a week is published, append each day to the country's `visits` list: `{"date": "YYYY-MM-DD", "place": "...", "day": "<day id>"}`.

## What every day needs (unchanged from launch)
- 7 to 10 questions with open topics; lean towards the player's weak spots (pop culture especially) without dropping the rest.
- A flag question, a map question with lots of tappable options (the week map should have 25+ regions), and visual fact cards (map, chart, flags, photo).
- No giveaways: the answer is never the day's own place and the place's name never appears in the options. No cross-question spoilers on the same day (the game also reorders at runtime, but write them clean).
- **Warm-up cities:** each place gets 3 or more pin-the-city cities, and every warm-up city gets a **landmark hint** (`PIN_HINTS`): one sentence tying the city to something you can see on a map ("on the big bay halfway up California's coast", "just southwest of Lake Neusiedl"), plus the landmark's longitude and latitude so the warm-up map can mark it.
- **Photos:** give the 2 to 3 fact cards a day that are about something you can see (a building, a dish, a person, an animal, an event) a photo from Wikimedia Commons with a free license (public domain, CC0, CC BY, CC BY-SA). Record the file name, author, license and link in `PHOTOS` so the credit line is right. Never use a photo without a license you have checked.
- Fact-check every question against a real source and save the list in `sources/fact-check-<region>-week.md`.
- Before publishing: run the no-spoiler audit, play the whole week in a browser, run `python3 build.py`, commit to the repo and republish the Claude artifact.
