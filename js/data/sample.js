// Sample reports for local development when the database is unreachable.
// Only ever used on localhost (see db.js). Every id starts with "SAMPLE-".

import { seeded } from "../lib/util.js";
import { getLocationCode } from "../lib/geo.js";

const CITIES = [
  { state: "Karnataka", area: "Bengaluru Urban", lat: 12.9716, lng: 77.5946, n: 84,
    spots: ["Silk Board Junction", "Koramangala 5th Block", "Indiranagar 100ft Road", "KR Market", "Hebbal Flyover", "Bellandur Lake Road", "HSR Layout Sector 2", "Jayanagar 4th Block", "Whitefield Main Road", "Shivajinagar Bus Stand", "Yeshwanthpur Market", "Majestic Underpass"] },
  { state: "Delhi", area: "New Delhi", lat: 28.6139, lng: 77.209, n: 52,
    spots: ["Ghazipur Road", "Chandni Chowk", "Lajpat Nagar Market", "Yamuna Ghat", "Karol Bagh", "Okhla Phase 2", "Sarojini Nagar", "ITO Crossing"] },
  { state: "Maharashtra", area: "Mumbai", lat: 19.076, lng: 72.8777, n: 41,
    spots: ["Dharavi Main Road", "Mahim Creek", "Andheri Station West", "Kurla Depot", "Dadar Flower Market", "Bandra Reclamation", "Mithi River Bank"] },
  { state: "Maharashtra", area: "Pune", lat: 18.5204, lng: 73.8567, n: 23,
    spots: ["Mula River Bank", "Hadapsar Gadital", "Kothrud Depot", "Shivajinagar", "Swargate Chowk"] },
];
const NAMES = ["Asha", "Ravi K", "Meera", "Imran", "Priya S", "Arjun", "Nandini", "Kabir", "Lakshmi", "Dev", "Sana", "Tenzin", "Farah", "Vikram", "Ananya", "Joseph"];
const CATS = ["Plastic waste", "Food waste", "Construction", "Nala / Sewage", "Burning garbage", "E-waste", "Medical waste", "Animal waste", "Mixed / general"];
const TYPES = ["Road", "Footpath", "Nala / Drain", "Open plot", "Park", "Market", "Near school", "Near hospital", "Road encroachment"];
const SEV = ["Minor", "Moderate", "Severe", "Blocking road"];
const NOTES = ["Been piling up for over a week, strong smell in the evening.", "Stray dogs tearing bags open, spreading onto the footpath.", "Smoke every night around 9pm.", "Blocks half the lane, two-wheelers swerve into traffic.", "", "", "Next to a school gate, kids walk past it every morning."];

export function makeSample() {
  const rnd = seeded("dumpspot-sample-v2");
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const rows = [];
  let k = 0;
  for (const c of CITIES) {
    for (let i = 0; i < c.n; i++) {
      // clustered around a few hotspots
      const hot = Math.floor(rnd() * 5);
      const ha = (hot / 5) * Math.PI * 2;
      const hr = 0.03 + hot * 0.012;
      const lat = c.lat + Math.sin(ha) * hr + (rnd() - 0.5) * 0.04;
      const lng = c.lng + Math.cos(ha) * hr + (rnd() - 0.5) * 0.05;
      const age = Math.pow(rnd(), 2.2) * 200 * 86400000;
      const ts = new Date(now - age).toISOString();
      const cats = [pick(CATS)];
      if (rnd() > 0.6) cats.push(pick(CATS));
      const codes = getLocationCode(lat, lng);
      rows.push({
        id: `SAMPLE-${String(++k).padStart(4, "0")}`,
        reporter: pick(NAMES),
        state: c.state,
        area: c.area,
        specific: pick(c.spots),
        type: rnd() > 0.3 ? [pick(TYPES)] : [],
        cats: [...new Set(cats)],
        sev: rnd() > 0.25 ? [pick(SEV)] : [],
        notes: pick(NOTES),
        lat, lng,
        digipin: codes.digipin,
        pluscode: codes.pluscode,
        ts,
        photos: [],
      });
    }
  }
  return rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}
