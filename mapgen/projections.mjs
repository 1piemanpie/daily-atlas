// The projections behind each regional map, rebuilt exactly as the map scripts set them up,
// so other data (landmark hints, satellite imagery) lands in the same map coordinates.
import { geoAlbersUsa, geoConicConformal, geoPath } from 'd3-geo';

// us-atlas's states-albers-10m: geoAlbersUsa().scale(1300).translate([487.5, 305]) on a 975x610 viewBox
export const us = geoAlbersUsa().scale(1300).translate([487.5, 305]);

const ukBox = { type: 'MultiPoint', coordinates: [[-12, 42.5], [-12, 62.4], [19, 62.4], [19, 42.5], [3.5, 63], [3.5, 42]] };
export const uk = geoConicConformal().parallels([50, 60]).rotate([-3.5, 0]).fitWidth(800, ukBox);

const mxBox = { type: 'MultiPoint', coordinates: [[-117.5, 6.8], [-117.5, 33], [-59, 33], [-59, 6.8], [-88, 33.6], [-88, 6.2]] };
export const mx = geoConicConformal().parallels([12, 28]).rotate([88, 0]).fitWidth(800, mxBox);

const inBox = { type: 'MultiPoint', coordinates: [[61, 5.5], [61, 37.5], [97.5, 37.5], [97.5, 5.5], [79, 38.2], [79, 5]] };
export const india = geoConicConformal().parallels([12, 30]).rotate([-79, 0]).fitWidth(800, inBox);

const caBox = { type: 'MultiPoint', coordinates: [[-168, 54], [-168, 70], [-141, 72], [-120, 79], [-90, 83], [-62, 83], [-52, 47], [-75, 39], [-95, 40], [-124, 40]] };
export const canada = geoConicConformal().parallels([49, 77]).rotate([96, 0]).fitWidth(800, caBox);

const cnBox = { type: 'MultiPoint', coordinates: [[72, 17], [72, 54], [136, 54], [136, 17], [104, 55], [104, 15]] };
export const china = geoConicConformal().parallels([25, 47]).rotate([-104, 0]).fitWidth(800, cnBox);

const itBox = { type: 'MultiPoint', coordinates: [[5.5, 35.3], [5.5, 47.6], [19.5, 47.6], [19.5, 35.3], [12.5, 48], [12.5, 35]] };
export const italy = geoConicConformal().parallels([38, 46]).rotate([-12.5, 0]).fitWidth(800, itBox);

const jpBox = { type: 'MultiPoint', coordinates: [[119.8, 21.8], [119.8, 46.3], [146.5, 46.3], [146.5, 21.8], [133, 46.8], [133, 21.5]] };
export const japan = geoConicConformal().parallels([28, 42]).rotate([-133, 0]).fitWidth(800, jpBox);

export const params = p => ({ scale: p.scale(), translate: p.translate(), rotate: p.rotate(), parallels: p.parallels ? p.parallels() : null });
export { geoPath };
