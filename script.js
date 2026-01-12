// --- 1. 地図・タイル設定 ---
// ベースのダークマップ
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
// 詳細路線図レイヤー (OpenRailwayMap)
const railwayTiles = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Railway'
});

const map = L.map('map', { 
    layers: [darkTiles],
    zoomControl: false 
}).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

let lastLatLng = null;
let albumData = JSON.parse(localStorage.getItem('album-data')) || [];

// 起動時にアルバムデータを復元
window.addEventListener('load', () => {
    loadChatLog();
    renderAlbum();
});

map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('selected-pos-info').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("この場所に写真を紐付けます").openOn(map);
});

// --- 2. ダイス機能 ---
let enterCount = 0;
let enterTimer;

document.getElementById('dice-command').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enterCount++;
        clearTimeout(enterTimer);
        if (enterCount === 2) {
            rollDice();
            enterCount = 0;
        } else {
            enterTimer = setTimeout(() => { enterCount = 0; }, 400);
        }
    }
});

function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    if (cmd.includes('choice[')) {
        const match = cmd.match(/choice\[(.*?)\]/);
        if (match) {
            const items = match[1].split(',').map(s => s.trim());
            const picked = items[Math.floor(Math.random() * items.length)];
            msg = `${cmd} ➔ <b>${picked}</b>`;
        }
    } else if (cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i)) {
        const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
        const n = parseInt(match[1]), f = parseInt(match[2]);
        const mod = match[3] ? parseInt(match[3]) : 0;
        let res = [], sum = 0;
        for(let i=0; i<n; i++){ let r = Math.floor(Math.random()*f)+1; res.push(r); sum+=r; }
        msg = `${cmd} (${res.join(',')})${mod!=0?(mod>0?'+'+mod:mod):""} ➔ <b>${sum+mod}</b>`;
    }

    appendLog(name, msg);
    document.getElementById('dice-command').value = "";
}

function appendLog(name, msg) {
    const log = document.getElementById('chat-log');
    const now = new Date();
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
        <div class="log-meta"><span class="log-name">${name}</span><span class="log-time">${timeStr}</span></div>
        <div class="log-msg">${msg}</div>
        <button class="delete-btn" onclick="deleteLog(this)">削除</button>
    `;
    log.appendChild(div);
    document.querySelector('.panel-main').scrollTop = log.scrollHeight;
    saveChatLog();
}

function saveChatLog() { localStorage.setItem('chat-log-data', document.getElementById('chat-log').innerHTML); }
function loadChatLog() {
    const saved = localStorage.getItem('chat-log-data');
    if (saved) document.getElementById('chat-log').innerHTML = saved;
}
function deleteLog(btn) { if(confirm('ログを削除しますか？')) { btn.closest('.log-item').remove(); saveChatLog(); } }

// --- 3. タブ・路線図切り替え ---
function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    event.currentTarget.classList.add('active');

    // 路線図タブの場合、黒基調のまま詳細路線タイルを重ねる
    if (id === 'transit') {
        if (!map.hasLayer(railwayTiles)) railwayTiles.addTo(map);
    } else {
        if (map.hasLayer(railwayTiles)) map.removeLayer(railwayTiles);
    }
}

function togglePanel() {
    const p = document.getElementById('side-panel');
    const b = document.getElementById('toggle-panel');
    p.classList.toggle('closed');
    b.innerText = p.classList.contains('closed') ? '≪' : '≫';
    b.style.right = p.classList.contains('closed') ? '10px' : '360px';
}

// --- 4. アルバム（永続化対応） ---
const dz = document.getElementById('drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondrop = e => {
    e.preventDefault();
    if (!lastLatLng) { alert("地図をクリックして場所を決めてください"); return; }
    
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const newItem = {
                lat: lastLatLng.lat,
                lng: lastLatLng.lng,
                img: ev.target.result // Base64形式で保存
            };
            albumData.push(newItem);
            saveAlbum();
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};

function renderAlbum() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    // 既存のマーカーを一旦クリアしたい場合はここで map.eachLayer などで制御
    
    albumData.forEach((data, index) => {
        // マーカーを地図に追加
        const marker = L.marker([data.lat, data.lng]).addTo(map);
        marker.bindPopup(`<img src="${data.img}" width="150">`);

        // サイドバーのグリッドに追加
        const img = document.createElement('img');
        img.src = data.img;
        img.className = 'album-img';
        img.onclick = () => {
            map.setView([data.lat, data.lng], 16);
            marker.openPopup();
        };
        grid.appendChild(img);
    });
}

function saveAlbum() { localStorage.setItem('album-data', JSON.stringify(albumData)); }
function clearAlbum() { if(confirm('アルバムを全削除しますか？')) { albumData = []; saveAlbum(); location.reload(); } }

function searchRoute() {
    const from = document.getElementById('station-from').value;
    const to = document.getElementById('station-to').value;
    if(!from || !to) return;
    document.getElementById('route-result').innerHTML = `
        <div style="font-size:0.8em; color:#888">経路候補</div>
        ${from} → (詳細路線表示中) → ${to}<br>
        <span style="color:#00d1ff">地図上の路線を確認してください</span>
    `;
}
