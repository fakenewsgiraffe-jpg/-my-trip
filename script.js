/**
 * Traveler's Tool - Ultimate Integration (v8)
 * - アルバムマーカー増殖防止（LayerGroup）
 * - ログをJSON保存（XSS/壊れやすさ対策）＋旧v7_log互換
 * - MyMap(KML)は URL/ファイルを入力して同期（既定: mymap.kml）
 * - ダイス：空白許容（例: 1d10 + 10）
 */

/* ===== ここはあなたの現行の RAIL_COLORS を“そのまま”残してください ===== */
const RAIL_COLORS = {const RAIL_COLORS = {
  // === JR東日本 首都圏 ===
  "山手線": "#9ACD32",
  "京浜東北線": "#00B2E5",
  "根岸線": "#00B2E5",
  "中央線快速": "#F15A22",
  "中央線": "#F15A22",
  "中央・総武線": "#FFD400",
  "総武線": "#FFD400",
  "総武快速線": "#007AC1",
  "横須賀線": "#007AC1",
  "湘南新宿ライン": "#E31F26",
  "上野東京ライン": "#91278F",

  "埼京線": "#00AC84",
  "川越線": "#00AC84",
  "武蔵野線": "#F15A22",
  "京葉線": "#C9252F",
  "横浜線": "#80C342",
  "南武線": "#FFD400",
  "鶴見線": "#FFD400",
  "相模線": "#009793",

  "常磐線": "#36AE6E",
  "常磐快速線": "#36AE6E",
  "常磐緩行線": "#339999",
  "宇都宮線": "#F68B1E",
  "高崎線": "#F68B1E",

  "東海道線": "#F0862B",
  "伊東線": "#008803",
  "成田線": "#00B261",
  "成田線我孫子支線": "#36AE6E",
  "内房線": "#00B2E5",
  "外房線": "#DB4028",

  // === JR東日本 地方 ===
  "信越本線": "#00AAEE",
  "白新線": "#F387B7",
  "東北本線": "#3CB371",
  "羽越本線": "#16C0E9",
  "磐越西線": "#CB7B35",
  "只見線": "#008DD1",
  "仙石線": "#00AAEE",
  "仙山線": "#72BC4A",

  // === 新幹線 ===
  "東海道新幹線": "#0072BA",

  // === 地下鉄（路線単位） ===
  "銀座線": "#FF9500",
  "丸ノ内線": "#F62E36",
  "東西線": "#009BBF",
  "千代田線": "#00BB85",
  "副都心線": "#9C5E31",
  "大江戸線": "#CE045B",

  // === 横浜市営地下鉄 ===
  "ブルーライン": "#0070C0",
  "グリーンライン": "#00B050",

  // === 私鉄 ===
  "東武スカイツリーライン": "#0F6CC3",
  "伊勢崎線": "#FF0000",
  "西武池袋線": "#FF6600",
  "西武新宿線": "#0099CC",
  "京王線": "#C8006B",
  "京王井の頭線": "#00377E",
  "小田急線": "#0D82C7",
  "東急東横線": "#DA0442",
  "東急田園都市線": "#20A288",
  "京急本線": "#00A3E4",
  "相鉄本線": "#000080",
  "りんかい線": "#00418E",
  "つくばエクスプレス": "#000080",
  "東葉高速線": "#3FB036",
  "みなとみらい線": "#09357F",

  // === モノレール・新交通 ===
  "多摩都市モノレール線": "#E97119",
  "ゆりかもめ": "#E97119"
};
 };

function norm(s){
  return String(s||"")
    .replace(/[ 　]/g,"")
    .replace(/・/g,"")
    .replace(/線$/,"")
    .replace(/本線$/,"")
    .replace(/各駅停車$/,"")
    .trim();
}


/* ===== 既定KML（同一フォルダに置く） + fallback（保険） ===== */
const DEFAULT_MYMAP_KML = "mymap.kml";
const FALLBACK_MYMAP_URL = "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

const STORAGE = {
  logs: "v8_logs",
  legacyLogHtml: "v7_log",
  album: "v7_album",
  kmlUrl: "v8_kml_url",
};

let map, tiles, railLayer, myMapLayer, lastPos = null;
let albumMarkerLayer = null;

// -----------------------------
// A. 地図初期化
// -----------------------------
function init() {
  tiles = {
    light: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"),
  };

  map = L.map("map", { zoomControl: false }).setView([35.6812, 139.7671], 12);
  tiles.light.addTo(map);
  L.control.zoom({ position: "topleft" }).addTo(map);

  albumMarkerLayer = L.layerGroup().addTo(map);

  // B. 地図クリック：アルバム保存地点の選択
  map.on("click", (e) => {
    lastPos = e.latlng;
    L.popup().setLatLng(e.latlng).setContent("アルバム地点に設定").openOn(map);
    const display = document.getElementById("pos-display");
    if (display) display.innerText = `選択中: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  });

  // C. 初期ロード
  loadRailway();
  restoreData();
  setupKmlUi();
  reloadMyMap();
}

// -----------------------------
// D. 路線図読み込み（railway.json: 線のみ）
// -----------------------------
async function loadRailway() {
  const status = document.getElementById("route-res");
  try {
    const res = await fetch("railway.json");
    if (!res.ok) throw new Error(`railway.json fetch failed: ${res.status}`);
    const data = await res.json();

    railLayer = L.geoJson(data, {
      style: (f) => {
        const name = f?.properties?.N02_003;
        return {
          color: RAIL_COLORS[name] || "#555",
          weight: 3,
          opacity: 0.85,
        };
      },
      onEachFeature: (f, l) => {
        const name = f?.properties?.N02_003 || "路線";
        l.bindPopup(`<b>${escapeHtml(name)}</b>`);
      },
    });

    // transitタブで見た目をちょっと“発光”させる
    railLayer.on("add", () => {
      try {
        const pane = railLayer.getPane && railLayer.getPane();
        if (pane) pane.classList.add("rail-glow");
      } catch (_) {}
    });

    if (status) status.innerText = "鉄道データ同期完了";
  } catch (e) {
    console.warn(e);
    if (status) status.innerText = "データ読み込み待ち...";
  }
}

// -----------------------------
// E. タブ切替（既存仕様維持）
// -----------------------------
window.switchTab = (id) => {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("active"));

  document.getElementById(`tab-${id}`)?.classList.add("active");
  document.getElementById(`tab-btn-${id}`)?.classList.add("active");

  if (id === "transit") {
    map.removeLayer(tiles.light);
    tiles.dark.addTo(map);
    if (railLayer) railLayer.addTo(map);
  } else {
    map.removeLayer(tiles.dark);
    tiles.light.addTo(map);
    if (railLayer) map.removeLayer(railLayer);
  }
};

// -----------------------------
// F. MyMap(KML)同期
//  - 既定: mymap.kml（同一フォルダに配置）
//  - ユーザーが入力欄にURL/パスを入れて「同期」可能
// -----------------------------
function setupKmlUi() {
  const input = document.getElementById("kml-url");
  if (!input) return;

  input.value = localStorage.getItem(STORAGE.kmlUrl) || DEFAULT_MYMAP_KML;

  input.addEventListener("change", () => {
    localStorage.setItem(STORAGE.kmlUrl, input.value.trim());
  });
}

window.reloadMyMap = () => {
  const input = document.getElementById("kml-url");
  const status = document.getElementById("kml-status");
  const url = (input?.value?.trim() || localStorage.getItem(STORAGE.kmlUrl) || DEFAULT_MYMAP_KML).trim();
  localStorage.setItem(STORAGE.kmlUrl, url);

  if (myMapLayer) {
    try { map.removeLayer(myMapLayer); } catch (_) {}
    myMapLayer = null;
  }

  try {
    myMapLayer = omnivore.kml(url)
      .on("ready", () => {
        if (status) status.innerText = `MyMap: 同期OK（${url}）`;
      })
      .on("error", () => {
        if (status) status.innerText = `MyMap: 失敗（${url}）→ fallback`;
        try {
          myMapLayer = omnivore.kml(FALLBACK_MYMAP_URL)
            .on("ready", () => {
              if (status) status.innerText = "MyMap: fallback同期OK";
            })
            .addTo(map);
        } catch (_) {}
      })
      .addTo(map);

    if (status) status.innerText = `MyMap: 同期中（${url}）...`;
  } catch (e) {
    console.warn(e);
    if (status) status.innerText = `MyMap: 失敗（${url}）`;
  }
};

// -----------------------------
// G. ダイス＆チャットログ（JSON保存）
// -----------------------------
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nowIso() {
  return new Date().toISOString();
}

function loadLogs() {
  const raw = localStorage.getItem(STORAGE.logs);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }
  // 旧v7互換（HTML保存）: “消さずに表示だけ継続”
  const legacy = localStorage.getItem(STORAGE.legacyLogHtml);
  if (legacy && legacy.trim()) return [];
  return [];
}

function saveLogsJson(arr) {
  localStorage.setItem(STORAGE.logs, JSON.stringify(arr));
}

function renderLogs() {
  const chat = document.getElementById("chat-log");
  if (!chat) return;

  const arr = loadLogs();
  chat.innerHTML = "";

  if (arr.length > 0) {
    arr.forEach((entry) => chat.appendChild(renderLogItem(entry)));
  } else {
    // 旧v7表示（そのまま残す）
    const legacy = localStorage.getItem(STORAGE.legacyLogHtml);
    if (legacy) chat.innerHTML = legacy;
  }

  chat.scrollTop = chat.scrollHeight;
}

function renderLogItem(entry) {
  const wrap = document.createElement("div");
  wrap.className = "log-item";
  wrap.id = `log-${entry.id}`;

  const del = document.createElement("span");
  del.className = "delete-btn";
  del.textContent = "削除";
  del.addEventListener("click", () => deleteLog(entry.id));
  wrap.appendChild(del);

  const nameEl = document.createElement("div");
  nameEl.className = "log-name";
  nameEl.textContent = entry.name || "noname";
  wrap.appendChild(nameEl);

  const textEl = document.createElement("div");
  textEl.className = "log-text";

  if (entry.type === "dice") {
    const left = document.createElement("span");
    left.textContent = `${entry.input} (${(entry.rolls || []).join(",")})`;
    textEl.appendChild(left);

    if (typeof entry.mod === "number" && entry.mod !== 0) {
      const modSpan = document.createElement("span");
      modSpan.textContent = entry.mod > 0 ? ` +${entry.mod}` : ` ${entry.mod}`;
      textEl.appendChild(modSpan);
    }

    const arrow = document.createElement("span");
    arrow.textContent = " ➔ ";
    textEl.appendChild(arrow);

    const bold = document.createElement("b");
    bold.textContent = String(entry.total);
    textEl.appendChild(bold);
  } else if (entry.type === "choice") {
    const left = document.createElement("span");
    left.textContent = `${entry.input} ➔ `;
    textEl.appendChild(left);

    const bold = document.createElement("b");
    bold.textContent = String(entry.pick ?? "");
    textEl.appendChild(bold);
  } else {
    textEl.textContent = String(entry.text ?? entry.input ?? "");
  }

  wrap.appendChild(textEl);

  const meta = document.createElement("div");
  meta.className = "log-meta";
  if (entry.ts) {
    const d = new Date(entry.ts);
    meta.textContent = isNaN(d.getTime()) ? "" : d.toLocaleString();
  }
  wrap.appendChild(meta);

  return wrap;
}

function appendLog(entry) {
  const arr = loadLogs();
  arr.push(entry);
  saveLogsJson(arr);

  const chat = document.getElementById("chat-log");
  if (!chat) return;
  chat.appendChild(renderLogItem(entry));
  chat.scrollTop = chat.scrollHeight;
}

function deleteLog(id) {
  // v8 JSON
  const arr = loadLogs();
  const next = arr.filter((x) => x.id !== id);
  if (arr.length !== next.length) {
    saveLogsJson(next);
    document.getElementById(`log-${id}`)?.remove();
    return;
  }

  // 旧v7 HTML（互換表示中）
  const el = document.getElementById(`log-${id}`);
  if (el) {
    el.remove();
    localStorage.setItem(STORAGE.legacyLogHtml, document.getElementById("chat-log")?.innerHTML || "");
  }
}

window.deleteLog = deleteLog;

function normalizeCommand(s) {
  return String(s).trim().replace(/\s+/g, "");
}

function clampInt(v, min, max) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function parseCommand(raw) {
  const trimmed = String(raw).trim();
  const normalized = normalizeCommand(raw);

  const dm = normalized.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
  if (dm) {
    const n = clampInt(parseInt(dm[1], 10), 1, 200);
    const side = clampInt(parseInt(dm[2], 10), 2, 1000000);
    const mod = dm[3] ? parseInt(dm[3], 10) : 0;
    return { type: "dice", input: normalized, n, side, mod };
  }

  const cm = normalized.match(/^choice\[(.*)\]$/i);
  if (cm) {
    const list = cm[1].split(",").map((x) => x.trim()).filter(Boolean);
    return { type: "choice", input: normalized, list };
  }

  return { type: "text", input: trimmed, text: trimmed };
}

function rollDiceOnce(n, side) {
  const rolls = [];
  for (let i = 0; i < n; i++) {
    rolls.push(Math.floor(Math.random() * side) + 1);
  }
  return rolls;
}

window.rollDice = () => {
  const name = document.getElementById("user-name")?.value?.trim() || "noname";
  const cmdInput = document.getElementById("dice-command");
  const raw = cmdInput?.value || "";
  const parsed = parseCommand(raw);
  if (!parsed.input || !String(parsed.input).trim()) return;

  const id = Date.now();

  if (parsed.type === "dice") {
    const rolls = rollDiceOnce(parsed.n, parsed.side);
    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + (parsed.mod || 0);

    appendLog({
      id,
      ts: nowIso(),
      name,
      type: "dice",
      input: parsed.input,
      rolls,
      mod: parsed.mod || 0,
      total,
    });
  } else if (parsed.type === "choice") {
    const pick = parsed.list.length ? parsed.list[Math.floor(Math.random() * parsed.list.length)] : "";
    appendLog({
      id,
      ts: nowIso(),
      name,
      type: "choice",
      input: parsed.input,
      pick,
    });
  } else {
    appendLog({
      id,
      ts: nowIso(),
      name,
      type: "text",
      input: parsed.input,
      text: parsed.text,
    });
  }

  if (cmdInput) cmdInput.value = "";
};

// Enter×2 送信（既存仕様維持）
let ent = 0;
document.addEventListener("DOMContentLoaded", () => {
  const cmd = document.getElementById("dice-command");
  if (!cmd) return;

  cmd.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ent++;
      if (ent >= 2) {
        rollDice();
        ent = 0;
      }
      setTimeout(() => (ent = 0), 500);
    }
  });
});

// -----------------------------
// H. 写真ドロップ（アルバム）
// -----------------------------
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

const dz = document.getElementById("drop-zone");
if (dz) {
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("hover");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("hover"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("hover");
    if (!lastPos) return alert("先に地図をクリックして地点を選択してください");

    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = JSON.parse(localStorage.getItem(STORAGE.album) || "[]");
        data.push({ lat: lastPos.lat, lng: lastPos.lng, src: ev.target.result });
        localStorage.setItem(STORAGE.album, JSON.stringify(data));
        renderAlbum();
      };
      reader.readAsDataURL(file);
    });
  });
}

function renderAlbum() {
  const data = JSON.parse(localStorage.getItem(STORAGE.album) || "[]");
  const grid = document.getElementById("album-grid");
  if (!grid) return;

  grid.innerHTML = "";

  // 重要：毎回クリアしてマーカー増殖を防ぐ
  if (albumMarkerLayer) albumMarkerLayer.clearLayers();

  data.forEach((item) => {
    if (albumMarkerLayer) {
      L.circleMarker([item.lat, item.lng], {
        radius: 6,
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.6,
      }).addTo(albumMarkerLayer);
    }

    const img = document.createElement("img");
    img.src = item.src;
    img.className = "album-img";
    img.loading = "lazy";
    grid.appendChild(img);
  });
}

// -----------------------------
// I. パネル開閉
// -----------------------------
window.togglePanel = () => {
  const p = document.getElementById("side-panel");
  const b = document.getElementById("toggle-panel");
  if (!p || !b) return;

  p.classList.toggle("closed");
  b.style.right = p.classList.contains("closed") ? "0px" : "350px";
  b.innerText = p.classList.contains("closed") ? "≪" : "≫";
};

// -----------------------------
// J. データ復元/リセット
// -----------------------------
function restoreData() {
  renderLogs();
  renderAlbum();
}

window.clearData = () => {
  if (!confirm("全データをリセットしますか？")) return;
  localStorage.clear();
  location.reload();
};

window.onload = init;

