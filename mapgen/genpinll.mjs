// Data for the world satellite warm-up, printed as three lines of the game's script:
//  PIN_LL     latitude, longitude and "state or country" for every warm-up city, recovered by inverting each
//             week map's projection at the city's map position (so it matches the week maps exactly)
//  PIN_HINTS  each city's landmark hint with the landmark's latitude and longitude (from pinhints.json)
//  WORLD_LAND a light country outline drawn under the satellite tiles, shown only if the tiles can't load
// Run `node genpinll.mjs` and paste the three lines over the old ones in src/daily-atlas.html.
import fs from 'fs';
import * as P from './projections.mjs';
import { feature } from 'topojson-client';
import { geoEquirectangular } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';

const html = fs.readFileSync('../src/daily-atlas.html', 'utf8');
const grab = name => { const i = html.indexOf(`const ${name} = `) + name.length + 9; return JSON.parse(html.slice(i, html.indexOf('\n', i)).replace(/;$/, '')); };
const usNames = Object.fromEntries([...html.match(/const STATE_NAMES = \{([^}]*)\}/)[1].matchAll(/(\w+):"([^"]+)"/g)].map(m => [m[1], m[2]]));
const UK = grab('UK'), MX = grab('MX');
const VIEWS = { us: [grab('PIN'), usNames], uk: [UK.pin, UK.names], mx: [MX.pin, { CMX: 'Mexico', YUC: 'Mexico', JAL: 'Mexico', CUB: 'Cuba', JAM: 'Jamaica', PRI: 'Puerto Rico' }] };

const r3 = v => Math.round(v * 1000) / 1000;
const ll = {};
for (const [map, [pin, names]] of Object.entries(VIEWS)) {
  ll[map] = {};
  for (const [st, list] of Object.entries(pin.cities)) for (const [city, x, y] of list) {
    const [lon, lat] = P[map].invert([x, y]);
    ll[map][city] = [r3(lat), r3(lon), names[st] || st];
  }
}

const src = JSON.parse(fs.readFileSync('pinhints.json')), hints = {};
for (const [map, cities] of Object.entries(src)) {
  if (map.startsWith('_')) continue;
  hints[map] = {};
  for (const [city, [h, lon, lat, label]] of Object.entries(cities)) hints[map][city] = { h, lm: [lat, lon, label] };
}

// countries at 1:110m, rounded to 0.1 degree, as one multipolygon of [lat, lon] rings (Leaflet's order). Projecting through
// a plain equirectangular projection cuts the shapes along the 180th meridian (Russia, Fiji), so no ring wraps round the map;
// Antarctica is left out (it hugs the bottom edge of a Mercator map anyway).
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json'));
const deg = geoEquirectangular().scale(180 / Math.PI).translate([0, 0]);
const rings = [];
for (const f of feature(topo, topo.objects.countries).features) {
  if (!f.geometry || f.properties.name === 'Antarctica') continue;
  const g = geoProject(f, deg).geometry; if (!g) continue;
  for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
    const ring = [];
    for (const [x, y] of poly[0]) { const p = [Math.round(-y * 10) / 10, Math.round(x * 10) / 10]; const q = ring[ring.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) ring.push(p); }
    if (ring.length > 3) rings.push(ring);
  }
}

const out = [
  `const PIN_LL = ${JSON.stringify(ll)};`,
  `const PIN_HINTS = ${JSON.stringify(hints)};`,
  `const WORLD_LAND = ${JSON.stringify(rings)};`,
].join('\n');
fs.writeFileSync('pinll.out.js', out + '\n');
console.log(Object.fromEntries(Object.entries(ll).map(([k, v]) => [k, Object.keys(v).length])), 'bytes', out.length);
