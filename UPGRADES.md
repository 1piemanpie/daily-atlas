# Post-launch upgrades (checklist)

Work list for the upgrades that were held back until Daily Atlas went live (Micah, 2026-10-27).
If a session runs out before this is done, the next session picks up from the first unchecked box.
Branch: `claude/project-thread-ktulnq`. Every change also gets republished to the Claude artifact.

## Content rules and planning
- [x] `plan/rules.md`: standing content rules for every new week (US English audience, easy/hard alternation, recurring places with new facts, subdivision coverage with grouping)
- [x] `plan/coverage.json`: every country's first-level subdivisions, grouped where a country has many minor ones, with an easy/hard tier and a visit log
- [x] `plan/schedule.md`: upcoming weeks queue, alternating easy and hard regions
- [ ] Update the weekly Tuesday scheduled task so its prompt follows these rules

## Warm-up (pin the city)
- [x] Landmark hint for every warm-up city ("San Francisco: on the big bay halfway up California's coast"), shown after the tap
- [x] Map visual for the hint: the landmark is marked and labelled on the warm-up map
- [x] Satellite imagery under the warm-up map on the website (reprojected to match each map), with a credit line and a Map/Satellite toggle; falls back to the drawn map where images can't load

## Fact cards
- [x] Real photos (free licenses, from Wikimedia Commons) on fact cards where they help, each with a credit line; hidden where images can't load

- [ ] More photos: 17 public-domain photos are in so far (US government, Library of Congress, and pre-1929 works, where the license is certain from the source). Wikimedia Commons is blocked from the build sessions' network, so free-licensed (CC BY / BY-SA) photos whose author and license must be read off the file page wait until `commons.wikimedia.org` is allowed in the cloud environment's network settings.

## World map
- [x] First-level subdivisions for every country (grouped where needed), shown when zoomed in, like US states today
- [x] More detailed country borders

## Ship
- [x] Build `index.html`, playtest in a browser (phone and desktop widths)
- [x] Republish the Claude artifact
- [ ] Open the PR and update project memory
