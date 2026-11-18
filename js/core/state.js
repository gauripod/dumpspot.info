// App state + a tiny event bus. Views subscribe to "data" (rows or city changed)
// and "filter" (category / time range changed).

import { store } from "../lib/util.js";
import { inCity } from "../lib/geo.js";
import { buildPeople, buildTrees, normName } from "../data/derive.js";

const subs = {};
export const on = (e, fn) => (subs[e] ||= []).push(fn);
export const emit = (e, d) => (subs[e] || []).forEach((fn) => fn(d));

export const S = {
  all: [],
  city: store.get("ds.city"),
  inCity: [],
  filtered: [],
  cats: new Set(),
  range: null, // [t0, t1] ms
  query: "",
  sample: false,
  people: new Map(),
  reportPts: new Map(),
  trees: [],
  treeById: new Map(),
  me: store.get("ds.me", { name: "", ids: [] }),
};

export function setRows(rows, sample) {
  S.all = rows;
  S.sample = !!sample;
  const { people, reportPts } = buildPeople(rows);
  S.people = people;
  S.reportPts = reportPts;
  S.trees = buildTrees(rows);
  S.treeById = new Map(S.trees.map((t) => [t.id, t]));
  scope();
  emit("data");
}

export function setCity(city) {
  S.city = city;
  store.set("ds.city", city);
  S.range = null;
  S.cats.clear();
  scope();
  emit("city");
  emit("data");
}

function scope() {
  S.inCity = S.city ? S.all.filter((r) => inCity(S.city, r)) : [];
  applyFilters(false);
}

export function applyFilters(fire = true) {
  const q = S.query.trim().toLowerCase();
  S.filtered = S.inCity.filter((r) => {
    if (S.cats.size && !(r.cats || []).some((c) => S.cats.has(c))) return false;
    if (S.range) {
      const t = new Date(r.ts).getTime();
      if (t < S.range[0] || t > S.range[1]) return false;
    }
    if (q && !`${r.specific} ${r.area} ${r.reporter} ${r.id} ${(r.cats || []).join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (fire) emit("filter");
}

export function toggleCat(key) {
  S.cats.has(key) ? S.cats.delete(key) : S.cats.add(key);
  applyFilters();
}

export function setRange(r) {
  S.range = r;
  applyFilters();
}

export function rememberMe(name, id) {
  const me = S.me && normName(S.me.name) === normName(name) ? S.me : { name, ids: [] };
  me.name = name;
  if (id && !me.ids.includes(id)) me.ids.push(id);
  S.me = me;
  store.set("ds.me", me);
}

export const myPerson = () => (S.me?.name ? S.people.get(normName(S.me.name)) : null);
