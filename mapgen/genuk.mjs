// British Isles + neighbours map for the UK & Ireland week: projected, clipped, simplified SVG paths
import fs from 'fs';
import { geoConicConformal, geoPath, geoArea, geoDistance } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature } from 'topojson-client';

const NE = '../ne/';
const units = JSON.parse(fs.readFileSync(NE + 'ne_10m_admin_0_map_units.geojson'));
const KEYS = { ENG: 'ENG', SCT: 'SCO', WLS: 'WAL', NIR: 'NIR', IRL: 'IRL', IMN: 'IMN', JEY: 'JEY', GGY: 'GGY', FXX: 'FRA', BFR: 'BEL', BWR: 'BEL', BCR: 'BEL', NLX: 'NLD', LUX: 'LUX', DEU: 'DEU', DNK: 'DNK', NOW: 'NOR', SWE: 'SWE', CHE: 'CHE', POL: 'POL', CZE: 'CZE', AUT: 'AUT', ITA: 'ITA', ESP: 'ESP', FRO: 'FRO', SVN: 'SVN', HRV: 'HRV', HUN: 'HUN', SVK: 'SVK' };
const groups = {};
for (const f of units.features) {
  const k = KEYS[f.properties.SU_A3]; if (!k) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  (groups[k] ||= []).push(...polys);
}
const W = 800;
const box = { type: 'MultiPoint', coordinates: [[-12, 42.5], [-12, 62.4], [19, 62.4], [19, 42.5], [3.5, 63], [3.5, 42]] };
const proj = geoConicConformal().parallels([50, 60]).rotate([-3.5, 0]).fitWidth(W, box);
const H = Math.ceil(geoPath(proj).bounds(box)[1][1]);
proj.clipExtent([[0, 0], [W, H]]);
console.log('viewBox', W, H);

const projected = {};
for (const [k, polys] of Object.entries(groups)) {
  const g = geoProject({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } }, proj);
  if (g && g.geometry) projected[k] = g;
}
const topo = presimplify(topology(projected, 1e5));
const simp = simplify(topo, 0.03);
const path = geoPath(null).digits(1);
const out = {};
for (const k of Object.keys(projected)) {
  const f = feature(simp, simp.objects[k]);
  const d = path(f); if (!d) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const big = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => path.area(b) - path.area(a))[0];
  out[k] = { d, c: path.centroid(big).map(v => +v.toFixed(1)) };
  console.log(k, d.length);
}
// miles per map unit, measured along a meridian near the middle
const a = proj([-3, 53]), b = proj([-3, 55]);
const mpu = geoDistance([-3, 53], [-3, 55]) * 3958.8 / Math.hypot(a[0] - b[0], a[1] - b[1]);
console.log('mpu', mpu);

const P = ([lon, lat]) => proj([lon, lat]).map(v => +v.toFixed(1));
const POINTS = {
  LON: [-0.128, 51.507], LIV: [-2.991, 53.408], MAN: [-2.243, 53.481], CDF: [-3.179, 51.481], EDI: [-3.189, 55.953], BFS: [-5.930, 54.597], DUB: [-6.260, 53.350],
  NORMANDY: [1.10, 49.44], ORKNEY: [-2.96, 58.98], CARRICK: [-5.806, 54.716], ANGELN: [9.75, 54.68], BERGEN: [5.32, 60.39], HASTINGS: [0.573, 50.855]
};
const points = Object.fromEntries(Object.entries(POINTS).map(([k, v]) => [k, P(v)]));

const CITIES = {
  ENG: [['London', -0.128, 51.507], ['Birmingham', -1.890, 52.486], ['Manchester', -2.243, 53.481], ['Liverpool', -2.991, 53.408], ['Leeds', -1.549, 53.800], ['Newcastle', -1.618, 54.978], ['Bristol', -2.588, 51.454], ['Sheffield', -1.470, 53.381], ['Nottingham', -1.158, 52.954], ['Plymouth', -4.143, 50.376], ['Norwich', 1.297, 52.630], ['York', -1.082, 53.960], ['Oxford', -1.258, 51.752], ['Cambridge', 0.122, 52.205], ['Brighton', -0.137, 50.823], ['Southampton', -1.404, 50.910], ['Dover', 1.308, 51.129], ['Carlisle', -2.934, 54.892], ['Canterbury', 1.080, 51.280]],
  SCO: [['Edinburgh', -3.189, 55.953], ['Glasgow', -4.252, 55.864], ['Aberdeen', -2.094, 57.150], ['Dundee', -2.971, 56.462], ['Inverness', -4.225, 57.478], ['Stirling', -3.937, 56.117], ['Perth', -3.437, 56.396], ['Fort William', -5.105, 56.820], ['St Andrews', -2.796, 56.340], ['Oban', -5.471, 56.415], ['Kirkwall', -2.960, 58.981], ['Lerwick', -1.145, 60.155]],
  WAL: [['Cardiff', -3.179, 51.481], ['Swansea', -3.944, 51.621], ['Newport', -2.998, 51.588], ['Wrexham', -2.993, 53.046], ['Bangor', -4.129, 53.227], ['Aberystwyth', -4.083, 52.415], ['Holyhead', -4.633, 53.309], ['St Davids', -5.269, 51.882], ['Caernarfon', -4.276, 53.140], ['Llandudno', -3.827, 53.324], ['Brecon', -3.390, 51.946], ['Carmarthen', -4.312, 51.857]],
  NIR: [['Belfast', -5.930, 54.597], ['Derry', -7.309, 54.997], ['Armagh', -6.653, 54.350], ['Newry', -6.338, 54.176], ['Enniskillen', -7.632, 54.344], ['Omagh', -7.300, 54.600], ['Coleraine', -6.669, 55.133], ['Ballymena', -6.276, 54.864], ['Bushmills', -6.518, 55.204], ['Lisburn', -6.058, 54.516], ['Downpatrick', -5.715, 54.328]],
  IRL: [['Dublin', -6.260, 53.350], ['Cork', -8.471, 51.898], ['Galway', -9.057, 53.271], ['Limerick', -8.623, 52.664], ['Waterford', -7.110, 52.259], ['Kilkenny', -7.244, 52.654], ['Sligo', -8.476, 54.277], ['Killarney', -9.504, 52.059], ['Athlone', -7.940, 53.423], ['Donegal', -8.110, 54.654], ['Wexford', -6.463, 52.336], ['Westport', -9.517, 53.800], ['Dingle', -10.269, 52.141]]
};
const cities = {}, bounds = {}, dots = {};
const fullPath = geoPath(proj);
for (const [st, list] of Object.entries(CITIES)) {
  cities[st] = list.map(([n, lon, lat]) => [n, ...P([lon, lat])]);
  dots[st] = cities[st].map(c => [c[1], c[2]]);
  // bounds from the mainland part only (Scotland's islands would stretch the view too far)
  const polys = groups[{ SCO: 'SCO' }[st] || st];
  const main = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => geoArea(b) - geoArea(a));
  const keep = st === 'SCO' ? main.filter(p => geoArea(p) > geoArea(main[0]) * 0.002) : main.filter(p => geoArea(p) > geoArea(main[0]) * 0.01);
  const bb = fullPath.bounds({ type: 'MultiPolygon', coordinates: keep.map(p => p.coordinates) });
  bounds[st] = bb.flat().map(v => Math.round(v));
}
console.log(bounds);

// rivers and lakes (Natural Earth based polygons, same source as the US week)
const rivers = JSON.parse(fs.readFileSync('node_modules/@geo-maps/earth-rivers-1km/map.geo.json'));
const lakes = JSON.parse(fs.readFileSync('node_modules/@geo-maps/earth-lakes-1km/map.geo.json'));
const fix = p => (geoArea(p) > 2 * Math.PI ? { type: 'Polygon', coordinates: p.coordinates.map(r => r.slice().reverse()) } : p);
const split = g => g.geometries.flatMap(x => x.type === 'MultiPolygon' ? x.coordinates.map(c => ({ type: 'Polygon', coordinates: c })) : [x]).map(fix);
const rv = split(rivers), lk = split(lakes);
const wp = geoPath(proj).digits(1);
const lines = [...JSON.parse(fs.readFileSync(NE + 'ne_10m_rivers_europe.geojson')).features, ...JSON.parse(fs.readFileSync(NE + 'ne_10m_rivers_lake_centerlines.geojson')).features]
  .filter(f => f.geometry && f.properties.featurecla !== 'Lake Centerline' && f.properties.featurecla !== 'Lake Centerline (Intermittent)');
const water = {};
for (const [st, [x0, y0, x1, y1]] of Object.entries(bounds)) {
  const pad = Math.max(x1 - x0, y1 - y0) * 0.12, bx0 = x0 - pad, by0 = y0 - pad, bx1 = x1 + pad, by1 = y1 + pad;
  const inBox = f => { const p = wp.bounds(f); return isFinite(p[0][0]) && p[0][0] < bx1 && p[1][0] > bx0 && p[0][1] < by1 && p[1][1] > by0; };
  const r = rv.filter(inBox).filter(f => wp.area(f) > 0.02).map(f => wp(f)).filter(Boolean).join('');
  const l = lk.filter(inBox).filter(f => wp.area(f) > 0.15).map(f => wp(f)).filter(Boolean).join('');
  const s = lines.filter(inBox).map(f => wp(f)).filter(Boolean).join('');
  water[st] = { r, l, s };
  console.log('water', st, r.length, l.length, s.length);
}
fs.writeFileSync('uk.json', JSON.stringify({ vb: [W, H], shapes: out, points, mpu: +mpu.toFixed(3), pin: { cities, bounds }, water, dots }));
