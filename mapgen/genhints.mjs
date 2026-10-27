// Projects pinhints.json (longitude/latitude) into each warm-up map's coordinates and prints the game's PIN_HINTS
import fs from 'fs';
import * as P from './projections.mjs';
const src = JSON.parse(fs.readFileSync('pinhints.json'));
const out = {};
for (const [map, cities] of Object.entries(src)) {
  if (map.startsWith('_')) continue;
  out[map] = {};
  for (const [city, [h, lon, lat, label]] of Object.entries(cities)) {
    const xy = P[map]([lon, lat]);
    if (!xy) { console.error('off map', map, city); continue; }
    out[map][city] = { h, lm: [+xy[0].toFixed(1), +xy[1].toFixed(1), label] };
  }
}
fs.writeFileSync('pinhints.out.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.keys(v).length])));
