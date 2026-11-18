// Pictograms: Phosphor Icons (MIT), duotone weight (the fill layer takes the brand blue), loaded as a web font in index.html. Used sparingly.
const ph = (n) => `<i class="ph-duotone ph-${n}" aria-hidden="true"></i>`;

const NAMES = {
  // categories
  bag: "bag-simple",
  food: "bowl-food",
  wall: "wall",
  drop: "waves",
  flame: "fire",
  chip: "cpu",
  pill: "pill",
  paw: "paw-print",
  bin: "trash",
  // ui
  photo: "image",
  pin: "map-pin",
  tree: "tree",
  plus: "plus",
  close: "x",
  arrow: "arrow-right",
  back: "arrow-left",
  search: "magnifying-glass",
  target: "crosshair",
  locate: "gps",
  share: "share-network",
  ext: "arrow-square-out",
  cube: "cube",
  layers: "stack",
  upload: "upload-simple",
  check: "check",
  copy: "copy",
  spark: "binoculars",
  compass: "compass",
  list: "list",
  map: "map-trifold",
  user: "user-circle",
  flask: "flask",
  book: "book-open-text",
  more: "dots-three-outline",
  down: "caret-down",
  recycle: "recycle",
  air: "wind",
  rain: "cloud-rain",
  csv: "file-csv",
  chart: "chart-bar",
  globe: "globe-hemisphere-east",
  camera: "camera",
  info: "info",
  palette: "palette",
  code: "code",
  warning: "warning-circle",
};

export const ICONS = new Proxy({}, { get: (_, k) => ph(NAMES[k] || k) });

import { catMeta } from "../data/derive.js";
export const catIcon = (key) => ICONS[catMeta(key).icon];
