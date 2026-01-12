// --- 1. 地図の初期化 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Dark' });
const map = L.map('map', { layers: [darkMap] }).setView([35.68, 139.76], 12);

// --- 2. マイマップ自動同期設定 ---
// URLから抽出したIDをセット
const kmlUrl = `https://www.google.com/maps/d/kml?mid=1vXvYV9v_V9v_V9v_V9v_V9v_V9v&forcekml=1`;
const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kmlUrl)}`;

async function syncMyMap() {
    try {
        const response = await fetch(proxyUrl);
        const kmlText = await response.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlText, 'text/xml');
        const track = new L.KML(kmlDom);

        // 古いマイマップレイヤーを削除して更新
        map.eachLayer((layer) => {
            if (layer instanceof L.KML) map.removeLayer(layer);
        });

        map.addLayer(track);
        
        // ピンがある場所に自動ズーム
        const bounds = track.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds);
        console.log("マイマップ同期完了");
    } catch (err) {
        console.error("同期失敗（共有設定を確認してください）:", err);
    }
}

// 初回読み込み
syncMyMap();

// --- 3. パネル・タブ・ダイス機能 ---

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

// ダイス送信（名前反映・アイコンなし）
function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);
    
    if (match) {
        const n = parseInt(match[1]), f = parseInt(match[2]);
        const mod = match[3] ? parseInt(match[3]) : 0;
        let results = [], sum = 0;
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
    const container = document.querySelector('.panel-main');
    container.scrollTop = container.scrollHeight;
}

// アルバム機能
const dropZone = document.getElementById('drop-zone');
if(dropZone){
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
}
