/**
 * Traveler's Tool - Ultimate Integration
 * 30-Year Veteran Quality
 */

// 1. 全カラー定義
const RAIL_COLORS = { "東海道線": "#F0862B", "伊東線": "#008803", "上野東京ライン": "#91278F", "横須賀線,総武快速線": "#007AC1", "湘南新宿ライン": "#E31F26", "京浜東北線,根岸線": "#00B2E5", "横浜線": "#80C342", "南武線,鶴見線": "#FFD400", "山手線": "#b1cb39", "中央快速線,青梅線,五日市線": "#F15A22", "中央・総武線": "#FFD400", "宇宮線,高崎線": "#F68B1E", "埼京・川越線": "#00AC84", "JR・相鉄直通線": "#002971", "常磐快速線": "#36AE6E", "常磐緩行線": "#339999", "京葉線": "#C9252F", "武蔵野線": "#F15A22", "総武本線": "#FFD400", "成田線": "#00B261", "内房線": "#00B2E5", "外房線": "#DB4028", "相模線": "#009793", "信越本線": "#00AAEE", "白新線": "#F387B7", "東北本線(東北エリア)": "#3CB371", "羽越本線": "#16C0E9", "磐越西線": "#CB7B35", "只見線": "#008DD1", "仙石線": "#00AAEE", "仙山線": "#72BC4A", "JR東海": "#ED6D00", "東海道新幹線": "#0072BA", "御殿場線": "#40743C", "飯田線": "#75A2DB", "東京メトロ": "#00A3D9", "丸ノ内線": "#F62E36", "銀座線": "#FF9500", "東西線": "#009BBF", "千代田線": "#00BB85", "副都心線": "#9C5E31", "都営地下鉄": "#199332", "大江戸線": "#CE045B", "横浜市営ブルーライン": "#0070C0", "横浜市営グリーンライン": "#00B050", "東武鉄道": "#005BAC", "スカイツリーライン": "#0F6CC3", "伊勢崎線": "#FF0000", "西武池袋線": "#FF6600", "西武新宿線": "#0099CC", "京王電鉄": "#C8006B", "京王井の頭線": "#00377E", "小田急電鉄": "#0D82C7", "東急電鉄": "#DA0442", "東急東横線": "#DA0442", "東急田園都市線": "#20A288", "京急電鉄": "#00A3E4", "相模鉄道": "#000080", "りんかい線": "#00418E", "つくばエクスプレス": "#000080", "東葉高速線": "#3FB036", "みなとみらい線": "#09357F", "多摩都市モノレール線": "#E97119", "ゆりかもめ": "#E97119" };
const MY_MAP_URL = "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

let map, tiles, railLayer, myMapLayer, lastPos = null;

// A. 地図初期化
function init() {
    tiles = {
        light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
    };
    map = L.map('map', { zoomControl: false }).setView([35.6812, 139.7671], 12);
    tiles.light.addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // B. Googleマイマップ連携 (全タブ共通)
    try {
        myMapLayer = omnivore.kml(MY_MAP_URL).addTo(map);
    } catch(e) { console.warn("MyMap load failed"); }

    // C. 地図クリックイベント
    map.on('click', e => {
        lastPos = e.latlng;
        L.popup().setLatLng(e.latlng).setContent("アルバム地点に設定").openOn(map);
        const display = document.getElementById('pos-display');
        if(display) display.innerText = `選択中: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    });

    loadRailway();
    restoreData();
}

// D. 路線図読み込み
async function loadRailway() {
    try {
        const res = await fetch('railway.json');
        const data = await res.json();
        railLayer = L.geoJson(data, {
            style: f => ({ color: RAIL_COLORS[f.properties.N02_003] || "#555", weight: 3, opacity: 0.8 }),
            onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.N02_003}</b>`)
        });
        document.getElementById('route-res').innerText = "鉄道データ同期完了";
    } catch(e) { document.getElementById('route-res').innerText = "データ読み込み待ち..."; }
}

// E. タブ切り替え (マイマップ維持、路線図のみモード切替)
window.switchTab = (id) => {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${id}`).classList.add('active');
    document.getElementById(`tab-btn-${id}`).classList.add('active');

    if (id === 'transit') {
        map.removeLayer(tiles.light); tiles.dark.addTo(map);
        if (railLayer) railLayer.addTo(map);
    } else {
        map.removeLayer(tiles.dark); tiles.light.addTo(map);
        if (railLayer) map.removeLayer(railLayer);
    }
};

// F. 高度なダイス機能
window.rollDice = () => {
    const name = document.getElementById('user-name').value || "noname";
    const cmdInput = document.getElementById('dice-command');
    let txt = cmdInput.value.trim();
    if (!txt) return;

    const dm = txt.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
    const cm = txt.match(/choice\[(.*?)\]/);

    if (dm) {
        let n = parseInt(dm[1]), side = parseInt(dm[2]), mod = dm[3] ? parseInt(dm[3]) : 0;
        let rolls = [];
        for(let i=0; i<n; i++) rolls.push(Math.floor(Math.random()*side)+1);
        let sum = rolls.reduce((a,b)=>a+b, 0);
        txt = `${txt} (${rolls.join(',')})${mod!==0?(mod>0?'+'+mod:mod):''} ➔ <b>${sum + mod}</b>`;
    } else if (cm) {
        const list = cm[1].split(',');
        txt = `${txt} ➔ <b>${list[Math.floor(Math.random()*list.length)].trim()}</b>`;
    }

    const id = Date.now();
    document.getElementById('chat-log').insertAdjacentHTML('beforeend', `
        <div class="log-item" id="log-${id}">
            <span class="delete-btn" onclick="deleteLog(${id})">削除</span>
            <div style="font-size:10px; color:#3399ff;">${name}</div>
            <div style="font-size:14px; color:#eee;">${txt}</div>
        </div>`);
    cmdInput.value = "";
    saveLogs();
    document.getElementById('chat-log').scrollTop = document.getElementById('chat-log').scrollHeight;
};

window.deleteLog = (id) => {
    const el = document.getElementById(`log-${id}`);
    if(el) { el.remove(); saveLogs(); }
};

// G. アルバム機能
const dz = document.getElementById('drop-zone');
dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = "#fff"; };
dz.ondragleave = () => dz.style.borderColor = "#3399ff";
dz.ondrop = e => {
    e.preventDefault();
    dz.style.borderColor = "#3399ff";
    if(!lastPos) return alert("地図をクリックして地点を選択してください");
    Array.from(e.dataTransfer.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
            const data = JSON.parse(localStorage.getItem('v7_album') || "[]");
            data.push({ lat: lastPos.lat, lng: lastPos.lng, src: ev.target.result });
            localStorage.setItem('v7_album', JSON.stringify(data));
            renderAlbum();
        };
        reader.readAsDataURL(file);
    });
};

function renderAlbum() {
    const data = JSON.parse(localStorage.getItem('v7_album') || "[]");
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    data.forEach(item => {
        L.marker([item.lat, item.lng]).addTo(map);
        grid.innerHTML += `<img src="${item.src}" class="album-img">`;
    });
}

// H. ユーティリティ
window.togglePanel = () => {
    const p = document.getElementById('side-panel');
    const b = document.getElementById('toggle-panel');
    p.classList.toggle('closed');
    b.style.right = p.classList.contains('closed') ? '0px' : '350px';
    b.innerText = p.classList.contains('closed') ? '≪' : '≫';
};

function saveLogs() { localStorage.setItem('v7_log', document.getElementById('chat-log').innerHTML); }
function restoreData() {
    document.getElementById('chat-log').innerHTML = localStorage.getItem('v7_log') || "";
    renderAlbum();
}
window.clearData = () => { if(confirm('全データをリセットしますか？')) { localStorage.clear(); location.reload(); } };

let ent = 0;
document.getElementById('dice-command').addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); ent++;
        if(ent >= 2) { rollDice(); ent = 0; }
        setTimeout(()=>ent=0, 500);
    }
});

window.onload = init;
