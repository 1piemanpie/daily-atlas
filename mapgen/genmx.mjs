// Mexico, Central America and the Caribbean map for the Mexico & Caribbean week
import fs from 'fs';
import { geoConicConformal, geoPath, geoArea, geoDistance } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature } from 'topojson-client';

const NE = '../ne/';
const units = JSON.parse(fs.readFileSync(NE + 'ne_10m_admin_0_map_units.geojson'));
const adm1 = JSON.parse(fs.readFileSync(NE + 'ne_10m_admin_1.geojson'));
const groups = {}, names = {};
const add = (k, n, g) => { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; (groups[k] ||= []).push(...polys); names[k] = n; };
const STATE_NAME = { DIF: ['CMX', 'Mexico City'], MEX: ['MEX', 'State of Mexico'] };
for (const f of adm1.features) {
  const p = f.properties; if (p.adm0_a3 !== 'MEX' || !p.iso_3166_2 || p.iso_3166_2.includes('~')) continue;
  const c = p.iso_3166_2.slice(3), [k, n] = STATE_NAME[c] || [c, p.name];
  add(k, n, f.geometry);
}
const UNITS = { USA: 'United States', CUB: 'Cuba', JAM: 'Jamaica', HTI: 'Haiti', DOM: 'Dominican Republic', PRI: 'Puerto Rico', BHS: 'The Bahamas', BLZ: 'Belize', GTM: 'Guatemala', HND: 'Honduras', SLV: 'El Salvador', NIC: 'Nicaragua', CRI: 'Costa Rica', PAN: 'Panama', COL: 'Colombia', VEN: 'Venezuela', GUY: 'Guyana', TTO: 'Trinidad and Tobago', BRB: 'Barbados', CYM: 'Cayman Islands', TCA: 'Turks and Caicos', GRD: 'Grenada', VCT: 'St Vincent and the Grenadines', LCA: 'Saint Lucia', MTQ: 'Martinique', DMA: 'Dominica', GLP: 'Guadeloupe', ACA: ['ATG', 'Antigua and Barbuda'], ACB: ['ATG', 'Antigua and Barbuda'], KNA: 'St Kitts and Nevis', VIR: 'US Virgin Islands', VGB: 'British Virgin Islands', ABW: 'Aruba', CUW: 'Curaçao', USG: ['CUB', 'Cuba'] };
for (const f of units.features) {
  const u = UNITS[f.properties.SU_A3]; if (!u) continue;
  const [k, n] = Array.isArray(u) ? u : [f.properties.SU_A3, u];
  add(k, n, f.geometry);
}
const W = 800;
const box = { type: 'MultiPoint', coordinates: [[-117.5, 6.8], [-117.5, 33], [-59, 33], [-59, 6.8], [-88, 33.6], [-88, 6.2]] };
const proj = geoConicConformal().parallels([12, 28]).rotate([88, 0]).fitWidth(W, box);
const H = Math.ceil(geoPath(proj).bounds(box)[1][1]);
proj.clipExtent([[0, 0], [W, H]]);
console.log('viewBox', W, H);

const projected = {};
for (const [k, polys] of Object.entries(groups)) {
  const g = geoProject({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } }, proj);
  if (g && g.geometry) projected[k] = g;
}
const simp = simplify(presimplify(topology(projected, 2e5)), 0.012);
const path = geoPath(null).digits(1);
const out = {};
for (const k of Object.keys(projected)) {
  const f = feature(simp, simp.objects[k]);
  let polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const keep = polys.filter(c => path.area({ type: 'Polygon', coordinates: c }) > 0.02);
  if (keep.length) polys = keep;
  const g = { type: 'MultiPolygon', coordinates: polys }, d = path(g); if (!d) continue;
  const big = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => path.area(b) - path.area(a))[0];
  out[k] = { d, c: path.centroid(big).map(v => +v.toFixed(1)) };
}
console.log(Object.keys(out).length, 'shapes', JSON.stringify(out).length);
const a = proj([-90, 17]), b = proj([-90, 19]);
const mpu = geoDistance([-90, 17], [-90, 19]) * 3958.8 / Math.hypot(a[0] - b[0], a[1] - b[1]);
console.log('mpu', mpu);

const P = ([lon, lat]) => proj([lon, lat]).map(v => +v.toFixed(1));
const POINTS = JSON.parse(fs.readFileSync('mxpoints.json'));
const points = Object.fromEntries(Object.entries(POINTS).map(([k, v]) => [k, { c: P(v.slice(0, 2)), label: v[2] }]));

// each day's warm-up: a regional box and the cities inside it
const CITIES = JSON.parse(fs.readFileSync('mxcities.json'));
const cities = {}, bounds = {}, dots = {};
for (const [st, { box: [lo0, la0, lo1, la1], list }] of Object.entries(CITIES)) {
  cities[st] = list.map(([n, lon, lat]) => [n, ...P([lon, lat])]);
  dots[st] = cities[st].map(c => [c[1], c[2]]);
  const p0 = proj([lo0, la1]), p1 = proj([lo1, la0]), p2 = proj([lo0, la0]), p3 = proj([lo1, la1]);
  bounds[st] = [Math.min(p0[0], p2[0]), Math.min(p0[1], p3[1]), Math.max(p1[0], p3[0]), Math.max(p1[1], p2[1])].map(v => Math.round(v * 10) / 10);
}
console.log(bounds);

const rivers = JSON.parse(fs.readFileSync('node_modules/@geo-maps/earth-rivers-1km/map.geo.json'));
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
fs.writeFileSync('mx.json', JSON.stringify({ vb: [W, H], shapes: out, names, points, mpu: +mpu.toFixed(3), pin: { cities, bounds }, water, dots }));
