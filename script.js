// --- 地図初期化 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
const map = L.map('map', { layers: [darkMap] }).setView([35.68, 139.76], 12);

// --- 折り畳み機能 ---
function togglePanel() {
    const panel = document.getElementById('side-panel');
    const btn = document.getElementById('toggle-panel');
    panel.classList.toggle('closed');
    btn.style.right = panel.classList.contains('closed') ? '10px' : '360px';
    btn.innerText = panel.classList.contains('closed') ? '≪' : '≫';
}

// --- タブ切り替え ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- ダイス送信 ---
function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);
    
    if (match) {
        const n = parseInt(match[1]), f = parseInt(match[2]);
        const mod = match[3] ? parseInt(match[3]) : 0;
        let total = mod;
        for(let i=0; i<n; i++) total += Math.floor(Math.random() * f) + 1;
        msg = `${cmd} ➔ <b>${total}</b>`;
    }

    addLog(name, msg);
    document.getElementById('dice-command').value = "";
}

function addLog(name, msg) {
    const log = document.getElementById('chat-log');
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `<div class="log-name">${name}</div><div>${msg}</div>`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
}

// --- アルバム（ドラッグ＆ドロップ） ---
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = 'album-img';
            document.getElementById('album-grid').appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// --- KML読み込み（spots.kmlがある場合のみ） ---
fetch('spots.kml').then(r => r.text()).then(t => {
    const track = new L.KML(new DOMParser().parseFromString(t, 'text/xml'));
    map.addLayer(track);
}).catch(e => console.log("KML load skip"));


