/* =========================================================
   My Trip Tool - Unified "Best" Build (v2026-01) + FixPack
   - JR East + JR Central only (bbox + operator filter)
   - Station.json(LineString) -> Point化して駅を表示
   - Color map: key正規化 + カンマ分割 + 表記ゆれ吸収
========================================================= */

/* ====== あなたの巨大な RAIL_COLORS はここに貼る（そのまま） ====== */
const RAIL_COLORS = {
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

  // JR東日本（続き）
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

  // JR東日本（信越・東北エリアなど）
  "信越本線": "#00AAEE",
  "白新線": "#F387B7",
  "東北本線(東北エリア)": "#3CB371",
  "羽越本線": "#16C0E9",
  "磐越西線": "#CB7B35",
  "只見線": "#008DD1",
  "仙石線": "#00AAEE",
  "仙山線": "#72BC4A",

  // JR東海
  "JR東海": "#ED6D00",
  "東海道新幹線": "#0072BA",
  "御殿場線": "#40743C",
  "飯田線": "#75A2DB",

  // 地下鉄
  "東京メトロ": "#00A3D9",
  "丸ノ内線": "#F62E36",
  "銀座線": "#FF9500",
  "東西線": "#009BBF",
  "千代田線": "#00BB85",
  "副都心線": "#9C5E31",
  "都営地下鉄": "#199332",
  "大江戸線": "#CE045B",

  // 横浜市営地下鉄
  "横浜市営ブルーライン": "#0070C0",
  "横浜市営グリーンライン": "#00B050",

  // 私鉄
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

  // モノレール・新交通
  "多摩都市モノレール線": "#E97119",
  "ゆりかもめ": "#E97119"
};
};

/* ====== Files ====== */
const FILES = {
  railway: "railway.json",
  // ここがポイント：GitHub上の実在名に合わせる（どちらでも動くようにフォールバック）
  stationsCandidates: ["Station.json", "station.json", "stations.json"],
  defaultKml: "mymap.kml",
};

const STORAGE_KEY = "mytrip_state_v202601";

/* ---------- Region Filter (JR East + Tokai area) ---------- */
/**
 * 「東日本と東海の範囲だけ」＝地理的に絞るのが一番安全（データの会社名揺れにも強い）
 * ざっくり:
 *   西: 136.0（滋賀より東）/ 東: 146.5 / 南: 33.0 / 北: 43.8
 * ※ もっと狭めたいならここを調整してOK
 */
const REGION_BBOX = { west: 136.0, south: 33.0, east: 146.5, north: 43.8 };

// 会社名ベースでも絞る（あくまで補助）
const OPERATOR_ALLOW = new Set([
  "東日本旅客鉄道",     // JR East
  "東海旅客鉄道",       // JR Central
  // データによっては「東日本旅客鉄道株式会社」等があるので部分一致で見る
]);

/* ---------- Utilities ---------- */
function nowISO(){ return new Date().toISOString(); }
function fmtTime(iso){
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}
function norm(s){
  return String(s||"")
    .replace(/\s+/g,"")
    .replace(/[　]/g,"")
    .replace(/／/g,"/")
    .replace(/，/g,",")
    .replace(/・/g,"")   // 追加：表記ゆれ吸収
    .trim();
}
function splitCSV(s){
  return String(s||"").split(",").map(x=>x.trim()).filter(Boolean);
}
function hashColor(str){
  const s = String(str||"");
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  const c = (h & 0xFFFFFF).toString(16).padStart(6,"0");
  return `#${c}`;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function inBBox(lng, lat){
  return (
    lng >= REGION_BBOX.west &&
    lng <= REGION_BBOX.east &&
    lat >= REGION_BBOX.south &&
    lat <= REGION_BBOX.north
  );
}

function geomTouchesBBox(geom){
  if (!geom) return false;

  const t = geom.type;
  const c = geom.coordinates;

  const checkCoord = (xy) => {
    if (!Array.isArray(xy) || xy.length < 2) return false;
    const [lng, lat] = xy;
    return inBBox(lng, lat);
  };

  if (t === "Point") return checkCoord(c);
  if (t === "LineString") return c.some(checkCoord);
  if (t === "MultiLineString") return c.some(line => Array.isArray(line) && line.some(checkCoord));
  if (t === "MultiPoint") return c.some(checkCoord);
  // 他型は必要になったら追加
  return false;
}

function operatorAllowed(op){
  const s = String(op || "");
  if (!s) return true; // 会社名が無いデータもあるので、bbox側で落とす前提
  // 部分一致許容
  for (const key of OPERATOR_ALLOW){
    if (s.includes(key)) return true;
  }
  return false;
}

/* ---------- State ---------- */
let state = {
  logs: [],
  album: [],
  ui: { filter: "all", q: "" },
  kmlUrl: FILES.defaultKml,
  stationsVisible: true
};

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try{
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object"){
      state.logs = Array.isArray(parsed.logs) ? parsed.logs : [];
      state.album = Array.isArray(parsed.album) ? parsed.album : [];
      state.ui = parsed.ui || state.ui;
      state.kmlUrl = typeof parsed.kmlUrl === "string" ? parsed.kmlUrl : state.kmlUrl;
      state.stationsVisible = typeof parsed.stationsVisible === "boolean" ? parsed.stationsVisible : true;
    }
  }catch(e){
    console.warn("state load fail", e);
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- Tabs ---------- */
window.switchTab = (tab) => {
  document.querySelectorAll(".bottom-tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p=>p.classList.remove("active"));
  document.getElementById(`tab-btn-${tab}`)?.classList.add("active");
  document.getElementById(`tab-${tab}`)?.classList.add("active");

  if (tab === "transit"){
    setMapMode("transit");
  } else {
    setMapMode("normal");
  }
};

/* ---------- Map ---------- */
let map, tiles;
let railLayer = null;
let stationLayer = null;
let railPane = null;
let albumLayerGroup = null;
let myMapLayer = null;
let lastPos = null;

function initMap(){
  tiles = {
    light: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"),
    dark:  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"),
  };

  map = L.map("map", { zoomControl: false }).setView([35.6812, 139.7671], 10);
  tiles.light.addTo(map);
  L.control.zoom({ position: "bottomleft" }).addTo(map);

  railPane = map.createPane("railPane");
  railPane.classList.add("rail-glow");
  railPane.style.zIndex = 450;

  albumLayerGroup = L.layerGroup().addTo(map);

  map.on("click", (e)=>{
    lastPos = e.latlng;
    const el = document.getElementById("pos-display");
    if (el){
      el.innerText = `選択中: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
  });
}

function setMapMode(mode){
  if (!map) return;
  if (mode === "transit"){
    map.removeLayer(tiles.light);
    tiles.dark.addTo(map);
    if (railLayer && !map.hasLayer(railLayer)) railLayer.addTo(map);
    if (stationLayer && state.stationsVisible && !map.hasLayer(stationLayer)) stationLayer.addTo(map);
  } else {
    map.removeLayer(tiles.dark);
    tiles.light.addTo(map);
    if (railLayer && map.hasLayer(railLayer)) map.removeLayer(railLayer);
    if (stationLayer && map.hasLayer(stationLayer)) map.removeLayer(stationLayer);
  }
}

window.fitToRail = () => {
  if (railLayer && railLayer.getBounds){
    try{ map.fitBounds(railLayer.getBounds().pad(0.08)); }catch{}
  }
};

window.toggleStations = () => {
  state.stationsVisible = !state.stationsVisible;
  saveState();
  if (!stationLayer) return;
  if (state.stationsVisible){
    if (!map.hasLayer(stationLayer) && document.getElementById("tab-transit")?.classList.contains("active")){
      stationLayer.addTo(map);
    }
  }else{
    if (map.hasLayer(stationLayer)) map.removeLayer(stationLayer);
  }
};

/* ---------- Railway (Colors + Region Filter) ---------- */

/** 表記ゆれの吸収（必要なら増やせる） */
const LINE_ALIASES = new Map([
  // 例：データ側/あなたの辞書側の揺れをここで寄せる
  [norm("中央快速線"), norm("中央線快速")],
  [norm("中央快速線,青梅線,五日市線"), norm("中央線快速")],
  [norm("京浜東北線"), norm("京浜東北線")],
  [norm("根岸線"), norm("根岸線")],
]);

function buildColorMap(){
  const m = new Map();
  for (const [rawKey, rawVal] of Object.entries(RAIL_COLORS)){
    const color = String(rawVal || "").trim();
    if (!color) continue;

    // ✅ カンマ連結キーを分割して全部登録
    const parts = splitCSV(rawKey);
    if (!parts.length){
      m.set(norm(rawKey), color);
      continue;
    }
    for (const p of parts){
      m.set(norm(p), color);
    }
  }
  return m;
}

function pickLineColor(colorMap, lineName){
  const k0 = norm(lineName);
  const k1 = LINE_ALIASES.get(k0) || k0;
  return colorMap.get(k0) || colorMap.get(k1) || hashColor(k0 || "rail");
}

function slimRailwayGeoJSON(data){
  const feats = (data.features || []).filter(f=>{
    const op = f?.properties?.N02_004 ?? "";
    if (!operatorAllowed(op)) return false;
    return geomTouchesBBox(f.geometry);
  });

  return {
    type: "FeatureCollection",
    features: feats.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        N02_003: f?.properties?.N02_003 ?? "",
        N02_004: f?.properties?.N02_004 ?? ""
      }
    }))
  };
}

async function loadRailway(){
  const status = document.getElementById("route-res");
  try{
    const res = await fetch(FILES.railway);
    if (!res.ok) throw new Error(`${FILES.railway} ${res.status}`);
    const data = await res.json();

    const slim = slimRailwayGeoJSON(data);
    const colorMap = buildColorMap();

    if (railLayer) { try{ map.removeLayer(railLayer); }catch{} }

    railLayer = L.geoJson(slim, {
      pane: "railPane",
      style: (f)=>{
        const raw = f?.properties?.N02_003 ?? "";
        const color = pickLineColor(colorMap, raw);
        return { color, weight: 3, opacity: 0.92 };
      },
      onEachFeature: (f, layer)=>{
        const name = f?.properties?.N02_003 || "路線";
        const op = f?.properties?.N02_004 || "";
        layer.bindPopup(`<b>${escapeHtml(name)}</b><br/><span style="opacity:.7">${escapeHtml(op)}</span>`);
      }
    });

    if (status) status.innerText = `路線データ同期完了（範囲: 東日本+東海）`;
  }catch(e){
    console.warn(e);
    if (status) status.innerText = "路線データ読み込み失敗";
  }
}

/* ---------- Stations (LineString -> Point + Region Filter) ---------- */
function toPointFromLineString(coords){
  // LineStringの中心っぽい座標を取る（雑に真ん中）
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const mid = coords[Math.floor(coords.length / 2)];
  if (!Array.isArray(mid) || mid.length < 2) return null;
  return { type: "Point", coordinates: [mid[0], mid[1]] };
}

function slimStationsGeoJSON(data){
  const feats = (data.features || []).map(f=>{
    let geom = f.geometry;

    // ✅ Station.json が LineString でも点に変換して表示できるようにする
    if (geom?.type === "LineString"){
      const pt = toPointFromLineString(geom.coordinates);
      if (pt) geom = pt;
    }

    // Point化できないものは捨てる
    if (!geom || geom.type !== "Point") return null;

    // 範囲＆会社名で絞る
    const op = f?.properties?.N02_004 ?? "";
    if (!operatorAllowed(op)) return null;
    if (!geomTouchesBBox(geom)) return null;

    return {
      type: "Feature",
      geometry: geom,
      properties: {
        station: f?.properties?.N02_005 ?? "",
        line: f?.properties?.N02_003 ?? "",
        operator: op
      }
    };
  }).filter(Boolean);

  return { type: "FeatureCollection", features: feats };
}

async function fetchFirstOkJson(candidates){
  let lastErr = null;
  for (const p of candidates){
    try{
      const res = await fetch(p);
      if (!res.ok) throw new Error(`${p} ${res.status}`);
      const json = await res.json();
      return { path: p, json };
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error("no station file");
}

async function loadStations(){
  try{
    const { path, json } = await fetchFirstOkJson(FILES.stationsCandidates);
    const slim = slimStationsGeoJSON(json);

    if (stationLayer) { try{ map.removeLayer(stationLayer); }catch{} }

    stationLayer = L.geoJson(slim, {
      pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
        radius: 2.8,
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.9
      }),
      onEachFeature: (f, layer)=>{
        const st = f?.properties?.station || "駅";
        const ln = f?.properties?.line || "";
        const op = f?.properties?.operator || "";
        layer.bindPopup(
          `<b>${escapeHtml(st)}</b><br/>` +
          `<span style="opacity:.8">${escapeHtml(ln)}</span><br/>` +
          `<span style="opacity:.6">${escapeHtml(op)}</span>`
        );
      }
    });

    // transitタブ中で、表示フラグONなら追加
    if (state.stationsVisible && document.getElementById("tab-transit")?.classList.contains("active")){
      stationLayer.addTo(map);
    }

    console.log(`stations loaded from: ${path}, features: ${slim.features.length}`);
  }catch(e){
    console.warn(e);
  }
}

/* ---------- MyMap(KML) (現行維持) ---------- */
window.reloadMyMap = () => {
  const input = document.getElementById("kml-url");
  const url = (input?.value || "").trim() || FILES.defaultKml;

  state.kmlUrl = url;
  saveState();

  const status = document.getElementById("kml-status");
  if (status) status.innerText = "同期中...";

  try{
    if (myMapLayer) { map.removeLayer(myMapLayer); myMapLayer = null; }

    myMapLayer = omnivore.kml(url)
      .on("ready", function(){
        if (status) status.innerText = "同期完了";
      })
      .on("error", function(){
        if (status) status.innerText = "KML読み込み失敗";
      })
      .addTo(map);
  }catch(e){
    console.warn(e);
    if (status) status.innerText = "KML読み込み失敗";
  }
};

/* ---------- Init ---------- */
function init(){
  loadState();
  initMap();

  // KML input restore
  const kml = document.getElementById("kml-url");
  if (kml) kml.value = state.kmlUrl || FILES.defaultKml;

  // Load transit data
  loadRailway();
  loadStations();

  // 初期タブがmainなので、路線/駅は transit に切り替えた時に表示される
}
window.onload = init;
