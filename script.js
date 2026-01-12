// --- 1. 地図レイヤー設定 ---
// カラー地図 (ダイスログ・情報タブ用)
const colorTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: 'Color' });
// 黒基調地図 (路線図タブ用)
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
// 鉄道タイル (OpenRailwayMap)
const railwayTiles = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: 'Railway'
});

const map = L.map('map', { 
    layers: [colorTiles], // 初期はカラー
    zoomControl: false 
}).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

// データ永続化変数
let lastLatLng = null;
let albumData = JSON.parse(localStorage.getItem('album-data')) || [];

// --- 2. タブ・地図モード切り替え ---
function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    event.currentTarget.classList.add('active');

    // 地図の切り替えロジック
    if (id === 'transit') {
        // 路線図タブ：黒基調＋詳細路線
        map.removeLayer(colorTiles);
        darkTiles.addTo(map);
        railwayTiles.addTo(map);
        document.getElementById('map').classList.add('rail-mode');
    } else {
        // ダイスログ・情報タブ：カラー地図
        if (map.hasLayer(railwayTiles)) map.removeLayer(railwayTiles);
        map.removeLayer(darkTiles);
        colorTiles.addTo(map);
        document.getElementById('map').classList.remove('rail-mode');
    }
}

// --- 3. アルバム機能 (localStorage対応) ---
map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('pos-display').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("ここに写真を登録できます").openOn(map);
});

const dz = document.getElementById('drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondrop = e => {
    e.preventDefault();
    if (!lastLatLng) { alert("地点を選択してください"); return; }
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const data = { lat: lastLatLng.lat, lng: lastLatLng.lng, src: ev.target.result };
            albumData.push(data);
            saveAlbum();
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};

function renderAlbum() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    // 既存のマーカー削除（簡易実装のためリロード推奨だが、ここでは全描画）
    albumData.forEach(item => {
        const marker = L.marker([item.lat, item.lng]).addTo(map);
        marker.bindPopup(`<img src="${item.src}" width="150">`);
        const img = document.createElement('img');
        img.src = item.src;
        img.className = 'album-img';
        img.onclick = () => { map.setView([item.lat, item.lng], 15); marker.openPopup(); };
        grid.appendChild(img);
    });
}
function saveAlbum() { localStorage.setItem('album-data', JSON.stringify(albumData)); }
function clearAlbum() { if(confirm('全データを削除しますか？')) { localStorage.removeItem('album-data'); location.reload(); } }

// --- 4. ダイスロール (Enter 2回送信) ---
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

    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-meta"><b>${name}</b></div><div class="log-msg">${msg}</div>`;
    document.getElementById('chat-log').appendChild(div);
    document.getElementById('dice-command').value = "";
    localStorage.setItem('chat-log-save', document.getElementById('chat-log').innerHTML);
}

// 初期化
window.onload = () => {
    renderAlbum();
    const savedLog = localStorage.getItem('chat-log-save');
    if (savedLog) document.getElementById('chat-log').innerHTML = savedLog;
};

function togglePanel() {
    const p = document.getElementById('side-panel');
    p.classList.toggle('closed');
}
function searchRoute() {
    const f = document.getElementById('station-from').value;
    const t = document.getElementById('station-to').value;
    document.getElementById('transfer-info').innerText = `${f} から ${t} への経路を表示中...`;
}
