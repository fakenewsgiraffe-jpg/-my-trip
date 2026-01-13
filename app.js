/* =========================================================
   My Trip Tool - Unified "Best" Build (v2026-01)
   - Cocofolia-like side panel + log + composer
   - Logs: JSON保存 / 検索 / 種別フィルタ / ピン / 削除
   - Dice: spaces OK, repeat (3#), judge (>= <= > < =), choice[]
   - Album: map click -> drop images -> cards + map markers + Hover HUD
   - Railway: railway.json (lines) + colors (dict + hash fallback) + glow in transit mode
   - Stations: stations_jre.geojson (points) show/hide in transit mode
   - MyMap: KML sync (leaflet-omnivore) with URL or local path
   - Export/Import / Clear all
========================================================= */

/* ====== あなたの巨大な RAIL_COLORS はここに貼る（そのまま） ====== */
const RAIL_COLORS = {
  // 例:
  // "山手線": "#b1cb39",
  // "京浜東北線,根岸線": "#00B2E5",
};

/* ====== Files ====== */
const FILES = {
  railway: "railway.json",
  stations: "stations_jre.geojson",
  defaultKml: "mymap.kml",
};

const STORAGE_KEY = "mytrip_state_v202601";

/* ---------- Utilities ---------- */
function nowISO(){ return new Date().toISOString(); }
function fmtTime(iso){
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}
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
function hashColor(str){
  const s = String(str||"");
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  const c = (h & 0xFFFFFF).toString(16).padStart(6,"0");
  return `#${c}`;
}

/* ---------- State ---------- */
let state = {
  logs: [],   // [{id, ts, name, type: chat|dice|photo, ... , pinned}]
  album: [],  // [{id, ts, lat, lng, title, tags[], people[], memo, src}]
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

  map = L.map("map", { zoomControl: false }).setView([35.6812, 139.7671], 12);
  tiles.light.addTo(map);
  L.control.zoom({ position: "bottomleft" }).addTo(map);

  // Pane for rails (glow)
  railPane = map.createPane("railPane");
  railPane.classList.add("rail-glow");
  railPane.style.zIndex = 450;

  // Album markers layer group
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

/* ---------- Railway ---------- */
function buildColorMap(){
  return new Map(Object.entries(RAIL_COLORS).map(([k,v])=>[norm(k), v]));
}

function slimRailwayGeoJSON(data){
  return {
    type: "FeatureCollection",
    features: (data.features || []).map(f => ({
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
        const key = norm(raw);
        const color = colorMap.get(key) || hashColor(key || "rail");
        return { color, weight: 3, opacity: 0.92 };
      },
      onEachFeature: (f, layer)=>{
        const name = f?.properties?.N02_003 || "路線";
        layer.bindPopup(`<b>${escapeHtml(name)}</b>`);
      }
    });

    if (status) status.innerText = "路線データ同期完了";
  }catch(e){
    console.warn(e);
    if (status) status.innerText = "路線データ読み込み失敗";
  }
}

/* ---------- Stations ---------- */
function slimStationsGeoJSON(data){
  return {
    type: "FeatureCollection",
    features: (data.features || []).map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        station: f?.properties?.N02_005 ?? "",
        line: f?.properties?.N02_003 ?? "",
        operator: f?.properties?.N02_004 ?? ""
      }
    }))
  };
}

async function loadStations(){
  try{
    const res = await fetch(FILES.stations);
    if (!res.ok) throw new Error(`${FILES.stations} ${res.status}`);
    const data = await res.json();
    const slim = slimStationsGeoJSON(data);

    if (stationLayer) { try{ map.removeLayer(stationLayer); }catch{} }

    stationLayer = L.geoJson(slim, {
      pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
        radius: 2.5,
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.75
      }),
      onEachFeature: (f, layer)=>{
        const st = f?.properties?.station || "駅";
        const ln = f?.properties?.line || "";
        layer.bindPopup(`<b>${escapeHtml(st)}</b><br>${escapeHtml(ln)}`);
      }
    });

    // transit タブが開いていて、表示ONなら追加
    if (document.getElementById("tab-transit")?.classList.contains("active") && state.stationsVisible){
      if (!map.hasLayer(stationLayer)) stationLayer.addTo(map);
    }
  }catch(e){
    console.warn(e);
  }
}

/* ---------- MyMap (KML) ---------- */
function initKmlUi(){
  const input = document.getElementById("kml-url");
  if (!input) return;
  input.value = state.kmlUrl || FILES.defaultKml;
  input.addEventListener("change", ()=>{
    state.kmlUrl = input.value.trim() || FILES.defaultKml;
    saveState();
  });
}

window.reloadMyMap = () => {
  const input = document.getElementById("kml-url");
  const status = document.getElementById("kml-status");
  const url = (input?.value?.trim() || state.kmlUrl || FILES.defaultKml).trim();
  state.kmlUrl = url;
  saveState();

  if (myMapLayer){
    try{ map.removeLayer(myMapLayer); }catch{}
    myMapLayer = null;
  }

  try{
    myMapLayer = omnivore.kml(url)
      .on("ready", ()=>{
        if (status) status.innerText = `MyMap: 同期OK（${url}）`;
      })
      .on("error", ()=>{
        if (status) status.innerText = `MyMap: 失敗（${url}）`;
      })
      .addTo(map);

    if (status) status.innerText = `MyMap: 同期中（${url}）...`;
  }catch(e){
    console.warn(e);
    if (status) status.innerText = `MyMap: 失敗（${url}）`;
  }
};

/* ---------- Logs ---------- */
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function addLog(entry){
  state.logs.push(entry);
  saveState();
  renderLogs();
}
function deleteLog(id){
  state.logs = state.logs.filter(x=>x.id !== id);
  saveState();
  renderLogs();
}
function togglePin(id){
  const it = state.logs.find(x=>x.id===id);
  if (!it) return;
  it.pinned = !it.pinned;
  saveState();
  renderLogs();
}

function matchesQuery(item, q){
  if (!q) return true;
  const s = q.toLowerCase();
  const fields = [];
  fields.push(item.name || "");
  if (item.type === "chat") fields.push(item.text || "");
  if (item.type === "dice") fields.push(item.dice?.input || "", item.dice?.detail || "");
  if (item.type === "photo") fields.push(item.photo?.title || "", (item.photo?.tags||[]).join(","), (item.photo?.people||[]).join(","), item.photo?.memo || "");
  return fields.join(" ").toLowerCase().includes(s);
}

function filterLogs(){
  const q = (state.ui.q || "").trim();
  const f = state.ui.filter;

  let list = [...state.logs];

  list.sort((a,b)=>{
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.ts.localeCompare(b.ts);
  });

  return list.filter(item=>{
    if (f === "pinned" && !item.pinned) return false;
    if (f !== "all" && f !== "pinned" && item.type !== f) return false;
    return matchesQuery(item, q);
  });
}

function renderLogs(){
  const box = document.getElementById("chat-log");
  if (!box) return;
  box.innerHTML = "";

  const list = filterLogs();
  list.forEach(item=>{
    const el = document.createElement("div");
    el.className = "log-item";

    const head = document.createElement("div");
    head.className = "log-head";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "8px";
    left.style.alignItems = "center";

    const type = document.createElement("span");
    type.className = "log-type";
    type.textContent = item.type === "chat" ? "CHAT" : item.type === "dice" ? "DICE" : "PHOTO";

    const name = document.createElement("span");
    name.className = "log-name";
    name.textContent = item.name || "noname";

    left.appendChild(type);
    left.appendChild(name);

    const right = document.createElement("div");
    right.className = "log-actions";

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = fmtTime(item.ts);

    const pin = document.createElement("span");
    pin.className = "action-link" + (item.pinned ? " pinned" : "");
    pin.textContent = item.pinned ? "📌" : "📍";
    pin.title = "ピン留め";
    pin.onclick = ()=>togglePin(item.id);

    const del = document.createElement("span");
    del.className = "action-link";
    del.textContent = "削除";
    del.onclick = ()=>deleteLog(item.id);

    right.appendChild(time);
    right.appendChild(pin);
    right.appendChild(del);

    head.appendChild(left);
    head.appendChild(right);

    const body = document.createElement("div");
    body.className = "log-body";

    if (item.type === "chat"){
      body.textContent = item.text || "";
    } else if (item.type === "dice"){
      // XSS避け：textContentで表示（改行OK）
      body.textContent = item.dice?.detail || "";
    } else if (item.type === "photo"){
      const p = item.photo || {};
      const lines = [];
      lines.push(`📷 ${p.title || "写真"}`);
      if (p.memo) lines.push(p.memo);
      if (p.tags?.length) lines.push(`タグ: ${p.tags.join(", ")}`);
      if (p.people?.length) lines.push(`同行者: ${p.people.join(", ")}`);
      body.textContent = lines.join("\n");
    }

    el.appendChild(head);
    el.appendChild(body);
    box.appendChild(el);
  });

  box.scrollTop = box.scrollHeight;
}

/* ---------- Dice ---------- */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function roll(n, sides){
  const arr = [];
  for (let i=0;i<n;i++) arr.push(Math.floor(Math.random()*sides)+1);
  return arr;
}
function judge(total, op, target){
  if (op === ">=") return total >= target;
  if (op === "<=") return total <= target;
  if (op === ">") return total > target;
  if (op === "<") return total < target;
  return total === target;
}
function parseDiceExpr(expr){
  const m = String(expr).match(/^(\d+)d(\d+)([+\-]\d+)?$/i);
  if (!m) return null;
  const n = clamp(parseInt(m[1],10), 1, 200);
  const sides = clamp(parseInt(m[2],10), 2, 1000000);
  const mod = m[3] ? parseInt(m[3],10) : 0;
  const normalized = `${n}d${sides}${mod ? (mod>0?`+${mod}`:`${mod}`) : ""}`;
  return { n, sides, mod, expr: normalized };
}

/**
 * Supported:
 * - NdM (+/-K) with spaces (e.g. "1d10 + 10")
 * - repeat: "3#1d6"
 * - judge: "1d100>=60", "1d6<4", "1d20=20"
 * - choice[a,b]
 * - else: chat
 */
function parseCommand(input){
  const raw = String(input || "").trim();
  if (!raw) return { kind:"empty" };

  const noSpace = raw.replace(/\s+/g,"");

  const cm = noSpace.match(/^choice\[(.*)\]$/i);
  if (cm){
    const list = cm[1].split(",").map(x=>x.trim()).filter(Boolean);
    return { kind:"choice", input: noSpace, list };
  }

  const rm = noSpace.match(/^(\d+)#(.+)$/);
  if (rm){
    const count = clamp(parseInt(rm[1],10), 1, 50);
    return { kind:"repeat", count, inner: rm[2] };
  }

  const jm = noSpace.match(/^(.+?)(>=|<=|>|<|=)(-?\d+)$/);
  if (jm){
    const expr = jm[1];
    const op = jm[2];
    const target = parseInt(jm[3],10);
    const dice = parseDiceExpr(expr);
    if (!dice) return { kind:"chat", text: raw };
    return { kind:"judge", input: noSpace, dice, op, target };
  }

  const dice = parseDiceExpr(noSpace);
  if (dice) return { kind:"dice", input: noSpace, dice };

  return { kind:"chat", text: raw };
}

window.quickDice = (s)=>{
  const ta = document.getElementById("dice-command");
  ta.value = s;
  ta.focus();
};

window.sendMessage = ()=>{
  const name = document.getElementById("user-name")?.value?.trim() || "noname";
  const ta = document.getElementById("dice-command");
  const input = String(ta?.value || "");

  const parsed = parseCommand(input);
  if (parsed.kind === "empty") return;

  const idBase = Date.now();

  if (parsed.kind === "chat"){
    addLog({ id:idBase, ts:nowISO(), name, type:"chat", text: parsed.text, pinned:false });
  }
  else if (parsed.kind === "choice"){
    const pick = parsed.list.length ? parsed.list[Math.floor(Math.random()*parsed.list.length)] : "";
    addLog({
      id:idBase, ts:nowISO(), name, type:"dice", pinned:false,
      dice:{ input: parsed.input, detail: `${parsed.input} ➔ ${pick}` }
    });
  }
  else if (parsed.kind === "dice"){
    const rolls = roll(parsed.dice.n, parsed.dice.sides);
    const sum = rolls.reduce((a,b)=>a+b,0);
    const total = sum + parsed.dice.mod;
    const modText = parsed.dice.mod ? (parsed.dice.mod>0?` +${parsed.dice.mod}`:` ${parsed.dice.mod}`) : "";
    const detail = `${parsed.dice.expr} (${rolls.join(",")})${modText} ➔ ${total}`;
    addLog({ id:idBase, ts:nowISO(), name, type:"dice", pinned:false, dice:{ input: parsed.input, detail } });
  }
  else if (parsed.kind === "judge"){
    const rolls = roll(parsed.dice.n, parsed.dice.sides);
    const sum = rolls.reduce((a,b)=>a+b,0);
    const total = sum + parsed.dice.mod;
    const ok = judge(total, parsed.op, parsed.target);
    const verdict = ok ? "✅成功" : "❌失敗";
    const modText = parsed.dice.mod ? (parsed.dice.mod>0?` +${parsed.dice.mod}`:` ${parsed.dice.mod}`) : "";
    const detail = `${parsed.dice.expr} (${rolls.join(",")})${modText} ➔ ${total}  ${parsed.op}${parsed.target}  ${verdict}`;
    addLog({ id:idBase, ts:nowISO(), name, type:"dice", pinned:false, dice:{ input: parsed.input, detail } });
  }
  else if (parsed.kind === "repeat"){
    const inner = parseCommand(parsed.inner);
    if (inner.kind === "dice"){
      const lines = [];
      for (let i=0;i<parsed.count;i++){
        const rr = roll(inner.dice.n, inner.dice.sides);
        const sum = rr.reduce((a,b)=>a+b,0);
        const total = sum + inner.dice.mod;
        lines.push(`${i+1}: ${inner.dice.expr} (${rr.join(",")}) ➔ ${total}`);
      }
      addLog({
        id:idBase, ts:nowISO(), name, type:"dice", pinned:false,
        dice:{ input: `${parsed.count}#${inner.dice.expr}`, detail: lines.join("\n") }
      });
    } else {
      addLog({ id:idBase, ts:nowISO(), name, type:"chat", text: input.trim(), pinned:false });
    }
  }

  if (ta) ta.value = "";
};

// Enter×2送信（Shift+Enter改行）
let enterCount = 0;
document.addEventListener("keydown", (e)=>{
  const ta = document.getElementById("dice-command");
  if (!ta) return;
  if (document.activeElement !== ta) return;

  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    enterCount++;
    if (enterCount >= 2){
      sendMessage();
      enterCount = 0;
    }
    setTimeout(()=>enterCount=0, 450);
  }
});

/* ---------- Album ---------- */
function getAlbumInputs(){
  return {
    title: document.getElementById("album-title")?.value?.trim() || "",
    tags: splitCSV(document.getElementById("album-tags")?.value || ""),
    people: splitCSV(document.getElementById("album-people")?.value || ""),
    memo: document.getElementById("album-memo")?.value?.trim() || ""
  };
}
function resetAlbumInputs(){
  const a = (id, v)=>{ const el = document.getElementById(id); if (el) el.value = v; };
  a("album-title","");
  a("album-tags","");
  a("album-people","");
  a("album-memo","");
}

function showHud(item){
  const hud = document.getElementById("hud");
  const thumb = document.getElementById("hud-thumb");
  const title = document.getElementById("hud-title");
  const meta = document.getElementById("hud-meta");
  const tags = document.getElementById("hud-tags");

  thumb.style.backgroundImage = `url(${item.src})`;
  title.textContent = item.title || "写真";
  meta.textContent =
    `${fmtTime(item.ts)}\n` +
    `(${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})\n` +
    `${item.memo || ""}`.trim();
  tags.textContent =
    `${item.tags?.length ? "タグ: "+item.tags.join(", ") : ""}` +
    `${item.people?.length ? (item.tags?.length ? " / " : "") + "同行者: "+item.people.join(", ") : ""}`;

  hud.classList.remove("hidden");
}
function hideHud(){
  document.getElementById("hud")?.classList.add("hidden");
}

function renderAlbum(){
  const grid = document.getElementById("album-grid");
  if (!grid) return;
  grid.innerHTML = "";

  albumLayerGroup.clearLayers();

  state.album.forEach(item=>{
    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 6, weight: 1, opacity: 0.95, fillOpacity: 0.65
    }).addTo(albumLayerGroup);

    marker.on("mouseover", ()=>showHud(item));
    marker.on("mouseout", hideHud);

    const card = document.createElement("div");
    card.className = "album-card";

    const img = document.createElement("img");
    img.className = "album-img";
    img.src = item.src;
    img.loading = "lazy";
    img.onclick = ()=>{
      map.setView([item.lat, item.lng], Math.max(map.getZoom(), 14));
      showHud(item);
      setTimeout(hideHud, 1500);
    };

    const meta = document.createElement("div");
    meta.className = "album-meta";

    const title = document.createElement("div");
    title.innerHTML = `<b>${escapeHtml(item.title || "写真")}</b>`;

    const t = document.createElement("div");
    t.className = "small";
    t.textContent = fmtTime(item.ts);

    const tag = document.createElement("div");
    tag.className = "small";
    tag.textContent = item.tags?.length ? `タグ: ${item.tags.join(", ")}` : "";

    const ppl = document.createElement("div");
    ppl.className = "small";
    ppl.textContent = item.people?.length ? `同行者: ${item.people.join(", ")}` : "";

    const memo = document.createElement("div");
    memo.className = "small";
    memo.textContent = item.memo || "";

    const act = document.createElement("div");
    act.className = "small";
    act.style.marginTop = "6px";
    const del = document.createElement("span");
    del.className = "action-link";
    del.textContent = "削除";
    del.onclick = ()=>{
      state.album = state.album.filter(x=>x.id !== item.id);
      saveState();
      renderAlbum();
    };
    act.appendChild(del);

    meta.appendChild(title);
    meta.appendChild(t);
    if (tag.textContent) meta.appendChild(tag);
    if (ppl.textContent) meta.appendChild(ppl);
    if (memo.textContent) meta.appendChild(memo);
    meta.appendChild(act);

    card.appendChild(img);
    card.appendChild(meta);
    grid.appendChild(card);
  });
}

function initAlbumDrop(){
  const dz = document.getElementById("drop-zone");
  if (!dz) return;

  window.addEventListener("dragover", e=>e.preventDefault());
  window.addEventListener("drop", e=>e.preventDefault());

  dz.addEventListener("dragover",(e)=>{ e.preventDefault(); dz.classList.add("hover"); });
  dz.addEventListener("dragleave",()=>dz.classList.remove("hover"));
  dz.addEventListener("drop",(e)=>{
    e.preventDefault();
    dz.classList.remove("hover");

    if (!lastPos) return alert("先に地図をクリックして地点を選択してください");

    const files = [...(e.dataTransfer.files||[])].filter(f=>f.type.startsWith("image/"));
    if (!files.length) return;

    const meta = getAlbumInputs();
    const author = document.getElementById("user-name")?.value?.trim() || "noname";

    files.forEach(file=>{
      const reader = new FileReader();
      reader.onload = (ev)=>{
        const id = Date.now() + Math.floor(Math.random()*1000);
        const entry = {
          id, ts: nowISO(),
          lat: lastPos.lat, lng: lastPos.lng,
          title: meta.title,
          tags: meta.tags,
          people: meta.people,
          memo: meta.memo,
          src: ev.target.result
        };
        state.album.push(entry);

        // 写真イベントをログにも残す
        state.logs.push({
          id: id + 1,
          ts: nowISO(),
          name: author,
          type: "photo",
          photo: { title: entry.title, tags: entry.tags, people: entry.people, memo: entry.memo },
          pinned: false
        });

        saveState();
        renderAlbum();
        renderLogs();
        resetAlbumInputs();
      };
      reader.readAsDataURL(file);
    });
  });
}

window.clearAlbum = ()=>{
  if (!confirm("アルバムだけ消しますか？")) return;
  state.album = [];
  saveState();
  renderAlbum();
};

/* ---------- Search/Filter UI ---------- */
function initLogControls(){
  const search = document.getElementById("log-search");
  if (search){
    search.value = state.ui.q || "";
    search.addEventListener("input", ()=>{
      state.ui.q = search.value;
      saveState();
      renderLogs();
    });
  }

  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      state.ui.filter = btn.dataset.filter;
      saveState();
      renderLogs();
    });
  });

  const active = [...document.querySelectorAll(".chip")].find(b=>b.dataset.filter===state.ui.filter);
  if (active){
    document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
    active.classList.add("active");
  }
}

/* ---------- Export/Import ---------- */
window.exportData = ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mytrip_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

function initImport(){
  const input = document.getElementById("import-file");
  if (!input) return;
  input.addEventListener("change", async ()=>{
    const file = input.files?.[0];
    if (!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") throw new Error("invalid json");
      if (!Array.isArray(parsed.logs) || !Array.isArray(parsed.album)) throw new Error("missing logs/album");

      // 互換：足りないキーがあっても補う
      state.logs = parsed.logs;
      state.album = parsed.album;
      state.ui = parsed.ui || { filter:"all", q:"" };
      state.kmlUrl = typeof parsed.kmlUrl === "string" ? parsed.kmlUrl : (state.kmlUrl || FILES.defaultKml);
      state.stationsVisible = typeof parsed.stationsVisible === "boolean" ? parsed.stationsVisible : true;

      saveState();
      renderAlbum();
      renderLogs();
      initKmlUi();
      alert("インポート完了");
      input.value = "";
    }catch(e){
      console.warn(e);
      alert("インポート失敗：JSON形式を確認してください");
    }
  });
}

window.clearAllData = ()=>{
  if (!confirm("全データをリセットしますか？")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

/* ---------- Boot ---------- */
function boot(){
  loadState();
  initMap();
  initKmlUi();

  // UI
  initAlbumDrop();
  initLogControls();
  initImport();

  // Data
  renderAlbum();
  renderLogs();

  // Map layers
  loadRailway().then(()=>{
    // 初期は通常モードなのでレイヤーは付けない（transitで表示）
  });
  loadStations();

  // MyMap auto sync (保存済みURLがあるなら)
  const kmlInput = document.getElementById("kml-url");
  if (kmlInput){
    kmlInput.value = state.kmlUrl || FILES.defaultKml;
  }
  reloadMyMap();

  // start tab
  switchTab("main");
}

window.onload = boot;
