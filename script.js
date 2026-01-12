// 地図設定（ダークタイル）
const map = L.map('map', { zoomControl: false }).setView([35.6895, 139.6917], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// タブ切り替え
function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ダイス機能（ログ構造化）
function rollDice() {
    const cmd = document.getElementById('dice-command').value.trim() || "1d6";
    let message = "";
    let total = 0;

    if (cmd.match(/^\d+d\d+$/)) {
        const [n, f] = cmd.split('d').map(Number);
        let rs = [];
        for(let i=0; i<n; i++) { let r = Math.floor(Math.random()*f)+1; rs.push(r); total+=r; }
        message = `${cmd} ➔ <b>${total}</b> [${rs.join(', ')}]`;
    } else if (cmd.startsWith("choice{")) {
        const items = cmd.replace("choice{","").replace("}","").split(",");
        message = `choice ➔ <b>${items[Math.floor(Math.random()*items.length)].trim()}</b>`;
    }

    addLog(message);
    updateTransit(total);
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

// ドラッグ＆ドロップ実装
const dropZone = document.getElementById('drop-zone');
window.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.display = 'flex'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.display = 'none'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.display = 'none';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        alert(files[0].name + " をアルバムに追加しました（擬似処理）");
        // 本来はここにFirebase等へのアップロード処理を書く
    }
});

// 移動情報更新
function updateTransit(val) {
    if(val === 0) return;
    document.getElementById('train-type').innerText = val % 2 === 0 ? "急行 / 快速" : "各駅停車";
    document.getElementById('transfer-info').innerText = val > 10 ? "主要ターミナルで乗り換え推奨" : "直通運転あり";
}

// KML読み込み
fetch('spots.kml').then(r => r.text()).then(t => {
    const track = new L.KML(new DOMParser().parseFromString(t, 'text/xml'));
    map.addLayer(track);
});
