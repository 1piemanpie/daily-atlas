// One zoomable world map: every country, split into its first-level subdivisions (states, provinces, regions...)
// Countries and subdivisions come from one shared topology (Natural Earth 10m admin-1), so their borders line up exactly.
// Where Natural Earth's admin-1 layer is finer than a country's real first level, units are merged (see GROUP_BY_REGION).
// Data: ne/ne_10m_admin_1_states_provinces.geojson and ne/ne_10m_admin_0_countries.geojson from
// https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
import fs from 'fs';
import { geoPath } from 'd3-geo';
import { geoProject, geoMiller } from 'd3-geo-projection';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, merge } from 'topojson-client';

const W = 1000;
// Miller cylindrical: meridians stay vertical, so the US and Europe sit level instead of leaning
const proj = geoMiller().rotate([-10, 0]).fitWidth(W, { type: 'Sphere' });
const top = proj([10, 83.7])[1], bottom = proj([10, -56])[1];
proj.translate([proj.translate()[0], proj.translate()[1] - top]);
const H = Math.ceil(bottom - top);
proj.clipExtent([[0, 0], [W, H]]);

const adm0 = JSON.parse(fs.readFileSync('../ne/ne_10m_admin_0_countries.geojson'));
const adm1 = JSON.parse(fs.readFileSync('../ne/ne_10m_admin_1_states_provinces.geojson'));

// country keys stay the ones the game already uses: C + ISO numeric code, or X + name for places without one
const NOISO = { KOS: 'XKosovo', CYN: 'XNCyprus', SOL: 'XSomaliland', KAS: 'XSiachenGlacier', IOA: 'XIndianOceanTer' };
const cKey = {}, cName = {};
for (const f of adm0.features) {
  const p = f.properties, n3 = [p.ISO_N3, p.ISO_N3_EH].find(v => v && v !== '-99' && +v > 0);
  cKey[p.ADM0_A3] = NOISO[p.ADM0_A3] || (n3 ? 'C' + String(n3).padStart(3, '0') : 'X' + p.NAME.replace(/[^A-Za-z]/g, ''));
  cName[p.ADM0_A3] = p.NAME;
}
const SKIP = new Set(['ATA']);
// tiny military enclaves are drawn as part of the country around them
const FOLD = { USG: 'CUB', ESB: 'CYP', WSB: 'CYP' }; // Antarctica sits below the map's bottom edge

// countries whose admin-1 units in Natural Earth are a level below their real first level: merge by the region field
const GROUP_BY_REGION = new Set(['ITA', 'FRA', 'ESP', 'SVN', 'LVA', 'PHL', 'UGA', 'MLT', 'LKA', 'AZE', 'KOS', 'BFA', 'GIN', 'MKD', 'MWI']);
const MXN = { DIF: ['CMX', 'Mexico City'], CMX: ['CMX', 'Mexico City'], MEX: ['MEX', 'State of Mexico'] };
const UKN = { England: ['GB-ENG', 'England'], Scotland: ['GB-SCO', 'Scotland'], Wales: ['GB-WAL', 'Wales'], 'Northern Ireland': ['GB-NIR', 'Northern Ireland'] };
// English names for merged regions, for a US English audience
const EN = { Piemonte: 'Piedmont', Lombardia: 'Lombardy', Toscana: 'Tuscany', Sardegna: 'Sardinia', 'Trentino-Alto Adige': 'Trentino-South Tyrol', "Valle d'Aosta": 'Aosta Valley',
  'Cataluña': 'Catalonia', 'Andalucía': 'Andalusia', 'País Vasco': 'Basque Country', 'Islas Baleares': 'Balearic Islands', 'Canary Is.': 'Canary Islands', Valenciana: 'Valencia',
  'Foral de Navarra': 'Navarre', 'Castilla y León': 'Castile and León', 'Castilla-La Mancha': 'Castile-La Mancha', 'Aragón': 'Aragon',
  Bretagne: 'Brittany', Normandie: 'Normandy', Corse: 'Corsica', 'Guyane française': 'French Guiana', 'Bourgogne-Franche-Comté': 'Burgundy-Franche-Comté',
  'Næ̆gĕnahira paḷāta': 'Eastern Province', 'Uturu paḷāta': 'Northern Province', 'Vayamba paḷāta': 'North Western Province', 'Basnāhira paḷāta': 'Western Province',
  'Dakuṇu paḷāta': 'Southern Province', 'Sabaragamuva paḷāta': 'Sabaragamuwa Province', 'Ūva paḷāta': 'Uva Province', 'Madhyama paḷāta': 'Central Province', 'Uturumæ̆da paḷāta': 'North Central Province' };
const slug = s => s.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').slice(0, 14);

function subKey(p) {
  const a3 = p.adm0_a3;
  if (a3 === 'GBR') return UKN[p.geonunit] || ['GB-ENG', 'England'];
  if (GROUP_BY_REGION.has(a3) && p.region) return [`${p.iso_a2 !== '-1' ? p.iso_a2 : a3}-R${slug(p.region)}`, EN[p.region] || p.region];
  const iso = p.iso_3166_2 && !p.iso_3166_2.includes('~') && p.iso_3166_2.length > 3 ? p.iso_3166_2 : null;
  if (a3 === 'MEX' && iso) { const c = iso.slice(3), [k, n] = MXN[c] || [c, p.name]; return ['MX-' + k, n]; }
  return [iso || p.adm1_code, p.name_en || p.name || p.gn_name || p.adm1_code];
}

// one topology of every admin-1 unit, projected first so simplification works in screen units
const geoms = {}, meta = {};
let i = 0;
for (const f of adm1.features) {
  const p = { ...f.properties, adm0_a3: FOLD[f.properties.adm0_a3] || f.properties.adm0_a3 };
  if (SKIP.has(p.adm0_a3) || !cKey[p.adm0_a3]) continue;
  const g = geoProject({ type: 'Feature', properties: {}, geometry: f.geometry }, proj);
  if (!g || !g.geometry) continue;
  const id = 'u' + i++;
  geoms[id] = g.geometry;
  const [sk, sn] = subKey(p);
  meta[id] = { c: cKey[p.adm0_a3], cn: cName[p.adm0_a3], sk, sn, g: GROUP_BY_REGION.has(p.adm0_a3) ? null : p.region };
}
const WEIGHT = +(process.env.WEIGHT || 0.03);
const topo = simplify(presimplify(topology({ all: { type: 'FeatureCollection', features: Object.entries(geoms).map(([id, g]) => ({ type: 'Feature', id, properties: {}, geometry: g })) } }, 4e5)), WEIGHT);
const geomsRaw = geoms;
const geomById = Object.fromEntries(topo.objects.all.geometries.map(g => [g.id, g]));

const path = geoPath(null).digits(1);
// compact SVG path: absolute start, then relative moves, one decimal, no repeated points
const num = v => { const s = (Math.round(v * 10) / 10).toString(); return s.replace(/^(-?)0\./, '$1.'); };
function compact(polys) {
  let out = '';
  for (const poly of polys) for (const ring of poly) {
    let px = Math.round(ring[0][0] * 10), py = Math.round(ring[0][1] * 10), seg = '', n = 0;
    for (let k = 1; k < ring.length - 1; k++) {
      const x = Math.round(ring[k][0] * 10), y = Math.round(ring[k][1] * 10);
      if (x === px && y === py) continue;
      const dx = num((x - px) / 10), dy = num((y - py) / 10);
      seg += (seg && !dx.startsWith('-') ? ' ' : '') + dx + (dy.startsWith('-') ? '' : ' ') + dy;
      px = x; py = y; n++;
    }
    if (n < 2) continue; // rings that collapse to a point or a line at this scale
    out += `M${num(ring[0][0])} ${num(ring[0][1])}l${seg}z`;
  }
  return out;
}
function shape(geoms, name, minA, extra = {}) {
  const m = merge(topo, geoms.map(id => geomById[id]).filter(g => g && g.type));
  let polys = m.coordinates;
  const keep = polys.filter(c => path.area({ type: 'Polygon', coordinates: c }) > minA);
  if (keep.length) polys = keep;
  let d = compact(polys);
  if (!d) {
    // islands smaller than the map's detail still get a small dot, so they can be seen and tapped
    const [[x0, y0], [x1, y1]] = path.bounds({ type: 'GeometryCollection', geometries: geoms.map(id => geomsRaw[id]) }), r = .5;
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    if (!isFinite(x)) return null;
    d = `M${num(x - r)} ${num(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
    return { d, c: [+x.toFixed(2), +y.toFixed(2)], b: [x - r, y - r, x + r, y + r].map(v => +v.toFixed(1)), n: name, ...extra };
  }
  const big = polys.map(c => ({ type: 'Polygon', coordinates: c })).sort((a, b) => path.area(b) - path.area(a))[0];
  return { d, c: path.centroid(big).map(v => +v.toFixed(2)), b: path.bounds(big).flat().map(v => +v.toFixed(1)), n: name, ...extra };
}
const byCountry = {}, bySub = {};
for (const [id, m] of Object.entries(meta)) {
  (byCountry[m.c] ||= { n: m.cn, ids: [] }).ids.push(id);
  (bySub[m.sk] ||= { n: m.sn, c: m.c, g: m.g, ids: [] }).ids.push(id);
}
const countries = {}, subs = {};
for (const [k, v] of Object.entries(byCountry)) { const s = shape(v.ids, v.n, 0.02); if (s) countries[k] = s; }
for (const [k, v] of Object.entries(bySub)) {
  if (byCountry[v.c].ids.length < 2 || Object.values(bySub).filter(s => s.c === v.c).length < 2) continue; // no split for one-unit countries
  const s = shape(v.ids, v.n, 0.0004, v.g ? { p: v.c, g: v.g } : { p: v.c }); if (s) subs[k] = s;
}
// subdivisions of countries the game has visited so far ship inside the page; the rest load from data/world-subs.json
const INLINE = ['US-', 'GB-', 'MX-'];
const inline = {}, lazy = {};
for (const [k, v] of Object.entries(subs)) (INLINE.some(p => k.startsWith(p)) ? inline : lazy)[k] = v;
const out = { vb: [W, H], sphere: `M0,0H${W}V${H}H0Z`, countries, subs: inline };
fs.writeFileSync('world.json', JSON.stringify(out));
fs.mkdirSync('../data', { recursive: true });
fs.writeFileSync('../data/world-subs.json', JSON.stringify(lazy));
console.log(W, H, 'countries', Object.keys(countries).length, 'subs', Object.keys(subs).length, 'page bytes', JSON.stringify(out).length, 'lazy bytes', JSON.stringify(lazy).length);
