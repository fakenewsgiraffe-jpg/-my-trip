/* =========================================================
   My Trip Tool (Google Maps版 / v2026-01)
   - Google Maps JS API
   - railway.json + Station.json を描画
   - 東日本 + 東海(静岡〜愛知) + 関東私鉄だけにフィルタ
   - RAIL_COLORS 正規化（カンマ区切りキーを展開）
   - My Maps は「共有URL」を iframe 埋め込み（KML不要）
========================================================= */

/* ====== ここにあなたの巨大な RAIL_COLORS を「1回だけ」貼る ====== */
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

/* ====== Files ====== */
const FILES = {
  railway: "railway.json",
  stations: "Station.json",
　defaultKml: "mymap.kml",
};

const DEFAULT_MYMAP_URL = "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

/* ====== Region Filter ======
  - 北海道・九州・四国を除外（= 本州中心）
  - 東海は静岡〜愛知
  - 私鉄は関東（会社名で制限 + 座標でも絞る）
*/
const BBOX_HONSHU = { minLng: 135.0, minLat: 34.0, maxLng: 142.5, maxLat: 41.9 };
const BBOX_TOKAI_SHIZUOKA_AICHI = { minLng: 137.0, minLat: 34.5, maxLng: 138.9, maxLat: 35.8 };
const BBOX_KANTO = { minLng: 138.4, minLat: 34.8, maxLng: 141.2, maxLat: 37.2 };

const JR_EAST = "東日本旅客鉄道";
const JR_CENTRAL = "東海旅客鉄道";

// 関東私鉄（必要ならここに追加/削除）
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
function norm(s){
  return String(s||"")
    .replace(/\s+/g,"")
    .replace(/　/g,"")
    .replace(/／/g,"/")
    .replace(/，/g,",")
    .trim();
}
function splitCSV(s){
  return String(s||"").split(",").map(x=>x.trim()).filter(Boolean);
}
function inBbox(lng, lat, b){
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}
function hashColor(str){
  const s = String(str||"");
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  const c = (h & 0xFFFFFF).toString(16).padStart(6,"0");
  return `#${c}`;
}

/* ---------- UI (最低限) ---------- */
window.switchTab = (tab) => {
  document.querySelectorAll(".bottom-tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p=>p.classList.remove("active"));
  document.getElementById(`tab-btn-${tab}`)?.classList.add("active");
  document.getElementById(`tab-${tab}`)?.classList.add("active");

  if (tab === "transit"){
    // 路線図タブに来たら路線/駅を表示
    showTransitLayers(true);
  } else {
    // それ以外のタブでは消してスッキリ
    showTransitLayers(false);
  }
};

window.sendMessage = () => {
  // 今回は地図修正が主目的なので、ここは簡易（壊れない最小）
  const name = document.getElementById("user-name")?.value || "noname";
  const text = document.getElementById("dice-command")?.value || "";
  if (!text.trim()) return;
  appendLog({ name, text });
  document.getElementById("dice-command").value = "";
};

function appendLog({name, text}){
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
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[m]);
}

/* ---------- My Maps (URL共有 → iframe embed) ---------- */
let myMapVisible = false;

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

// 共有URL（edit/view）から mid を抜いて embed URL を作る
function setMyMapEmbedFromShareUrl(shareUrl){
  const iframe = document.getElementById("mymap-embed");
  if (!iframe) return;

  let mid = "";
  try{
    const u = new URL(shareUrl);
    mid = u.searchParams.get("mid") || "";
  }catch{}

  if (!mid){
    // 直で mid だけ貼られた場合も拾う
    const m = shareUrl.match(/mid=([^&]+)/);
    mid = m ? m[1] : "";
  }

  if (!mid){
    document.getElementById("mymap-status").textContent = "URLから mid が取れませんでした";
    return;
  }

  // これが「URL共有で埋め込み」（KML不要）
  const embed = `https://www.google.com/maps/d/u/0/embed?mid=${encodeURIComponent(mid)}`;
  iframe.src = embed;
}

/* ---------- Google Map ---------- */
let map;
let lastClickLatLng = null;

let railPolylines = [];
let stationMarkers = [];
let railBounds = new google.maps.LatLngBounds();

let stationsVisible = true;
window.toggleStations = () => {
  stationsVisible = !stationsVisible;
  for (const m of stationMarkers) m.setMap(stationsVisible ? map : null);
};

window.fitToRail = () => {
  if (!railBounds.isEmpty()){
    map.fitBounds(railBounds, 40);
  }
};

function showTransitLayers(on){
  for (const p of railPolylines) p.setMap(on ? map : null);
  if (stationsVisible){
    for (const m of stationMarkers) m.setMap(on ? map : null);
  } else {
    for (const m of stationMarkers) m.setMap(null);
  }
}

/* ---------- Railway colors (正規化) ---------- */
function buildColorMapExpanded(){
  // "横須賀線,総武快速線" みたいなキーを分解して両方に同色を当てる
  const m = new Map();
  for (const [k, v] of Object.entries(RAIL_COLORS || {})){
    const keys = splitCSV(k);
    if (keys.length === 0){
      m.set(norm(k), v);
      continue;
    }
    for (const kk of keys) m.set(norm(kk), v);
  }
  return m;
}
function colorForLineName(colorMap, lineName){
  const key = norm(lineName);
  return colorMap.get(key) || hashColor(key);
}

/* ---------- Filters ---------- */
function allowRailFeature(props, lng, lat){
  const company = String(props?.N02_004 || "");
  const line = String(props?.N02_003 || "");

  // 本州だけ（北海道/九州/四国/沖縄をざっくり除外）
  if (!inBbox(lng, lat, BBOX_HONSHU)) return false;

  // JR東日本（本州側）
  if (company === JR_EAST) return true;

  // JR東海（静岡〜愛知だけ）
  if (company === JR_CENTRAL){
    return inBbox(lng, lat, BBOX_TOKAI_SHIZUOKA_AICHI);
  }

  // 関東私鉄（会社名 + 関東bbox）
  if (KANTO_PRIVATE.has(company)){
    return inBbox(lng, lat, BBOX_KANTO);
  }

  // （必要なら地下鉄など line/companyで追加）
  // 例: company === "東京都交通局" は上でKANTO_PRIVATEに入れてある

  return false;
}

function allowStationFeature(props, lng, lat){
  // Station.json は N02_004 が会社名、N02_003 が路線名、N02_005 が駅名っぽい :contentReference[oaicite:3]{index=3}
  return allowRailFeature(props, lng, lat);
}

/* ---------- Load & Draw ---------- */
async function loadRailway(){
  const status = document.getElementById("route-res");
  try{
    const res = await fetch(FILES.railway);
    if (!res.ok) throw new Error(`${FILES.railway} ${res.status}`);
    const data = await res.json();

    const colorMap = buildColorMapExpanded();

    // クリア
    for (const p of railPolylines) p.setMap(null);
    railPolylines = [];
    railBounds = new google.maps.LatLngBounds();

    let kept = 0;

    for (const f of (data.features || [])){
      if (!f || !f.geometry) continue;
      const props = f.properties || {};
      const lineName = props.N02_003 || "";

      if (f.geometry.type === "LineString"){
        const path = [];
        let ok = false;

        for (const [lng, lat] of (f.geometry.coordinates || [])){
          if (typeof lng !== "number" || typeof lat !== "number") continue;
          path.push({ lat, lng });
          if (!ok && allowRailFeature(props, lng, lat)) ok = true;
        }
        if (!ok || path.length < 2) continue;

        const strokeColor = colorForLineName(colorMap, lineName);

        const poly = new google.maps.Polyline({
          path,
          strokeColor,
          strokeOpacity: 0.9,
          strokeWeight: 3,
          clickable: true,
        });

        poly.addListener("click", (e)=>{
          const content = `<div style="font-size:12px;">
            <b>${escapeHtml(lineName || "路線")}</b><br/>
            ${escapeHtml(String(props.N02_004 || ""))}
          </div>`;
          new google.maps.InfoWindow({ content, position: e.latLng }).open({ map });
        });

        poly.setMap(map);
        railPolylines.push(poly);
        kept++;

        // bounds
        for (const pt of path) railBounds.extend(pt);
      }
    }

    status.textContent = `路線: ${kept.toLocaleString()} 本（フィルタ後）`;
  }catch(e){
    console.error(e);
    status.textContent = `路線の読み込みに失敗: ${String(e?.message || e)}`;
  }
}

async function loadStations(){
  try{
    const res = await fetch(FILES.stations);
    if (!res.ok) throw new Error(`${FILES.stations} ${res.status}`);
    const data = await res.json();

    // クリア
    for (const m of stationMarkers) m.setMap(null);
    stationMarkers = [];

    let kept = 0;

    for (const f of (data.features || [])){
      if (!f || !f.geometry) continue;
      const props = f.properties || {};
      const stationName = props.N02_005 || "駅";

      // Station.json が LineString なので中心点を作る
      let lng = null, lat = null;

      if (f.geometry.type === "LineString"){
        const coords = f.geometry.coordinates || [];
        if (coords.length === 0) continue;
        // 中点
        const mid = coords[Math.floor(coords.length / 2)];
        if (!mid) continue;
        lng = mid[0]; lat = mid[1];
      } else if (f.geometry.type === "Point"){
        lng = f.geometry.coordinates?.[0];
        lat = f.geometry.coordinates?.[1];
      } else {
        continue;
      }

      if (typeof lng !== "number" || typeof lat !== "number") continue;
      if (!allowStationFeature(props, lng, lat)) continue;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: stationsVisible ? map : null,
        title: String(stationName),
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 3,
          strokeWeight: 1,
          fillOpacity: 0.9,
        }
      });

      marker.addListener("click", ()=>{
        const content = `<div style="font-size:12px;">
          <b>${escapeHtml(stationName)}</b><br/>
          ${escapeHtml(String(props.N02_003 || ""))}<br/>
          ${escapeHtml(String(props.N02_004 || ""))}
        </div>`;
        new google.maps.InfoWindow({ content, position: marker.getPosition() }).open({ map });
      });

      stationMarkers.push(marker);
      kept++;
    }

    console.log("stations kept:", kept);
  }catch(e){
    console.error(e);
  }
}

/* ---------- App init (Google callback) ---------- */
window.initApp = async () => {
  // Map init
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  map.addListener("click", (e)=>{
    lastClickLatLng = e.latLng;
    const el = document.getElementById("pos-display");
    if (el){
      el.textContent = `選択中: ${e.latLng.lat().toFixed(4)}, ${e.latLng.lng().toFixed(4)}`;
    }
  });

  // MyMaps 初期設定（共有URL→embed）
  const urlInput = document.getElementById("mymap-url");
  if (urlInput) urlInput.value = DEFAULT_MYMAP_URL;
  setMyMapEmbedFromShareUrl(DEFAULT_MYMAP_URL);
  document.getElementById("mymap-status").textContent = "初期URLを設定済み（表示は路線図タブで切替）";

  // data load
  await loadRailway();
  await loadStations();

  // 初期はメインタブ（路線/駅は非表示）
  showTransitLayers(false);
};

