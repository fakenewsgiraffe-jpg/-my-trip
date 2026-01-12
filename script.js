// --- 地図設定 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
const map = L.map('map', { layers: [darkMap] }).setView([35.68, 139.76], 12);

// パネル折り畳み
function togglePanel() {
    const panel = document.getElementById('side-panel');
    const btn = document.getElementById('toggle-panel');
    panel.classList.toggle('closed');
    btn.style.right = panel.classList.contains('closed') ? '10px' : '360px';
    btn.innerText = panel.classList.contains('closed') ? '≪' : '≫';
}

// タブ切り替え
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ダイス送信
function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);
    
    if (match) {
        const n = parseInt(match[1]), f = parseInt(match[2]);
        const mod = match[3] ? parseInt(match[3]) : 0;
        let results = [];
        let sum = 0;
        for(let i=0; i<n; i++) {
            let r = Math.floor(Math.random() * f) + 1;
            results.push(r);
            sum += r;
        }
        const total = sum + mod;
        const modText = mod !== 0 ? (mod > 0 ? `+${mod}` : mod) : "";
        msg = `${cmd} (${results.join(',')})${modText} ➔ <b>${total}</b>`;
    }

    addLog(name, msg);
    document.getElementById('dice-command').value = "";
}

function addLog(name, msg) {
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-name">${name}</div><div class="log-msg">${msg}</div>`;
    log.appendChild(div);
    // 自動スクロール
    const container = document.querySelector('.panel-main');
    container.scrollTop = container.scrollHeight;
}

// アルバム：ドラッグ＆ドロップ
const dropZone = document.getElementById('drop-zone');
dropZone.ondragover = (e) => e.preventDefault();
dropZone.ondrop = (e) => {
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
};

// KMLの読み込み（データ本体が必要）
fetch('spots.kml')
    .then(res => res.text())
    .then(kmlText => {
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlText, 'text/xml');
        const track = new L.KML(kmlDom);
        map.addLayer(track);
        const bounds = track.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds);
    }).catch(err => console.error("KML data not found. Please export without NetworkLink check."));
