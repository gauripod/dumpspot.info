// Location encoding (DigiPin, Plus Code), distance, bounds and hex binning.

const DIGIPIN_GRID = [
  ["F", "C", "9", "8"],
  ["J", "3", "2", "7"],
  ["K", "4", "5", "6"],
  ["L", "M", "P", "T"],
];

export function encodeDigipin(lat, lng) {
  if (lat < 2.5 || lat > 38.5 || lng < 63.5 || lng > 99.5) return null;
  let minLat = 2.5, maxLat = 38.5, minLng = 63.5, maxLng = 99.5;
  let pin = "";
  for (let level = 0; level < 10; level++) {
    const latDiv = (maxLat - minLat) / 4;
    const lngDiv = (maxLng - minLng) / 4;
    let row = 3 - Math.floor((lat - minLat) / latDiv);
    let col = Math.floor((lng - minLng) / lngDiv);
    row = Math.max(0, Math.min(row, 3));
    col = Math.max(0, Math.min(col, 3));
    pin += DIGIPIN_GRID[row][col];
    maxLat = minLat + latDiv * (4 - row);
    minLat = minLat + latDiv * (3 - row);
    minLng = minLng + lngDiv * col;
    maxLng = minLng + lngDiv;
  }
  return pin;
}

export const formatDigipin = (pin) => (pin ? pin.slice(0, 3) + "-" + pin.slice(3, 6) + "-" + pin.slice(6) : "");

export function encodePlusCode(lat, lng) {
  try {
    const A = "23456789CFGHJMPQRVWX";
    lat = Math.max(-90, Math.min(90, lat));
    lng = Math.max(-180, Math.min(180, lng));
    if (lat === 90) lat -= 1e-7;
    let av = Math.floor((lat + 90) * 8000);
    let lv = Math.floor((lng + 180) * 8000);
    let latCode = "", lngCode = "";
    for (let i = 0; i < 5; i++) {
      latCode = A[av % 20] + latCode;
      av = Math.floor(av / 20);
      lngCode = A[lv % 20] + lngCode;
      lv = Math.floor(lv / 20);
    }
    let code = "";
    for (let i = 0; i < 5; i++) code += latCode[i] + lngCode[i];
    return code.slice(0, 8) + "+" + code.slice(8, 13);
  } catch {
    return null;
  }
}

export const getLocationCode = (lat, lng) => ({ digipin: encodeDigipin(lat, lng), pluscode: encodePlusCode(lat, lng) });

export function haversine(a, b) {
  const R = 6371;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// bbox = [west, south, east, north]
export function padBBox(b, k = 0.15) {
  const dx = (b[2] - b[0]) * k, dy = (b[3] - b[1]) * k;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
}

export function bboxAround(lat, lng, km) {
  const dLat = km / 110.54;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

export const inBBox = (b, lat, lng) => lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];

// Is a report inside the chosen city? Padded bbox or within radius of centre.
export function inCity(city, r) {
  if (!city || r.lat == null || r.lng == null) return false;
  if (city.bbox && inBBox(padBBox(city.bbox, 0.12), r.lat, r.lng)) return true;
  return haversine(city, r) <= (city.radiusKm || 18);
}

// Pointy-top hex bins in local metres around an origin. Returns GeoJSON features.
export function hexBin(points, origin, sizeM = 420) {
  const kx = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  const ky = 110540;
  const S3 = Math.sqrt(3);
  const bins = new Map();
  for (const p of points) {
    const x = (p.lng - origin.lng) * kx;
    const y = (p.lat - origin.lat) * ky;
    let q = ((S3 / 3) * x - (1 / 3) * y) / sizeM;
    let r = ((2 / 3) * y) / sizeM;
    let s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const key = rq + "," + rr;
    if (!bins.has(key)) bins.set(key, { q: rq, r: rr, items: [] });
    bins.get(key).items.push(p);
  }
  const feats = [];
  for (const b of bins.values()) {
    const cx = sizeM * (S3 * b.q + (S3 / 2) * b.r);
    const cy = sizeM * (1.5 * b.r);
    const ring = [];
    for (let i = 0; i <= 6; i++) {
      const a = ((60 * (i % 6) - 30) * Math.PI) / 180;
      const rr = sizeM * 0.86;
      ring.push([origin.lng + (cx + rr * Math.cos(a)) / kx, origin.lat + (cy + rr * Math.sin(a)) / ky]);
    }
    feats.push({ ring, center: [origin.lng + cx / kx, origin.lat + cy / ky], items: b.items });
  }
  return feats;
}
