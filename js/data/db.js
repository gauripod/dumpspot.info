// Database access. The schema is unchanged from v1:
//   reports(id, reporter, state, area, specific, type[], cats[], sev[], notes, lat, lng, digipin, pluscode, ts)
//   report_photos(report_id, url, position)
//   storage bucket "report-photos" at <id>/<n>.webp
// This module only SELECTs and INSERTs. It never updates or deletes a row.
// Points, trees, levels and cities are all derived in the browser from these rows,
// so the revamp needs no migration and cannot lose data.


let client = null;
function db() {
  if (!client) client = window.supabase.createClient(`${location.origin}/sb`, "public");
  return client;
}


export async function fetchReports() {
  try {
    const { data, error } = await db()
      .from("reports")
      .select("*, report_photos(url, position)")
      .order("ts", { ascending: false });
    if (error) throw error;
    return { sample: false, rows: data.map(shape) };
  } catch (e) {
    const err = new Error("offline");
    err.cause = e;
    throw err;
  }
}

function shape(r) {
  return {
    ...r,
    type: r.type || [],
    cats: r.cats || [],
    sev: r.sev || [],
    photos: (r.report_photos || []).sort((a, b) => a.position - b.position).map((p) => p.url),
  };
}

export async function uploadPhotos(id, files, onStep) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    onStep && onStep(i + 1, files.length);
    const path = `${id}/${i + 1}.webp`;
    const { error } = await db().storage.from("report-photos").upload(path, files[i], { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const { data } = db().storage.from("report-photos").getPublicUrl(path);
    out.push({ url: data.publicUrl, position: i + 1 });
  }
  return out;
}

// Exactly the v1 insert payload: same columns, same types.
export async function insertReport(row, photos) {
  const { error } = await db().from("reports").insert(row);
  if (error) throw error;
  const { error: pErr } = await db()
    .from("report_photos")
    .insert(photos.map((p) => ({ report_id: row.id, url: p.url, position: p.position })));
  if (pErr) throw pErr;
}
