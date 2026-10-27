"""Builds plan/coverage.json: every country, the places it will be covered through, its easy/hard tier, and a visit log.

A "place" is what one day of the game is about: a first-level subdivision (state, province, region...) or, where a
country has many minor ones, a group of them. Keys under "subs" match the world map's subdivision keys
(data/world-subs.json and WORLD.subs in the game), so a place lights up the right part of the map.

Rerunning keeps everything already in the file's "visits" lists and any place lists marked "manual": true.
Run from the repo root: python3 plan/gen_coverage.py   (needs ne/ and mapgen/world.json; see mapgen/genworld.mjs)
"""
import json, math, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
adm0 = json.load(open(os.path.join(ROOT, "ne/ne_10m_admin_0_countries.geojson")))["features"]
world = json.load(open(os.path.join(ROOT, "mapgen/world.json")))
subs = dict(world["subs"]); subs.update(json.load(open(os.path.join(ROOT, "data/world-subs.json"))))
countries = world["countries"]

# Easy for a US English speaker: the Americas and western Europe (Micah, 2026-10-27). Everything else is hard.
EASY_EUROPE = {"GBR", "IRL", "FRA", "BEL", "NLD", "LUX", "DEU", "CHE", "AUT", "ESP", "PRT", "ITA", "DNK", "NOR", "SWE",
               "FIN", "ISL", "MCO", "AND", "LIE", "SMR", "VAT", "MLT", "GRC", "IMN", "JEY", "GGY", "GIB", "FRO", "ALD"}
# Countries whose every subdivision gets its own day over time, however many there are
EVERY_SUB = {"USA", "CAN", "MEX", "BRA", "ARG", "AUS", "IND", "CHN", "JPN", "DEU", "FRA", "ITA", "ESP", "KOR", "ZAF",
             "CHL", "COL", "PER", "IDN", "PAK", "NGA", "EGY", "AUT", "CHE", "NLD", "BEL", "POL", "SWE", "NOR", "IRL", "PHL"}
# Hand-made places for countries where the map's units are not how a trivia player thinks about them
MANUAL = {
    "GBR": [("London", ["GB-ENG"]), ("Liverpool & Manchester", ["GB-ENG"]), ("Yorkshire & the North East", ["GB-ENG"]),
            ("The Midlands", ["GB-ENG"]), ("Cornwall & the South West", ["GB-ENG"]), ("Oxford, Cambridge & the South East", ["GB-ENG"]),
            ("The Lake District & Cumbria", ["GB-ENG"]), ("Scotland", ["GB-SCO"]), ("Edinburgh", ["GB-SCO"]), ("The Highlands & Islands", ["GB-SCO"]),
            ("Wales", ["GB-WAL"]), ("Northern Ireland", ["GB-NIR"])],
    "IRL": [("Dublin", []), ("Cork & Munster", []), ("Galway & Connacht", []), ("Donegal & the north-west", []), ("Kerry & the Wild Atlantic Way", [])],
}

def compass(dx, dy):
    if math.hypot(dx, dy) < 1e-9: return "Central"
    a = (math.degrees(math.atan2(-dy, dx)) + 360) % 360
    return ["East", "Northeast", "North", "Northwest", "West", "Southwest", "South", "Southeast"][int(((a + 22.5) % 360) // 45)]

def kmeans(points, k, iters=40):
    pts = sorted(points)
    cents = [pts[int(i * (len(pts) - 1) / max(1, k - 1))] for i in range(k)]
    for _ in range(iters):
        groups = [[] for _ in cents]
        for p in pts:
            groups[min(range(len(cents)), key=lambda i: (p[0] - cents[i][0]) ** 2 + (p[1] - cents[i][1]) ** 2)].append(p)
        cents = [(sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)) if g else cents[i] for i, g in enumerate(groups)]
    return [g for g in groups if g]

def places_for(a3, ckey, name):
    if a3 in MANUAL: return [{"name": n, "subs": s} for n, s in MANUAL[a3]], "manual"
    mine = {k: v for k, v in subs.items() if v.get("p") == ckey}
    if not mine: return [{"name": name, "subs": [ckey]}], "whole country"
    if a3 in EVERY_SUB or len(mine) <= 12:
        return [{"name": v["n"], "subs": [k]} for k, v in sorted(mine.items(), key=lambda kv: kv[1]["n"])], "every subdivision"
    # many minor units: use the country's own regions when Natural Earth has them (Russia's federal districts, Thailand's regions...)
    regs = collections.defaultdict(list)
    for kk, v in mine.items(): regs[v.get("g")].append(kk)
    if None not in regs and 3 <= len(regs) <= 12:
        return [{"name": g if name in g else f"{g} {name}" if " " not in g else f"{g} ({name})", "subs": sorted(ks), "includes": sorted(subs[kk]["n"] for kk in ks)}
                for g, ks in sorted(regs.items())], "grouped"
    # otherwise group neighbors into a handful of compass-named areas (a first guess: refine it when that week is planned)
    k = min(8, max(3, round(len(mine) / 5)))
    cx = sum(v["c"][0] for v in mine.values()) / len(mine); cy = sum(v["c"][1] for v in mine.values()) / len(mine)
    by_pt = collections.defaultdict(list)
    for kk, v in mine.items(): by_pt[tuple(v["c"])].append(kk)
    out, used = [], collections.Counter()
    for g in kmeans(list(by_pt), k):
        gx = sum(p[0] for p in g) / len(g); gy = sum(p[1] for p in g) / len(g)
        spread = max(1e-6, max(math.hypot(v["c"][0] - cx, v["c"][1] - cy) for v in mine.values()))
        label = "Central" if math.hypot(gx - cx, gy - cy) < spread * 0.25 else compass(gx - cx, gy - cy)
        used[label] += 1
        keys = sorted(kk for p in g for kk in by_pt[p])
        out.append({"name": f"{label} {name}" if label != "Central" else f"Central {name}", "subs": keys,
                    "includes": [subs[kk]["n"] for kk in keys]})
    # two clusters with the same compass label get told apart by their biggest member
    for p in out:
        if used[p["name"].split(" ")[0]] > 1: p["name"] = f"{p['name']} (around {p['includes'][0]})"
    return out, "grouped"

old = {}
path = os.path.join(ROOT, "plan/coverage.json")
if os.path.exists(path): old = json.load(open(path)).get("countries", {})

out = {}
for f in sorted(adm0, key=lambda f: f["properties"]["NAME"]):
    p = f["properties"]; a3 = p["ADM0_A3"]
    ckey = next((k for k, v in countries.items() if v["n"] == p["NAME"]), None)
    if not ckey or p["CONTINENT"] == "Antarctica": continue
    tier = "easy" if p["CONTINENT"] in ("North America", "South America") or a3 in EASY_EUROPE else "hard"
    prev = old.get(a3, {})
    if prev.get("manual"): places, how = prev["places"], "manual"
    else: places, how = places_for(a3, ckey, p["NAME"])
    out[a3] = {"name": p["NAME"], "map": ckey, "tier": tier, "region": p["SUBREGION"], "how": how, "places": places,
               "visits": prev.get("visits", [])}
    if prev.get("manual"): out[a3]["manual"] = True

# what has been played so far (week start, place, the game's day id); fact ids live in the game's WEEKS data
SEED = {
    "USA": [("2026-10-26", "Louisiana", "nola"), ("2026-10-27", "Texas", "texas"), ("2026-10-28", "Tennessee", "tenn"),
            ("2026-10-29", "California", "cali"), ("2026-10-30", "New York", "nyc"), ("2026-10-31", "Hawaii", "hawaii")],
    "GBR": [("2026-11-02", "London", "london"), ("2026-11-03", "Liverpool & Manchester", "mersey"), ("2026-11-04", "Wales", "wales"),
            ("2026-11-05", "Scotland", "scotland"), ("2026-11-06", "Northern Ireland", "belfast")],
    "IRL": [("2026-11-07", "Dublin", "dublin")],
    "MEX": [("2026-11-09", "Mexico City", "mexcity"), ("2026-11-10", "Yucatán", "yucatan"), ("2026-11-11", "Jalisco", "guadalajara")],
    "CUB": [("2026-11-12", "Cuba", "havana")], "JAM": [("2026-11-13", "Jamaica", "kingston")], "PRI": [("2026-11-14", "Puerto Rico", "sanjuan")],
}
for a3, vs in SEED.items():
    if a3 in out and not out[a3]["visits"]:
        out[a3]["visits"] = [{"date": d, "place": n, "day": i} for d, n, i in vs]

doc = {"about": "Every country and the places (subdivisions or groups of them) Daily Atlas will cover. tier: easy = Americas and "
                "western Europe for a US English audience, hard = everything else. Weeks alternate easy and hard. Places come "
                "back later with NEW facts; check 'visits' and the game's earlier questions before writing a revisit.",
       "countries": out}
json.dump(doc, open(path, "w"), ensure_ascii=False, indent=1)
tiers = collections.Counter(v["tier"] for v in out.values())
print(len(out), "countries", tiers, sum(len(v["places"]) for v in out.values()), "places")
