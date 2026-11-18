// "Field notes" basemap: field-paper land, pale sky water, soft green parks and paper-white extruded
// buildings, drawn from OpenFreeMap's open vector tiles (OpenMapTiles schema, no key).

const C = {
  paper: "#F4F6F1",
  park: "#D9F0CC",
  water: "#BFE3FA",
  waterLine: "#8FD0FA",
  road: "#FFFFFF",
  roadCase: "#E6E9E2",
  major: "#FFFFFF",
  rail: "#B3BCB5",
  model: "#FAFBF8",
  label: "#5E6B63",
  labelHalo: "#F4F6F1",
};

export function mapStyle() {
  const lineW = (base, k = 1) => ["interpolate", ["exponential", 1.6], ["zoom"], 10, base * 0.3 * k, 14, base * k, 18, base * 6 * k];
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": C.paper } },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland"]]],
        paint: { "fill-color": C.park, "fill-opacity": 0.7 },
      },
      {
        id: "landuse-park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": C.park, "fill-opacity": 0.8 },
      },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": C.water } },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        paint: { "line-color": C.waterLine, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 3] },
      },
      {
        id: "road-case",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.roadCase, "line-width": lineW(2.6) },
      },
      {
        id: "road-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "track", "path"]]],
        minzoom: 12,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.road, "line-width": lineW(1.2), "line-opacity": 0.9 },
      },
      {
        id: "road-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.major, "line-width": lineW(2) },
      },
      {
        id: "rail",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["==", ["get", "class"], "rail"],
        paint: { "line-color": C.rail, "line-width": 1, "line-dasharray": [3, 3] },
      },
      {
        id: "building",
        type: "fill-extrusion",
        source: "omt",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#E6ECFE", 8, "#CBD6FA", 20, "#9EAFF2", 45, "#6A84EC", 90, "#2448D8", 180, "#16246F"],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, 0.9],
          "fill-extrusion-vertical-gradient": true,
        },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "quarter", "town", "village"]]],
        layout: {
          "text-field": ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 15, 12],
          "text-letter-spacing": 0.08,
          "text-max-width": 8,
        },
        paint: { "text-color": C.label, "text-halo-color": C.labelHalo, "text-halo-width": 1.4 },
      },
      {
        id: "road-label",
        type: "symbol",
        source: "omt",
        "source-layer": "transportation_name",
        minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": 10.5,
        },
        paint: { "text-color": "#8A958D", "text-halo-color": C.road, "text-halo-width": 1.2 },
      },
    ],
  };
}
