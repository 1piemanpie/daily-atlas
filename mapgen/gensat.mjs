// Satellite imagery for the pin-the-city warm-up. Web map tiles are square in Web Mercator; the warm-up maps use
// conic projections. Over one small tile the difference is close to an affine warp, so each tile is placed in the
// map with one SVG transform matrix. This script picks the tiles that cover each warm-up view (plus room for the
// landmark hints) at a zoom where the warp error stays under a quarter of a screen pixel, and prints the game's SAT data.
import fs from 'fs';
import * as P from './projections.mjs';

const html = fs.readFileSync('../src/daily-atlas.html', 'utf8');
const grab = name => { const i = html.indexOf(`const ${name} = `) + name.length + 9; return JSON.parse(html.slice(i, html.indexOf('\n', i)).replace(/;$/, '')); };
const VIEWS = { us: grab('PIN'), uk: grab('UK').pin, mx: grab('MX').pin };
const HINTS = JSON.parse(fs.readFileSync('pinhints.out.json'));

const lon = (x, z) => x / 2 ** z * 360 - 180;
const lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
const tx = (lo, z) => Math.floor((lo + 180) / 360 * 2 ** z);
const ty = (la, z) => { const r = la * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };

const out = {};
for (const [map, pin] of Object.entries(VIEWS)) {
  const proj = P[map];
  out[map] = {};
  for (const [st, [x0, y0, x1, y1]] of Object.entries(pin.bounds)) {
    // the warm-up view (12% padding, as pinRound draws it), grown to take in every landmark of the state's cities
    const pad = Math.max(x1 - x0, y1 - y0) * 0.12;
    let bx0 = x0 - pad, by0 = y0 - pad, bx1 = x1 + pad, by1 = y1 + pad;
    const vw = bx1 - bx0;
    for (const c of pin.cities[st]) {
      const h = (HINTS[map] || {})[c[0]]; if (!h) continue;
      const [lx, ly] = h.lm, m = vw * 0.3;
      bx0 = Math.min(bx0, lx - m); by0 = Math.min(by0, ly - m); bx1 = Math.max(bx1, lx + m); by1 = Math.max(by1, ly + m);
    }
    const g = (bx1 - bx0) * 0.08; bx0 -= g; bx1 += g; by0 -= g; by1 += g;
    // corners of the view in lon/lat, sampled along the edges (the map is curved in Mercator)
    const inv = proj.invert ? proj : null, ll = [];
    for (let k = 0; k <= 20; k++) for (const [x, y] of [[bx0 + (bx1 - bx0) * k / 20, by0], [bx0 + (bx1 - bx0) * k / 20, by1], [bx0, by0 + (by1 - by0) * k / 20], [bx1, by0 + (by1 - by0) * k / 20]]) {
      const p = map === 'us' ? usInvert(st, x, y) : inv.invert([x, y]); if (p) ll.push(p);
    }
    const lo0 = Math.min(...ll.map(p => p[0])), lo1 = Math.max(...ll.map(p => p[0])), la0 = Math.min(...ll.map(p => p[1])), la1 = Math.max(...ll.map(p => p[1]));
    const fwd = map === 'us' ? usForward(st) : proj;
    // screen pixels per map unit: the warm-up map is about 400 css px wide, so allow for 2x screens
    const pxPerUnit = 800 / (x1 - x0 + pad * 2);
    let z = 4, tiles;
    for (; z <= 14; z++) {
      const span = fwd([lon(tx(lo0, z) + 1, z), lat(ty((la0 + la1) / 2, z), z)])[0] - fwd([lon(tx(lo0, z), z), lat(ty((la0 + la1) / 2, z), z)])[0];
      if (Math.abs(span) * pxPerUnit > 400) continue; // tiles would be blurry: zoom in
      tiles = []; let worst = 0;
      for (let x = tx(lo0, z); x <= tx(lo1, z); x++) for (let y = ty(la1, z); y <= ty(la0, z); y++) {
        const p0 = fwd([lon(x, z), lat(y, z)]), p1 = fwd([lon(x + 1, z), lat(y, z)]), p2 = fwd([lon(x, z), lat(y + 1, z)]), p3 = fwd([lon(x + 1, z), lat(y + 1, z)]);
        if (!p0 || !p1 || !p2 || !p3) continue;
        const qx = [p0[0], p1[0], p2[0], p3[0]], qy = [p0[1], p1[1], p2[1], p3[1]];
        if (Math.max(...qx) < bx0 || Math.min(...qx) > bx1 || Math.max(...qy) < by0 || Math.min(...qy) > by1) continue;
        // fit the affine map through the tile's center as well, splitting the corner error both ways
        const a = (p1[0] - p0[0]) / 256, b = (p1[1] - p0[1]) / 256, c = (p2[0] - p0[0]) / 256, d = (p2[1] - p0[1]) / 256;
        const ex = p0[0] + 256 * (a + c) - p3[0], ey = p0[1] + 256 * (b + d) - p3[1];
        worst = Math.max(worst, Math.hypot(ex, ey) * pxPerUnit / 2);
        const e = p0[0] - ex / 4, f = p0[1] - ey / 4;
        tiles.push([x, y, ...[a, b, c, d].map(v => +v.toFixed(5)), +e.toFixed(2), +f.toFixed(2)]);
      }
      if (process.env.DBG) console.log(st, z, tiles.length, worst.toFixed(2), (Math.abs(span) * pxPerUnit).toFixed(0));
      if (worst < 3.5) break;
    }
    out[map][st] = { z, t: tiles };
    console.log(map, st, 'z', z, 'tiles', tiles.length);
  }
}
fs.writeFileSync('sat.out.json', JSON.stringify(out));
console.log('bytes', JSON.stringify(out).length);

// geoAlbersUsa sends Alaska and Hawaii to insets; each state's imagery uses the one part of it that draws that state
import { geoConicEqualArea } from 'd3-geo';
function usPart(st) {
  const k = 1300, [x, y] = [487.5, 305];
  if (st === 'HI') return geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]).scale(k).translate([x - 0.205 * k, y + 0.212 * k]);
  if (st === 'AK') return geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]).scale(k * 0.35).translate([x - 0.307 * k, y + 0.201 * k]);
  return geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]).center([-0.6, 38.7]).scale(k).translate([x, y]);
}
function usForward(st) { return usPart(st); }
function usInvert(st, x, y) { return usPart(st).invert([x, y]); }
