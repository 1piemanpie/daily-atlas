// The projections behind each regional map, rebuilt exactly as the map scripts set them up,
// so other data (landmark hints, satellite imagery) lands in the same map coordinates.
import { geoAlbersUsa, geoConicConformal, geoPath } from 'd3-geo';

// us-atlas's states-albers-10m: geoAlbersUsa().scale(1300).translate([487.5, 305]) on a 975x610 viewBox
export const us = geoAlbersUsa().scale(1300).translate([487.5, 305]);

const ukBox = { type: 'MultiPoint', coordinates: [[-12, 42.5], [-12, 62.4], [19, 62.4], [19, 42.5], [3.5, 63], [3.5, 42]] };
export const uk = geoConicConformal().parallels([50, 60]).rotate([-3.5, 0]).fitWidth(800, ukBox);

const mxBox = { type: 'MultiPoint', coordinates: [[-117.5, 6.8], [-117.5, 33], [-59, 33], [-59, 6.8], [-88, 33.6], [-88, 6.2]] };
export const mx = geoConicConformal().parallels([12, 28]).rotate([88, 0]).fitWidth(800, mxBox);

export const params = p => ({ scale: p.scale(), translate: p.translate(), rotate: p.rotate(), parallels: p.parallels ? p.parallels() : null });
export { geoPath };
