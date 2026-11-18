// Spam protection, ported unchanged from v1 app.js (text abuse list, gibberish, image checks, face detection).

export const ABUSE = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "rape",
  "raping",
  "raped",
  "molest",
  "ur mom",
  "your mom",
  "yo mama",
  "yo momma",
  "teri maa",
  "teri ma",
  "teri behen",
  "teri behan",
  "madarchod",
  "madarjaat",
  "bhenchod",
  "bhen ke",
  "bhenke",
  "behenchod",
  "chutiya",
  "chutiye",
  "chut",
  "lund",
  "gaand",
  "randi",
  "haramzada",
  "haramzadi",
  "haramkhor",
  "sala",
  "saala",
  "saali",
  "kamina",
  "kamine",
  "kaminey",
  "kutte",
  "kutiya",
  "mc",
  "bc",
  "mf",
  "stfu",
  "gtfo",
  "kys",
  "nsfw",
  "boobs",
  "tits",
  "naked",
  "nude",
  "porn",
  "sex",
  "sexy",
  "sexi",
  "horny",
  "boner",
  "lmao lmfao",
  "fake report",
  "nothing here",
  "bakwaas",
  "bekar",
  "faltu",
  "jhoot",
  "jhoothi",
  "jhootha",
  "bewakoof",
  "pagal",
  "ullu",
  "ulloo",
  "harami",
  "sala kutta",
  "suar",
  "suwar",
  "shiz",
  "shiit",
  "fuuk",
  "fuk",
  "fck",
  "azz",
  "a55",
  "b1tch",
  "fvck",
  "wtf",
  "wth",
  "shut up",
  "shutup",
  "idgaf",
  "idfc",
  "stfu",
  "gtfo",
  "kys",
  "tf",
  "bs",
  "pos",
  "nonsense",
  "rubbish",
  "this is stupid",
  "not real",
  "doesnt exist",
];

const GIBBERISH_PATTERNS = [
  /^(.)\1{3,}$/,
  /^[qwrtypsdfghjklzxcvbnm]{5,}$/i,
  /^[aeiou]{4,}$/i,
  /^(asdf|qwer|zxcv|hjkl|uiop|1234|abcd|wxyz)/i,
];

export function containsAbuse(str) {
  if (!str) return null;
  const s = str
    .toLowerCase()
    .replace(/[*@#!$%^&]/g, "")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/4/g, "a");
  for (const w of ABUSE) {
    if (s.includes(w)) return w;
  }
  return null;
}

export function isGibberish(str) {
  if (!str) return true;
  const s = str.trim();
  if (s.length <= 2) return true;
  for (const r of GIBBERISH_PATTERNS) {
    if (r.test(s)) return true;
  }
  const clean = s.toLowerCase().replace(/\s/g, "");
  if (clean.length > 6 && new Set(clean).size <= 2) return true;
  return false;
}

export function checkTextSpam(name, state, area, specific, notes) {
  const errors = [];
  const required = [
    { label: "reporter name", val: name },
    { label: "state", val: state },
    { label: "area", val: area },
    { label: "location", val: specific },
  ];
  for (const f of required) {
    const abuse = containsAbuse(f.val);
    if (abuse) {
      errors.push(f.label + " contains inappropriate language");
      continue;
    }
    if (isGibberish(f.val))
      errors.push(f.label + " does not look like a real value");
  }
  if (notes) {
    const notesAbuse = containsAbuse(notes);
    if (notesAbuse) errors.push("notes contain inappropriate language");
    const noteWords = notes.trim().split(/\s+/);
    const gibWords = noteWords.filter((w) => w.length > 2 && isGibberish(w));
    if (gibWords.length >= 1)
      errors.push(
        "notes appear to contain gibberish. Please describe what you see clearly",
      );
  }
  return errors;
}

async function analyseImage(file) {
  return new Promise(function (resolve) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      const W = 80,
        H = 80;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const total = W * H;

      const buckets = {};
      const greys = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];

        const grey = Math.round((r + g + b) / 3);
        greys.push(grey);
        const key =
          Math.round(r / 32) * 32 +
          "," +
          Math.round(g / 32) * 32 +
          "," +
          Math.round(b / 32) * 32;
        buckets[key] = (buckets[key] || 0) + 1;
      }
      const topBucket = Math.max.apply(null, Object.values(buckets));
      const dominance = topBucket / total;
      const mean =
        greys.reduce(function (a, b) {
          return a + b;
        }, 0) / greys.length;
      const variance =
        greys.reduce(function (a, v) {
          return a + Math.pow(v - mean, 2);
        }, 0) / greys.length;
      const issues = [];
      if (dominance > 0.75)
        issues.push("appears to be a blank or solid-colour image");
      if (variance < 100) issues.push("appears to have no real detail");
      const saturations = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];
        const mx = Math.max(r, g, b),
          mn = Math.min(r, g, b);
        saturations.push(mx === 0 ? 0 : (mx - mn) / mx);
      }
      const avgSat =
        saturations.reduce((a, b) => a + b, 0) / saturations.length;
      const highSatPx = saturations.filter((s) => s > 0.6).length / total;
      const veryHighSatPx = saturations.filter((s) => s > 0.85).length / total;
      const lowSatPx = saturations.filter((s) => s < 0.1).length / total;
      const isIllustration =
        (avgSat > 0.38 && highSatPx > 0.28 && variance > 300) ||
        (veryHighSatPx > 0.25 && lowSatPx > 0.3);
      if (isIllustration) {
        issues.push(
          "photo looks like an illustration or artwork. Please upload a real photo of the location",
        );
      }
      resolve({ ok: issues.length === 0, issues: issues });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve({ ok: true, issues: [] });
    };
    img.src = url;
  });
}

let faceApiReady = false;
let faceScript = null;
// face-api.js is ~1MB, so it is only fetched when someone submits photos.
function injectFaceApi() {
  if (typeof faceapi !== "undefined") return Promise.resolve(true);
  if (!faceScript)
    faceScript = new Promise((res) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
      s.onload = () => res(true);
      s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  return faceScript;
}
async function loadFaceApi() {
  if (faceApiReady) return true;
  await injectFaceApi();
  if (typeof faceapi === "undefined") return false;
  try {
    await Promise.race([
      faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models",
      ),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 8000),
      ),
    ]);
    faceApiReady = true;
    return true;
  } catch (e) {
    console.warn("[DumpSpot] face-api models failed to load:", e.message);
    return false;
  }
}

async function checkFaceInImage(file) {
  const loaded = await loadFaceApi();
  if (!loaded) return { ok: true };
  try {
    const img = await faceapi.bufferToImage(file);
    const det = await faceapi.detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }),
    );
    if (det.length > 0)
      return {
        ok: false,
        issues: [
          "photo appears to show a person. Please upload a photo of the location, not people",
        ],
      };
  } catch (e) {
    console.warn("[DumpSpot] face detection error:", e.message);
  }
  return { ok: true };
}

export async function checkAllImages(files) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const analysis = await analyseImage(files[i]);
    const face = await checkFaceInImage(files[i]);
    const issues = analysis.issues.concat(face.issues || []);
    if (issues.length) results.push({ index: i + 1, issues: issues });
  }
  return results;
}
