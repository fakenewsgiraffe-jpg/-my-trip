// --- 地図の定義 ---
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: 'Dark Mode'
});

const colorMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Color Map'
});

// 初期化（ダークモードで開始）
const map = L.map('map', { 
    zoomControl: true,
    layers: [darkMap] 
}).setView([35.6895, 139.6917], 10);

// 地図切り替えボタンの追加
const baseMaps = {
    "ダーク路線図": darkMap,
    "カラー地図": colorMap
};
L.control.layers(baseMaps).addTo(map);

// --- ダイス機能（計算式対応） ---
function rollDice() {
    const cmd = document.getElementById('dice-command').value.trim() || "1d6";
    let message = "";
    let total = 0;

    // choice{A,B} の判定
    if (cmd.startsWith("choice{")) {
        const items = cmd.replace("choice{","").replace("}","").split(",");
        message = `choice ➔ <b>${items[Math.floor(Math.random()*items.length)].trim()}</b>`;
    } 
    // NdM+X の判定 (例: 1d10+13)
    else if (cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/)) {
        const match = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);
        const n = parseInt(match[1]);
        const f = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;
        
        let rs = [];
        let diceTotal = 0;
        for(let i=0; i<n; i++) { 
            let r = Math.floor(Math.random()*f)+1; 
            rs.push(r); 
            diceTotal += r; 
        }
        total = diceTotal + modifier;
        const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : "";
        message = `${cmd} ➔ <b>${total}</b> [${rs.join(', ')}]${modStr}`;
    }

    if (message) {
        addLog(message);
        updateTransit(total);
        document.getElementById('dice-command').value = ""; // 入力欄を空に
    }
}

function addLog(msg) {
    const log = document.getElementById('chat-log');
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
        <div class="log-header"><span>Traveler</span><span>${new Date().toLocaleTimeString()}</span></div>
        <div class="log-msg">${msg}</div>
    `;
    log.prepend(item);
}

// 移動情報更新
function updateTransit(val) {
    if(val === 0) return;
    document.getElementById('train-type').innerText = val % 2 === 0 ? "急行 / 快速" : "各駅停車";
    document.getElementById('transfer-info').innerText = val > 15 ? "主要ターミナルで乗り換え推奨" : "直通運転あり";
    document.getElementById('station-tips').innerText = `${val}駅先周辺の情報をチェックしています...`;
}

// KML読み込み
fetch('spots.kml').then(r => r.text()).then(t => {
    const track = new L.KML(new DOMParser().parseFromString(t, 'text/xml'));
    map.addLayer(track);
});
