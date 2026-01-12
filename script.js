// --- 1. 地図・タイル設定 ---
const tiles = {
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
    rail: L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
        className: 'rail-line', // CSSでフィルタリングするためのクラス
        opacity: 0.8
    })
};

const map = L.map('map', { layers: [tiles.light], zoomControl: false }).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

// --- 2. 永続ストレージ ---
const save = (k, v) => localStorage.setItem(k, v);
const load = (k) => localStorage.getItem(k);

// --- 3. タブ切替 (確実に動作するように修正) ---
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${id}`).classList.add('active');
    document.getElementById(`tab-btn-${id}`).classList.add('active');

    if (id === 'transit') {
        map.removeLayer(tiles.light);
        tiles.dark.addTo(map);
        tiles.rail.addTo(map);
    } else {
        map.removeLayer(tiles.dark);
        map.removeLayer(tiles.rail);
        tiles.light.addTo(map);
    }
}

// --- 4. ダイス機能 (Enter 2回 / localStorage保存) ---
let enterCnt = 0;
document.getElementById('dice-command').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enterCnt++;
        if (enterCnt >= 2) { rollDice(); enterCnt = 0; }
        setTimeout(() => enterCnt = 0, 500);
    }
});

function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;
    let res = cmd;
    const dm = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
    const cm = cmd.match(/choice\[(.*?)\]/);

    if (dm) {
        let s = 0, rolls = [];
        for(let i=0; i<parseInt(dm[1]); i++) { let r=Math.floor(Math.random()*parseInt(dm[2]))+1; rolls.push(r); s+=r; }
        let mod = dm[3] ? parseInt(dm[3]) : 0;
        res = `${cmd} (${rolls.join(',')})${mod!=0?mod:''} ➔ <b>${s+mod}</b>`;
    } else if (cm) {
        const items = cm[1].split(',');
        res = `${cmd} ➔ <b>${items[Math.floor(Math.random()*items.length)].trim()}</b>`;
    }

    const log = document.getElementById('chat-log');
    log.innerHTML += `<div class="log-item"><div class="log-meta">${name}</div><div>${res}</div></div>`;
    save('v7_log', log.innerHTML);
    document.getElementById('dice-command').value = "";
    log.scrollTop = log.scrollHeight;
}

// --- 5. アルバム機能 (localStorage保存) ---
let lastPos = null;
map.on('click', e => {
    lastPos = e.latlng;
    L.popup().setLatLng(e.latlng).setContent("場所を選択しました").openOn(map);
});

const dz = document.getElementById('drop-zone');
dz.ondrop = e => {
    e.preventDefault();
    if (!lastPos) return alert("地図をクリックしてください");
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            let data = JSON.parse(load('v7_album') || "[]");
            data.push({ ...lastPos, src: ev.target.result });
            save('v7_album', JSON.stringify(data));
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};
dz.ondragover = e => e.preventDefault();

function renderAlbum() {
    const data = JSON.parse(load('v7_album') || "[]");
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    data.forEach(d => {
        L.marker([d.lat, d.lng]).addTo(map);
        const img = document.createElement('img');
        img.src = d.src; img.className = 'album-img';
        grid.appendChild(img);
    });
}

const togglePanel = () => document.getElementById('side-panel').classList.toggle('closed');
const clearData = () => { if(confirm('全消去？')) { localStorage.clear(); location.reload(); } };
const searchRoute = () => document.getElementById('route-res').innerText = "経路表示(GeoJSON連携準備完了)";

window.onload = () => {
    document.getElementById('chat-log').innerHTML = load('v7_log') || "";
    renderAlbum();
};
