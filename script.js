// --- 1. 地図設定 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
const map = L.map('map', { layers: [darkMap] }).setView([35.68, 139.76], 12);

// マイマップID
const myMapId = '1zYjVv1_NfN_WkS5k5fW1X4X-fWk'; 

// マイマップ同期関数
async function syncMyMap() {
    const kmlUrl = `https://www.google.com/maps/d/kml?forcekml=1&mid=${myMapId}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kmlUrl)}`;

    try {
        const res = await fetch(proxyUrl);
        const kmlText = await res.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlText, 'text/xml');
        const track = new L.KML(kmlDom);
        
        map.eachLayer(l => { if(l instanceof L.KML) map.removeLayer(l); });
        map.addLayer(track);
        
        const bounds = track.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds);
    } catch (e) { console.error("Map sync error:", e); }
}
syncMyMap();

// --- 2. ログ保持・削除機能 ---
window.onload = () => {
    const saved = localStorage.getItem('chat-log-data');
    if (saved) document.getElementById('chat-log').innerHTML = saved;
};

function saveLog() {
    localStorage.setItem('chat-log-data', document.getElementById('chat-log').innerHTML);
}

function deleteLog(btn) {
    if(confirm('ログを削除しますか？')) {
        btn.closest('.log-item').remove();
        saveLog();
    }
}

// --- 3. ダイス・送信機能 (Enter 2回で送信) ---
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
    const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);
    if (match) {
        const n = parseInt(match[1]), f = parseInt(match[2]);
        const mod = match[3] ? parseInt(match[3]) : 0;
        let res = [], sum = 0;
        for(let i=0; i<n; i++){ let r = Math.floor(Math.random()*f)+1; res.push(r); sum+=r; }
        msg = `${cmd} (${res.join(',')})${mod!=0?(mod>0?'+'+mod:mod):""} ➔ <b>${sum+mod}</b>`;
    }

    const now = new Date();
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;

    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
        <div class="log-meta"><span class="log-name">${name}</span><span class="log-time">${timeStr}</span></div>
        <div class="log-msg">${msg}</div>
        <button class="delete-btn" onclick="deleteLog(this)">削除</button>
    `;
    log.appendChild(div);
    document.querySelector('.panel-main').scrollTop = log.scrollHeight;
    document.getElementById('dice-command').value = "";
    saveLog();
}

// --- 4. その他UI ---
function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    event.currentTarget.classList.add('active');
}

function togglePanel() {
    const p = document.getElementById('side-panel');
    const b = document.getElementById('toggle-panel');
    p.classList.toggle('closed');
    b.innerText = p.classList.contains('closed') ? '≪' : '≫';
    b.style.right = p.classList.contains('closed') ? '10px' : '360px';
}

// 写真ドロップ
const dz = document.getElementById('drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondrop = e => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result; img.className = 'album-img';
            document.getElementById('album-grid').appendChild(img);
        };
        r.readAsDataURL(f);
    });
};
