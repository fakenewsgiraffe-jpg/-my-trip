/* =========================================================
   My Trip Tool (Leaflet版 / Dark + Neon v2026-01)
   - クレカ不要
   - ダークマップ + ネオン路線
   - 観光POIを種類別カラーで表示
========================================================= */

const RAIL_COLORS = { /* ← あなたの現行定義そのまま */ 
  "山手線": "#9ACD32",
  "京浜東北線": "#00B2E5",
  "根岸線": "#00B2E5",
  "中央線快速": "#F15A22",
  "中央・総武線": "#FFD400",
  "湘南新宿ライン": "#E31F26",
  "上野東京ライン": "#91278F",
  "東海道線": "#F0862B",
  "ゆりかもめ": "#E97119"
};

const FILES = {
  railway: "railway.json",
  stations: "Station.json"
};

let map;
let railLayer, railGlowLayer;
let stationLayer;
let poiLayer = L.layerGroup();

/* =========================
   初期化
========================= */
document.addEventListener("DOMContentLoaded", init);

function init() {
  map = L.map("map", { zoomControl: false }).setView([35.6812, 139.7671], 12);

  // ダーク＆情報少なめ
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "&copy; OSM & CARTO" }
  ).addTo(map);

  loadRailways();
  loadStations();

  map.on("click", e => {
    showPOI(e.latlng);
    updatePos(e.latlng);
  });
}

/* =========================
   路線（ネオン）
========================= */
function loadRailways() {
  fetch(FILES.railway).then(r => r.json()).then(geo => {

    railGlowLayer = L.geoJSON(geo, {
      style: f => ({
        color: colorFor(f),
        weight: 8,
        opacity: 0.35
      })
    });

    railLayer = L.geoJSON(geo, {
      style: f => ({
        color: colorFor(f),
        weight: 3,
        opacity: 0.95
      })
    });

    railGlowLayer.addTo(map);
    railLayer.addTo(map);
  });
}

function colorFor(feature) {
  const name =
    feature.properties?.N02_003 ||
    feature.properties?.name ||
    "";
  for (const k in RAIL_COLORS) {
    if (name.includes(k)) return RAIL_COLORS[k];
  }
  return "#888";
}

/* =========================
   駅（控えめ）
========================= */
function loadStations() {
  fetch(FILES.stations).then(r => r.json()).then(data => {
    stationLayer = L.geoJSON(data, {
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 1.5,
          opacity: 0.6,
          fillOpacity: 0.4
        })
    }).addTo(map);
  });
}

/* =========================
   観光POI（色付き）
========================= */
function showPOI(latlng) {
  poiLayer.clearLayers();
  poiLayer.addTo(map);

  const query = `
[out:json][timeout:10];
(
 node(around:500,${latlng.lat},${latlng.lng})[tourism];
 node(around:500,${latlng.lat},${latlng.lng})[amenity=cafe];
 node(around:500,${latlng.lat},${latlng.lng})[amenity=restaurant];
 node(around:500,${latlng.lat},${latlng.lng})[amenity=bar];
);
out 20;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
    .then(r => r.json())
    .then(json => {
      json.elements.forEach(p => {
        const type = p.tags.tourism || p.tags.amenity;
        const icon = poiIcon(type);
        L.marker([p.lat, p.lon], { icon })
          .bindPopup(`<b>${p.tags.name || "名称不明"}</b><br>${type}`)
          .addTo(poiLayer);
      });
    });
}

function poiIcon(type) {
  const colors = {
    attraction: "#4dd0e1",
    cafe: "#ffca28",
    restaurant: "#ff7043",
    bar: "#ba68c8",
    museum: "#81c784"
  };
  const c = colors[type] || "#90a4ae";
  return L.divIcon({
    className: "poi-icon",
    html: `<div style="background:${c}"></div>`
  });
}

/* =========================
   情報タブ用
========================= */
function updatePos(latlng) {
  const el = document.getElementById("pos-display");
  if (el) {
    el.textContent =
      `選択中: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
  }
}
