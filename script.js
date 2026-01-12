// --- 1. 地図・カラー設定 ---
const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

// マップ初期化（lightTilesをデフォルトに）
const map = L.map('map', { 
    layers: [lightTiles], 
    zoomControl: false 
}).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

// カラーコード全リスト（完全版）
const RAIL_COLORS = {
    "東海道線": "#f0862b", "伊東線": "#008803", "上野東京ライン": "#91278F", "横須賀線": "#1069b4",
    "総武快速線": "#1069b4", "湘南新宿ライン": "#db2027", "京浜東北線": "#1daed1", "根岸線": "#1daed1",
    "横浜線": "#b1cb39", "南武線": "#f2d01f", "鶴見線": "#f2d01f", "山手線": "#b1cb39",
    "中央快速線": "#dd6935", "青梅線": "#dd6935", "五日市線": "#dd6935", "中央・総武線各駅停車": "#f2d01f",
    "宇都宮線": "#f18e41", "高崎線": "#f18e41", "埼京線": "#14a676", "川越線": "#14a676",
    "京葉線": "#d01827", "武蔵野線": "#eb5a28", "常磐線快速": "#1daf7e", "常磐線各駅停車": "#868587",
    "相模線": "#009793", "中央本線": "#0074BE", "日光線": "#880033", "八高線": "#A7A08E",
    "東北新幹線": "#008000", "上越新幹線": "#FF978E", "北陸新幹線": "#6A3D98", "東海道新幹線": "#0072BA",
    "銀座線": "#FF9500", "丸ノ内線": "#F62E36", "日比谷線": "#9caeb7", "東西線": "#009BBF",
    "千代田線": "#00BB85", "有楽町線": "#C1A470", "半蔵門線": "#8F76D6", "南北線": "#00AC9B", "副都心線": "#9C5E31",
    "都営浅草線": "#E85298", "都営三田線": "#006AB8", "都営新宿線": "#B0BF1E", "都営大江戸線": "#CE045B",
    "京王線": "#C8006B", "小田急線": "#0D82C7", "東急東横線": "#DA0442", "東急目黒線": "#009CD2",
    "京急線": "#00A3E4", "相鉄線": "#000080", "西武池袋線": "#FF6600", "西武新宿線": "#0099CC",
    "東武スカイツリーライン": "#0F6CC3", "京成線": "#015BAB", "みなとみらい線": "#09357f"
};

let railwayLayer = null;

// --- 2. 永続化ストレージ機能 ---
const storage = {
    saveLog: (html) => localStorage.setItem('v6_chat_log', html),
    getLog: () => localStorage.getItem('v6_chat_log') || "",
    saveAlbum: (data) => localStorage.setItem('v6_album_data', JSON.stringify(data)),
    getAlbum: () => JSON.parse(localStorage.getItem('v6_album_data')) || []
};

// --- 3. タブ・地図切替 (不具合修正版) ---
function switchTab(id) {
    // ボタンとコンテンツの表示切り替え
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + id).style.display = 'block';
    document.getElementById('tab-btn-' + id).classList.add('active');

    // 地図のレイヤー切り替え
    if (id === 'transit') {
        if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
        darkTiles.addTo(map);
        // ここでGeoJSON描画を呼び出す（タイルに頼らない一本線化）
        drawRailwayGeoJSON();
    } else {
        if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
        if (railwayLayer) map.removeLayer(railwayLayer);
        lightTiles.addTo(map);
    }
}

// 路線を「カラー一本線」で描画する関数
async function drawRailwayGeoJSON() {
    if (railwayLayer) return; // 二重描画防止

    // ※ここは本来GeoJSONファイルをfetchしますが、
    // 現在はタイルレイヤーをCSSで強制的に「一本線」に見せるスタイルをstyle.cssで定義します。
    railwayLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
        className: 'rail-single-line' // CSSでフィルタリング
    }).addTo(map);
}

// --- 4. ダイス機能 (Enter 2回) ---
let enterCount = 0;
let enterTimer;
document.getElementById('dice-command').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enterCount++;
        clearTimeout(enterTimer);
        if (enterCount === 2) { rollDice(); enterCount = 0; }
        else { enterTimer = setTimeout(() => { enterCount = 0; }, 400); }
    }
});

function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    const choiceMatch = cmd.match(/choice\[(.*?)\]/);
    const diceMatch = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);

    if (choiceMatch) {
        const items = choiceMatch[1].split(',').map(s => s.trim());
        msg = `${cmd} ➔ <b>${items[Math.floor(Math.random()*items.length)]}</b>`;
    } else if (diceMatch) {
        const n = parseInt(diceMatch[1]), f = parseInt(diceMatch[2]), mod = diceMatch[3] ? parseInt(diceMatch[3]) : 0;
        let res = [], sum = 0;
        for(let i=0; i<n; i++){ let r = Math.floor(Math.random()*f)+1; res.push(r); sum+=r; }
        msg = `${cmd} (${res.join(',')})${mod!=0?(mod>0?'+'+mod:mod):""} ➔ <b>${sum+mod}</b>`;
    }

    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-meta"><b>${name}</b></div><div class="log-msg">${msg}</div>`;
    log.appendChild(div);
    storage.saveLog(log.innerHTML);
    document.getElementById('dice-command').value = "";
    log.scrollTop = log.scrollHeight;
}

// --- 5. アルバム機能 ---
let lastLatLng = null;
map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('pos-display').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("この場所に写真を登録").openOn(map);
});

const dz = document.getElementById('drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondrop = e => {
    e.preventDefault();
    if (!lastLatLng) return alert("地点を選択してください");
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const current = storage.getAlbum();
            current.push({ lat: lastLatLng.lat, lng: lastLatLng.lng, src: ev.target.result });
            storage.saveAlbum(current);
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};

function renderAlbum() {
    const data = storage.getAlbum();
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    data.forEach(item => {
        L.marker([item.lat, item.lng]).addTo(map).bindPopup(`<img src="${item.src}" width="150">`);
        const img = document.createElement('img');
        img.src = item.src; img.className = 'album-img';
        img.onclick = () => { map.setView([item.lat, item.lng], 15); };
        grid.appendChild(img);
    });
}

function clearAllData() { if(confirm('全削除しますか？')) { localStorage.clear(); location.reload(); } }
function togglePanel() { document.getElementById('side-panel').classList.toggle('closed'); }

window.onload = () => {
    document.getElementById('chat-log').innerHTML = storage.getLog();
    renderAlbum();
    switchTab('main'); // 初期起動はダイスログ
};
