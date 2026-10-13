function allowed(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin") return true;
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function tilePath(pathname) {
  const match = pathname.match(
    /^\/tiles\/(voyager|dark_all)\/(\d+)\/(\d+)\/(\d+)\.png$/,
  );
  if (!match) return null;
  return `${match[1]}/${match[2]}/${match[3]}/${match[4]}.png`;
}

export default async (request) => {
  if (!allowed(request)) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const tile = tilePath(url.pathname);
  if (tile) {
    const key = Netlify.env.get("CARTER_KEYS");
    if (!key) return new Response("Map is not configured", { status: 503 });
    const target = new URL(
      `https://basemaps.cartocdn.com/rastertiles/${tile}`,
    );
    target.searchParams.set("key", key);
    const upstream = await fetch(target);
    if (!upstream.ok) return new Response("Map tile failed", { status: 502 });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (url.pathname.startsWith("/sb/")) {
    const base = (Netlify.env.get("DB_URL") || "").replace(/\/$/, "");
    const key = Netlify.env.get("DB_KEY");
    if (!base || !key)
      return new Response("Database is not configured", { status: 503 });
    const target = `${base}/${url.pathname.slice(4)}${url.search}`;
    const headers = new Headers();
    for (const [name, value] of request.headers) {
      const lower = name.toLowerCase();
      if (
        ["host", "cookie", "content-length", "connection", "authorization", "apikey"].includes(
          lower,
        )
      )
        continue;
      headers.set(name, value);
    }
    headers.set("apikey", key);
    headers.set("authorization", `Bearer ${key}`);
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const out = new Headers(upstream.headers);
    out.delete("set-cookie");
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }

  return new Response("Not found", { status: 404 });
};
