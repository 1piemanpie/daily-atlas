// One zoomable world map: countries, with the US and Mexico split into states and the UK into its four nations
import fs from 'fs';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { geoProject, geoMiller } from 'd3-geo-projection';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature } from 'topojson-client';

const W = 1000;
// Miller cylindrical: meridians stay vertical, so the US and Europe sit level instead of leaning
const proj = geoMiller().rotate([-10, 0]).fitWidth(W, { type: 'Sphere' });
const top = proj([10, 83.7])[1], bottom = proj([10, -56])[1];
proj.translate([proj.translate()[0], proj.translate()[1] - top]);
const H = Math.ceil(bottom - top);
proj.clipExtent([[0, 0], [W, H]]);
const world = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const states = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json'));
const units = JSON.parse(fs.readFileSync('../ne/ne_10m_admin_0_map_units.geojson'));
const adm1 = JSON.parse(fs.readFileSync('../ne/ne_10m_admin_1.geojson'));
const POSTAL = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY' };

const countries = {}, subs = {}, names = {};
for (const f of feature(world, world.objects.countries).features) {
  if (['840', '826', '484', '010'].includes(f.id)) continue;
  // places with no ISO code (Somaliland, Kosovo, Northern Cyprus...) get a key from their name
  const k = f.id ? 'C' + f.id : 'X' + f.properties.name.replace(/[^A-Za-z]/g, ''); countries[k] = f; names[k] = f.properties.name;
}
for (const f of feature(states, states.objects.states).features) {
  const p = POSTAL[f.properties.name]; if (!p) continue;
  subs['US-' + p] = f; names['US-' + p] = f.properties.name;
}
const UKN = { ENG: ['GB-ENG', 'England'], SCT: ['GB-SCO', 'Scotland'], WLS: ['GB-WAL', 'Wales'], NIR: ['GB-NIR', 'Northern Ireland'] };
for (const f of units.features) { const u = UKN[f.properties.SU_A3]; if (u) { subs[u[0]] = f; names[u[0]] = u[1]; } }
// Mexico split into its 32 states
const MXN = { DIF: ['CMX', 'Mexico City'], MEX: ['MEX', 'State of Mexico'] };
for (const f of adm1.features) { const p = f.properties; if (p.adm0_a3 !== 'MEX' || !p.iso_3166_2 || p.iso_3166_2.includes('~')) continue; const c = p.iso_3166_2.slice(3), [k, n] = MXN[c] || [c, p.name]; subs['MX-' + k] = f; names['MX-' + k] = n; }

function build(fc, weight, dg, minA) {
  const projected = {};
  for (const [k, f] of Object.entries(fc)) { const g = geoProject({ type: 'Feature', properties: {}, geometry: f.geometry }, proj); if (g && g.geometry) projected[k] = g; }
  const t = simplify(presimplify(topology(projected, 2e5)), weight);
  const path = geoPath(null).digits(dg), out = {};
  for (const k of Object.keys(projected)) {
    const f0 = feature(t, t.objects[k]);
    let polys = f0.geometry.type === 'Polygon' ? [f0.geometry.coordinates] : f0.geometry.coordinates;
    const keep = polys.filter(c => path.area({ type: 'Polygon', coordinates: c }) > minA);
    if (keep.length) polys = keep;
    const f = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polys } }, d = path(f); if (!d) continue;
    const big = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => path.area(b) - path.area(a))[0];
    const bb = path.bounds(big);
    out[k] = { d, c: path.centroid(big).map(v => +v.toFixed(2)), b: bb.flat().map(v => +v.toFixed(1)), n: names[k] };
  }
  return out;
}
const C = build(countries, 0.1, 1, 0.04), S = build(subs, 0.0015, 2, 0.0005);
const sphere = `M0,0H${W}V${H}H0Z`;
const out = { vb: [W, H], sphere, countries: C, subs: S };
fs.writeFileSync('world.json', JSON.stringify(out));
console.log(W, H, Object.keys(C).length, Object.keys(S).length, JSON.stringify(out).length, JSON.stringify(C).length, JSON.stringify(S).length);
