// --- 1. 地図レイヤー設定 ---
const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: 'Color' });
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
// 鉄道レイヤー（色分けのベース）
const railwayTiles = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', { maxZoom: 19 });

const map = L.map('map', { 
    layers: [lightTiles], // 初期はカラー
    zoomControl: false 
}).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

let lastLatLng = null;
let albumData = JSON.parse(localStorage.getItem('album-data')) || [];

// --- 2. 指定カラーコードの適用 ---

function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.getElementById('tab-btn-' + id).classList.add('active');

    if (id === 'transit') {
        map.removeLayer(lightTiles);
        darkTiles.addTo(map);
        railwayTiles.addTo(map);
    } else {
        if (map.hasLayer(railwayTiles)) map.removeLayer(railwayTiles);
        map.removeLayer(darkTiles);
        lightTiles.addTo(map);
    }
}

// --- 3. ダイス機能 (noname初期値/Enter2回) ---
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

    appendLog(name, msg);
    document.getElementById('dice-command').value = "";
}

function appendLog(name, msg) {
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-meta"><b>${name}</b></div><div class="log-msg">${msg}</div>`;
    log.appendChild(div);
    localStorage.setItem('chat-log-html', log.innerHTML);
}

// --- 4. アルバム機能 (永続化) ---
map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('pos-display').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("この場所に写真を登録できます").openOn(map);
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
            localStorage.setItem('album-data', JSON.stringify(albumData));
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};

function renderAlbum() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    albumData.forEach(item => {
        const marker = L.marker([item.lat, item.lng]).addTo(map);
        marker.bindPopup(`<img src="${item.src}" width="150">`);
        const img = document.createElement('img');
        img.src = item.src; img.className = 'album-img';
        img.onclick = () => { map.setView([item.lat, item.lng], 15); marker.openPopup(); };
        grid.appendChild(img);
    });
}

function togglePanel() {
    document.getElementById('side-panel').classList.toggle('closed');
}

window.onload = () => {
    renderAlbum();
    const savedLog = localStorage.getItem('chat-log-html');
    if (savedLog) document.getElementById('chat-log').innerHTML = savedLog;
};

function searchRoute() {
    const f = document.getElementById('station-from').value;
    const t = document.getElementById('station-to').value;
    document.getElementById('route-result').innerText = `${f} ➔ ${t} の経路を計算中...`;
}

