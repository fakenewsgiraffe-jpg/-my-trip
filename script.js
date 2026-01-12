// --- 1. 地図・タイル設定 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
// 路線図用タイル (ThunderforestなどはAPIキーが必要なため、公共のCartoDBベースを推奨)
const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: 'Light' });

const map = L.map('map', { 
    layers: [darkMap],
    zoomControl: false 
}).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

// GoogleマイマップIDとKML同期
const myMapId = '1zYjVv1_NfN_WkS5k5fW1X4X-fWk'; 
async function syncMyMap() {
    // 注: 実際の公開KML URL。CORS回避のためプロキシを使用
    const kmlUrl = `https://www.google.com/maps/d/kml?mid=${myMapId}&forcekml=1`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kmlUrl)}`;

    try {
        const res = await fetch(proxyUrl);
        const kmlText = await res.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlText, 'text/xml');
        const track = new L.KML(kmlDom);
        map.addLayer(track);
        
        // マイマップの場所をクリックした時の情報表示を強化
        track.on('add', function() {
            const bounds = track.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds);
        });
    } catch (e) { console.warn("MyMap Sync Error: Check if ID is public", e); }
}
syncMyMap();

// アルバム用：最後にクリックした座標
let lastLatLng = null;
map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('selected-pos-info').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("この場所に写真を紐付けます").openOn(map);
});

// --- 2. ダイス機能 (choice対応) ---
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
            enterTimer = setTimeout(() => { enterCount = 0; }, 500);
        }
    }
});

function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;

    // 1. choice機能: choice[A,B,C]
    if (cmd.startsWith('choice[')) {
        const match = cmd.match(/choice\[(.*?)\]/);
        if (match) {
            const items = match[1].split(',').map(s => s.trim());
            const picked = items[Math.floor(Math.random() * items.length)];
            msg = `${cmd} ➔ <b>${picked}</b>`;
        }
    } 
    // 2. 通常ダイス: 1d100+10
    else {
        const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
        if (match) {
            const n = parseInt(match[1]), f = parseInt(match[2]);
            const mod = match[3] ? parseInt(match[3]) : 0;
            let res = [], sum = 0;
            for(let i=0; i<n; i++){ let r = Math.floor(Math.random()*f)+1; res.push(r); sum+=r; }
            msg = `${cmd} (${res.join(',')})${mod!=0?(mod>0?'+'+mod:mod):""} ➔ <b>${sum+mod}</b>`;
        }
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
    saveLog();
}

function saveLog() { localStorage.setItem('chat-log-data', document.getElementById('chat-log').innerHTML); }
function deleteLog(btn) { if(confirm('ログを削除しますか？')) { btn.closest('.log-item').remove(); saveLog(); } }
window.onload = () => { 
    const saved = localStorage.getItem('chat-log-data');
    if (saved) document.getElementById('chat-log').innerHTML = saved;
};

// --- 3. タブ・UI制御 ---
function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    event.currentTarget.classList.add('active');

    // 路線図タブの時は地図を明るく（路線を見やすく）する
    if (id === 'transit') {
        map.removeLayer(darkMap);
        lightMap.addTo(map);
    } else {
        map.removeLayer(lightMap);
        darkMap.addTo(map);
    }
}

function togglePanel() {
    const p = document.getElementById('side-panel');
    const b = document.getElementById('toggle-panel');
    p.classList.toggle('closed');
    b.innerText = p.classList.contains('closed') ? '≪' : '≫';
    b.style.right = p.classList.contains('closed') ? '10px' : '360px';
}

// --- 4. 路線検索UIロジック ---
function searchRoute() {
    const from = document.getElementById('station-from').value;
    const to = document.getElementById('station-to').value;
    if(!from || !to) return;
    // ここにAPI連携を入れる。現在はUIデモとして表示
    document.getElementById('route-result').innerHTML = `
        <div style="font-size:0.8em; color:#888">経路候補</div>
        ${from} → (JR山手線) → ${to}<br>
        <span style="color:#fff">所要時間: 約15分 / 200円</span>
    `;
}

// --- 5. 写真紐付けアルバム ---
const dz = document.getElementById('drop-zone');
dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = "#00d1ff"; };
dz.ondragleave = () => { dz.style.borderColor = "#333"; };
dz.ondrop = e => {
    e.preventDefault();
    dz.style.borderColor = "#333";
    if (!lastLatLng) { alert("先に地図上の場所をクリックしてください"); return; }

    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const imgSrc = ev.target.result;
            // 地図にマーカー設置
            const marker = L.marker(lastLatLng).addTo(map);
            marker.bindPopup(`<img src="${imgSrc}" width="150"><br>登録地点`).openPopup();
            
            // アルバムに追加
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'album-img';
            img.onclick = () => {
                map.setView(marker.getLatLng(), 15);
                marker.openPopup();
            };
            document.getElementById('album-grid').appendChild(img);
        };
        r.readAsDataURL(f);
    });
};
