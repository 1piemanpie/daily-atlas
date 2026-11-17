// Italy and its neighbors, for the Italy week
import fs from 'fs';
import { geoConicConformal, geoPath, geoArea, geoDistance } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, merge } from 'topojson-client';

const NE = '../ne/';
const units = JSON.parse(fs.readFileSync(NE + 'ne_10m_admin_0_map_units.geojson'));
const adm1 = JSON.parse(fs.readFileSync(NE + 'ne_10m_admin_1_lakes.geojson'));
const groups = {}, names = {};
const add = (k, n, g) => { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; (groups[k] ||= []).push(...polys); names[k] = n; };
const REG = { 'Abruzzo': ['ABR', 'Abruzzo'], 'Apulia': ['PUG', 'Apulia'], 'Basilicata': ['BAS', 'Basilicata'], 'Calabria': ['CAL', 'Calabria'], 'Campania': ['CAM', 'Campania'], 'Emilia-Romagna': ['EMR', 'Emilia-Romagna'], 'Friuli-Venezia Giulia': ['FVG', 'Friuli-Venezia Giulia'], 'Lazio': ['LAZ', 'Lazio'], 'Liguria': ['LIG', 'Liguria'], 'Lombardia': ['LOM', 'Lombardy'], 'Marche': ['MAR', 'Marche'], 'Molise': ['MOL', 'Molise'], 'Piemonte': ['PIE', 'Piedmont'], 'Sardegna': ['SAR', 'Sardinia'], 'Sicily': ['SIC', 'Sicily'], 'Toscana': ['TOS', 'Tuscany'], 'Trentino-Alto Adige': ['TAA', 'Trentino-South Tyrol'], 'Umbria': ['UMB', 'Umbria'], "Valle d'Aosta": ['VDA', 'Aosta Valley'], 'Veneto': ['VEN', 'Veneto'] };
for (const f of adm1.features) {
  const p = f.properties; if (p.adm0_a3 !== 'ITA') continue;
  const r = REG[p.region]; if (!r) { console.log('no region', p.name, p.region); continue; }
  add(r[0], r[1], f.geometry);
}
const UNITS = { FXX: 'France', CHE: 'Switzerland', AUT: 'Austria', SVN: 'Slovenia', HRV: 'Croatia', MNE: 'Montenegro', ALB: 'Albania', GRC: 'Greece', DEU: 'Germany', LIE: 'Liechtenstein', HUN: 'Hungary', SRS: ['SRB', 'Serbia'], SRV: ['SRB', 'Serbia'], KOS: 'Kosovo', BHF: ['BIH', 'Bosnia and Herzegovina'], BIS: ['BIH', 'Bosnia and Herzegovina'], BHB: ['BIH', 'Bosnia and Herzegovina'], SMR: 'San Marino', VAT: 'Vatican City', MLT: 'Malta', MCO: 'Monaco', TUN: 'Tunisia', DZA: 'Algeria', LBY: 'Libya' };
for (const f of units.features) {
  const u = UNITS[f.properties.SU_A3]; if (!u) continue;
  const [k, n] = Array.isArray(u) ? u : [f.properties.SU_A3, u];
  add(k, n, f.geometry);
}
const W = 800;
const box = { type: 'MultiPoint', coordinates: [[5.5, 35.3], [5.5, 47.6], [19.5, 47.6], [19.5, 35.3], [12.5, 48], [12.5, 35]] };
const proj = geoConicConformal().parallels([38, 46]).rotate([-12.5, 0]).fitWidth(W, box);
const H = Math.ceil(geoPath(proj).bounds(box)[1][1]);
proj.clipExtent([[0, 0], [W, H]]);
console.log('viewBox', W, H);

const projected = {};
for (const [k, polys] of Object.entries(groups)) {
  const fs = polys.map(c => geoProject({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: c } }, proj)).filter(g => g && g.geometry);
  if (fs.length) projected[k] = { type: 'FeatureCollection', features: fs };
}
const simp = simplify(presimplify(topology(projected, 2e5)), 0.12);
const path = geoPath(null).digits(1);
const out = {};
for (const k of Object.keys(projected)) {
  const f = { geometry: merge(simp, simp.objects[k].geometries.filter(g => g.type)) };
  let polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const keep = polys.filter(c => path.area({ type: 'Polygon', coordinates: c }) > 0.3);
  if (keep.length) polys = keep;
  const g = { type: 'MultiPolygon', coordinates: polys }, d = path(g); if (!d) continue;
  const big = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => path.area(b) - path.area(a))[0];
  out[k] = { d, c: path.centroid(big).map(v => +v.toFixed(1)) };
}
console.log(Object.keys(out).length, 'shapes', JSON.stringify(out).length);
const a = proj([12.5, 41]), b = proj([12.5, 43]);
const mpu = geoDistance([12.5, 41], [12.5, 43]) * 3958.8 / Math.hypot(a[0] - b[0], a[1] - b[1]);
console.log('mpu', mpu);

const P = ([lon, lat]) => proj([lon, lat]).map(v => +v.toFixed(1));
const POINTS = JSON.parse(fs.readFileSync('itpoints.json'));
const points = Object.fromEntries(Object.entries(POINTS).map(([k, v]) => [k, { c: P(v.slice(0, 2)), label: v[2] }]));

// each day's warm-up: a regional box and the cities inside it
const CITIES = JSON.parse(fs.readFileSync('itcities.json'));
const cities = {}, bounds = {}, dots = {};
for (const [st, { box: [lo0, la0, lo1, la1], list }] of Object.entries(CITIES)) {
  cities[st] = list.map(([n, lon, lat]) => [n, ...P([lon, lat])]);
  dots[st] = cities[st].map(c => [c[1], c[2]]);
  const p0 = proj([lo0, la1]), p1 = proj([lo1, la0]), p2 = proj([lo0, la0]), p3 = proj([lo1, la1]);
  bounds[st] = [Math.min(p0[0], p2[0]), Math.min(p0[1], p3[1]), Math.max(p1[0], p3[0]), Math.max(p1[1], p2[1])].map(v => Math.round(v * 10) / 10);
}
console.log(bounds);

if (0) { const rivers = JSON.parse(fs.readFileSync('node_modules/@geo-maps/earth-rivers-1km/map.geo.json'));
const lakes = JSON.parse(fs.readFileSync('node_modules/@geo-maps/earth-lakes-1km/map.geo.json'));
const fix = p => (geoArea(p) > 2 * Math.PI ? { type: 'Polygon', coordinates: p.coordinates.map(r => r.slice().reverse()) } : p);
const split = g => g.geometries.flatMap(x => x.type === 'MultiPolygon' ? x.coordinates.map(c => ({ type: 'Polygon', coordinates: c })) : [x]).map(fix);
const rv = split(rivers), lk = split(lakes);
const wp = geoPath(proj).digits(2);
const lines = JSON.parse(fs.readFileSync(NE + 'ne_10m_rivers_lake_centerlines.geojson')).features
  .filter(f => f.geometry && !/Lake Centerline/.test(f.properties.featurecla));
const water = {};
for (const [st, [x0, y0, x1, y1]] of Object.entries(bounds)) {
  const pad = Math.max(x1 - x0, y1 - y0) * 0.12, bx0 = x0 - pad, by0 = y0 - pad, bx1 = x1 + pad, by1 = y1 + pad, sz = Math.max(x1 - x0, y1 - y0);
  const inBox = f => { const p = wp.bounds(f); return isFinite(p[0][0]) && p[0][0] < bx1 && p[1][0] > bx0 && p[0][1] < by1 && p[1][1] > by0; };
  const r = rv.filter(inBox).filter(f => wp.area(f) > sz * sz * 1e-6).map(f => wp(f)).filter(Boolean).join('');
  const l = lk.filter(inBox).filter(f => wp.area(f) > sz * sz * 1e-5).map(f => wp(f)).filter(Boolean).join('');
  const s = lines.filter(inBox).map(f => wp(f)).filter(Boolean).join('');
  water[st] = { r, l, s };
  console.log('water', st, r.length, l.length, s.length);
}
}
fs.writeFileSync('it.json', JSON.stringify({ vb: [W, H], shapes: out, names, points, mpu: +mpu.toFixed(3), pin: { cities, bounds } }));
