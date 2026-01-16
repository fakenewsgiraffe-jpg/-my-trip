/* =========================================================
   My Trip Tool (Leaflet版 / v2026-01)
   - Leaflet + OpenStreetMap
   - railway.json + Station.json を描画
   - My Maps は iframe 埋め込み（そのまま）
   - 地図クリック：
       1) 座標を情報タブに反映
       2) 近くの観光POIを取得してポップアップ表示（Overpass API）
========================================================= */

/* ====== あなたの RAIL_COLORS（必要なら増やしてOK） ====== */
const RAIL_COLORS = {
  "東海道線": "#F0862B",
  "伊東線": "#008803",
  "上野東京ライン": "#91278F",
  "横須賀線,総武快速線": "#007AC1",
  "湘南新宿ライン": "#E31F26",
  "京浜東北線,根岸線": "#00B2E5",
  "横浜線": "#80C342",
  "南武線,鶴見線": "#FFD400",
  "山手線": "#b1cb39",
  "中央快速線,青梅線,五日市線": "#F15A22",
  "中央・総武線": "#FFD400",
  "宇都宮線,高崎線": "#F68B1E",
  "埼京・川越線": "#00AC84",
  "JR・相鉄直通線": "#002971",
  "常磐快速線": "#36AE6E",
  "常磐緩行線": "#339999",
  "京葉線": "#C9252F",
  "武蔵野線": "#F15A22",
  "総武本線": "#FFD400",
  "成田線": "#00B261",
  "成田線我孫子支線": "#36AE6E",
  "内房線": "#00B2E5",
  "外房線": "#DB4028",
  "相模線": "#009793",
  "信越本線": "#00AAEE",
  "白新線": "#F387B7",
  "東北本線(東北エリア)": "#3CB371",
  "羽越本線": "#16C0E9",
  "磐越西線": "#CB7B35",
  "只見線": "#008DD1",
  "仙石線": "#00AAEE",
  "仙山線": "#72BC4A",
  "JR東海": "#ED6D00",
  "東海道新幹線": "#0072BA",
  "御殿場線": "#40743C",
  "飯田線": "#75A2DB",
  "東京メトロ": "#00A3D9",
  "丸ノ内線": "#F62E36",
  "銀座線": "#FF9500",
  "東西線": "#009BBF",
  "千代田線": "#00BB85",
  "副都心線": "#9C5E31",
  "都営地下鉄": "#199332",
  "大江戸線": "#CE045B",
  "横浜市営ブルーライン": "#0070C0",
  "横浜市営グリーンライン": "#00B050",
  "東武鉄道": "#005BAC",
  "スカイツリーライン": "#0F6CC3",
  "伊勢崎線": "#FF0000",
  "西武池袋線": "#FF6600",
  "西武新宿線": "#0099CC",
  "京王電鉄": "#C8006B",
  "京王井の頭線": "#00377E",
  "小田急電鉄": "#0D82C7",
  "東急電鉄": "#DA0442",
  "東急東横線": "#DA0442",
  "東急田園都市線": "#20A288",
  "京急電鉄": "#00A3E4",
  "相模鉄道": "#000080",
  "りんかい線": "#00418E",
  "つくばエクスプレス": "#000080",
  "東葉高速線": "#3FB036",
  "みなとみらい線": "#09357F",
  "多摩都市モノレール線": "#E97119",
  "ゆりかもめ": "#E97119"
};

/* ====== Files ====== */
const FILES = {
  railway: "railway.json",
  stations: "Station.json",
  defaultKml: "mymap.kml", // iframe埋め込みでは使わないが残してOK
};

const DEFAULT_MYMAP_URL =
  "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

/* ====== Region Filter（元の意図をなるべく維持） ====== */
const BBOX_HONSHU = { minLng: 135.0, minLat: 34.0, maxLng: 142.5, maxLat: 41.9 };
const BBOX_TOKAI_SHIZUOKA_AICHI = { minLng: 137.0, minLat: 34.5, maxLng: 138.9, maxLat: 35.8 };
const BBOX_KANTO = { minLng: 138.4, minLat: 34.8, maxLng: 141.2, maxLat: 37.2 };

const JR_EAST = "東日本旅客鉄道";
const JR_CENTRAL = "東海旅客鉄道";

const KANTO_PRIVATE = new Set([
  "東武鉄道",
  "西武鉄道",
  "京王電鉄",
  "小田急電鉄",
  "東急電鉄",
  "京急電鉄",
  "相模鉄道",
  "東京メトロ",
  "東京都交通局",
  "横浜市交通局",
  "横浜高速鉄道",
  "東京臨海高速鉄道",
  "首都圏新都市鉄道",
  "東葉高速鉄道",
  "多摩都市モノレール",
  "ゆりかもめ",
]);

/* ---------- Utilities ---------- */
function norm(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/　/g, "")
    .replace(/／/g, "/")
    .replace(/，/g, ",")
    .trim();
}
function splitCSV(s) {
  return String(s || "").split(",").map(x => x.trim()).filter(Boolean);
}
function inBbox(lng, lat, b) {
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}
function hashColor(str) {
  const s = String(str || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const c = (h & 0xffffff).toString(16).padStart(6, "0");
  return `#${c}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

/* ---------- App State ---------- */
let map;
let baseLayer;

let railLayer = null;
let stationLayer = null;

let railBounds = null;
let stationsVisible = true;
let myMapVisible = false;

let lastPos = null; // {lat, lng}

/* ---------- UI (最低限：壊れない) ---------- */
window.switchTab = (tab) => {
  document.querySelectorAll(".bottom-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById(`tab-btn-${tab}`)?.classList.add("active");
  document.getElementById(`tab-${tab}`)?.classList.add("active");

  if (tab === "transit") {
    showTransitLayers(true);
  } else {
    showTransitLayers(false);
  }
};

window.sendMessage = () => {
  const name = document.getElementById("user-name")?.value || "noname";
  const text = document.getElementById("dice-command")?.value || "";
  if (!text.trim()) return;
  appendLog({ name, text });
  document.getElementById("dice-command").value = "";
};

function appendLog({ name, text }) {
  const log = document.getElementById("chat-log");
  if (!log) return;
  const el = document.createElement("div");
  el.className = "log-item";
  el.innerHTML = `
    <div class="log-head">
      <div class="log-name">${escapeHtml(name)}</div>
      <div class="log-time">${new Date().toLocaleString()}</div>
    </div>
    <div class="log-body">${escapeHtml(text)}</div>
  `;
  log.prepend(el);
}

/* ---------- My Maps（URL共有→iframe embed） ---------- */
window.applyMyMapUrl = () => {
  const input = document.getElementById("mymap-url");
  const url = (input?.value || "").trim() || DEFAULT_MYMAP_URL;
  setMyMapEmbedFromShareUrl(url);
  document.getElementById("mymap-status").textContent = "設定OK";
};

window.toggleMyMap = () => {
  myMapVisible = !myMapVisible;
  const iframe = document.getElementById("mymap-embed");
  if (!iframe) return;
  iframe.classList.toggle("active", myMapVisible);
};

function setMyMapEmbedFromShareUrl(shareUrl) {
  const iframe = document.getElementById("mymap-embed");
  if (!iframe) return;

  // shareUrl から mid を抜く（edit/viewどっちでもOK）
  const mid = extractMid(shareUrl);
  if (!mid) {
    iframe.src = "";
    document.getElementById("mymap-status").textContent = "midが見つかりません";
    return;
  }
  // My Maps embed
  iframe.src = `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}`;
}

function extractMid(url) {
  try {
    const u = new URL(url);
    const mid = u.searchParams.get("mid");
    if (mid) return mid;
  } catch (_) {}
  // 文字列から mid=... を拾う保険
  const m = String(url).match(/mid=([^&]+)/);
  return m ? m[1] : null;
}

/* ---------- Leaflet Init ---------- */
async function initApp() {
  // 1) Map
  map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
  }).setView([35.681236, 139.767125], 11); // 東京駅付近

  // 2) Base tiles（OSM）
  baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // 3) click → 座標反映 + 観光POI
  map.on("click", async (e) => {
    lastPos = { lat: e.latlng.lat, lng: e.latlng.lng };
    updatePosDisplay(lastPos);

    // 観光情報（Overpass）
    await showNearbyTourismPopup(e.latlng);
  });

  // 4) 初期MyMap URLをセット（非表示のまま）
  setMyMapEmbedFromShareUrl(DEFAULT_MYMAP_URL);

  // 5) データ読み込み
  await Promise.allSettled([
    loadRailways(),
    loadStations(),
  ]);

  // 表示の初期状態：transitタブ以外は隠す（元の挙動に近づける）
  showTransitLayers(false);
  document.getElementById("route-res").textContent = "OK";
}

function updatePosDisplay(pos) {
  const el = document.getElementById("pos-display");
  if (!el) return;
  el.textContent = `選択中: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}（地図クリックで変更）`;
}

/* ---------- Railways ---------- */
async function loadRailways() {
  const res = await fetch(FILES.railway, { cache: "no-store" });
  if (!res.ok) throw new Error(`railway fetch failed: ${res.status}`);
  const geo = await res.json();

  // GeoJSONのfeaturesをフィルタ
  const filtered = {
    type: "FeatureCollection",
    features: (geo.features || []).filter(f => {
      const g = f.geometry;
      if (!g) return false;

      // 代表点（最初の座標）でざっくり判定
      const pt = firstCoord(g);
      if (!pt) return false;
      const [lng, lat] = pt;

      // 本州ざっくり
      if (!inBbox(lng, lat, BBOX_HONSHU)) return false;

      // 会社・路線名
      const p = f.properties || {};
      const company = p.company || p.operator || p["運営会社"] || "";
      const lineName = p.name || p.line || p["路線名"] || p["line_name"] || "";

      const companyN = norm(company);
      const lineN = norm(lineName);

      // JR東海は静岡〜愛知だけ
      if (companyN.includes(JR_CENTRAL) || lineN.includes("JR東海")) {
        return inBbox(lng, lat, BBOX_TOKAI_SHIZUOKA_AICHI);
      }

      // JR東日本はOK
      if (companyN.includes(JR_EAST) || lineN.includes("JR東日本")) return true;

      // 関東私鉄は会社名 or BBOXで制限
      for (const k of KANTO_PRIVATE) {
        if (companyN.includes(norm(k)) || lineN.includes(norm(k))) {
          return inBbox(lng, lat, BBOX_KANTO);
        }
      }
      // その他（地下鉄など）：関東箱に入ってたら残す
      return inBbox(lng, lat, BBOX_KANTO);
    })
  };

  // Layer
  railLayer = L.geoJSON(filtered, {
    style: (feature) => {
      const p = feature.properties || {};
      const rawName = p.name || p.line || p["路線名"] || p["line_name"] || "";
      const c = colorForLine(rawName);
      return { color: c, weight: 3, opacity: 0.9 };
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const name = p.name || p.line || p["路線名"] || "路線";
      layer.bindTooltip(String(name), { sticky: true });
    }
  });

  // bounds
  railBounds = railLayer.getBounds();
}

function colorForLine(lineName) {
  const n = norm(lineName);
  // RAIL_COLORSは「カンマ区切りキー」があるので展開検索する
  for (const key of Object.keys(RAIL_COLORS)) {
    const names = splitCSV(key).map(norm);
    if (names.includes(n)) return RAIL_COLORS[key];
    // 部分一致保険
    if (names.some(x => x && n.includes(x))) return RAIL_COLORS[key];
  }
  return hashColor(n);
}

function firstCoord(geom) {
  // GeoJSON geometryから最初の座標を抜く（Point/LineString/MultiLineString等対応）
  try {
    if (geom.type === "Point") return geom.coordinates;
    if (geom.type === "LineString") return geom.coordinates?.[0];
    if (geom.type === "MultiLineString") return geom.coordinates?.[0]?.[0];
    if (geom.type === "Polygon") return geom.coordinates?.[0]?.[0];
    if (geom.type === "MultiPolygon") return geom.coordinates?.[0]?.[0]?.[0];
  } catch (_) {}
  return null;
}

/* ---------- Stations ---------- */
async function loadStations() {
  const res = await fetch(FILES.stations, { cache: "no-store" });
  if (!res.ok) throw new Error(`stations fetch failed: ${res.status}`);
  const data = await res.json();

  // Station.json の形式が不明なので「FeatureCollectionならGeoJSON扱い」、
  // それ以外は配列扱いで {lat,lng,name} を拾う保険にする
  stationLayer = L.layerGroup();

  if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
    const g = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 2,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        });
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const name = p.name || p.station || p["駅名"] || "Station";
        layer.bindTooltip(String(name), { sticky: true });
      }
    });
    g.addTo(stationLayer);
  } else if (Array.isArray(data)) {
    for (const row of data) {
      const lat = row.lat ?? row.latitude ?? row.y;
      const lng = row.lng ?? row.lon ?? row.longitude ?? row.x;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const name = row.name ?? row.station ?? row["駅名"] ?? "Station";
      L.circleMarker([lat, lng], { radius: 2, weight: 1, opacity: 0.8, fillOpacity: 0.6 })
        .bindTooltip(String(name), { sticky: true })
        .addTo(stationLayer);
    }
  } else {
    // 形式が違う場合は駅表示を諦めて落とさない
    console.warn("Unknown Station.json format. Station markers skipped.");
  }
}

/* ---------- Transit layer visibility / controls ---------- */
function showTransitLayers(on) {
  if (!map) return;

  // rail
  if (railLayer) {
    if (on) railLayer.addTo(map);
    else map.removeLayer(railLayer);
  }

  // stations
  if (stationLayer) {
    const wantStations = on && stationsVisible;
    if (wantStations) stationLayer.addTo(map);
    else map.removeLayer(stationLayer);
  }
}

window.toggleStations = () => {
  stationsVisible = !stationsVisible;
  showTransitLayers(true); // transitタブ前提のボタンなので true
};

window.fitToRail = () => {
  if (!map) return;
  if (railBounds && railBounds.isValid()) {
    map.fitBounds(railBounds, { padding: [20, 20] });
  } else {
    // fallback
    map.setView([35.681236, 139.767125], 11);
  }
};

/* ---------- 観光情報（Overpass API） ----------
   - クレカ不要
   - 制限：連打すると弾かれるので「クリック毎に1回」「timeout短め」
   - 取得：tourism/amenity等の近場POIを拾ってポップアップに表示
------------------------------------------------ */
let poiAbort = null;

async function showNearbyTourismPopup(latlng) {
  if (!map) return;

  // 連打対策：前のリクエストをキャンセル
  if (poiAbort) poiAbort.abort();
  poiAbort = new AbortController();

  const radius = 500; // meters
  const query = `
[out:json][timeout:10];
(
  node(around:${radius},${latlng.lat},${latlng.lng})[tourism];
  node(around:${radius},${latlng.lat},${latlng.lng})[amenity=restaurant];
  node(around:${radius},${latlng.lat},${latlng.lng})[amenity=cafe];
  node(around:${radius},${latlng.lat},${latlng.lng})[amenity=bar];
);
out 20;
  `.trim();

  const url = "https://overpass-api.de/api/interpreter";

  let items = [];
  try {
    const r = await fetch(url, {
      method: "POST",
      body: query,
      signal: poiAbort.signal,
      headers: { "Content-Type": "text/plain;charset=UTF-8" }
    });
    if (!r.ok) throw new Error(`Overpass error: ${r.status}`);
    const json = await r.json();
    items = (json.elements || []).map(el => {
      const t = el.tags || {};
      const name = t.name || "(名称なし)";
      const kind = t.tourism || t.amenity || "poi";
      return { name, kind, lat: el.lat, lon: el.lon };
    });
  } catch (e) {
    if (String(e).includes("AbortError")) return;
    items = [];
  }

  // popup content
  const title = `周辺スポット（${radius}m）`;
  const listHtml = items.length
    ? `<ul style="margin:6px 0 0; padding-left:18px;">
        ${items.slice(0, 10).map(x =>
          `<li><b>${escapeHtml(x.name)}</b> <span style="opacity:.7;">(${escapeHtml(x.kind)})</span></li>`
        ).join("")}
      </ul>`
    : `<div style="margin-top:6px; opacity:.8;">近くのスポットが見つかりませんでした（または混雑/制限）</div>`;

  L.popup({ maxWidth: 320 })
    .setLatLng(latlng)
    .setContent(`
      <div style="font-weight:800;">${title}</div>
      <div style="opacity:.8; font-size:12px;">地図クリックで更新</div>
      ${listHtml}
    `)
    .openOn(map);
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initApp().catch(err => {
    console.error(err);
    const el = document.getElementById("route-res");
    if (el) el.textContent = "エラー（Consoleを確認）";
  });
});
