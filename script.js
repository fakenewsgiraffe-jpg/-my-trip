// --- 1. 定数と初期設定 ---
const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
// 路線図：一本線にするため、標準タイルをフィルタリングして使用
const railwayTiles = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    className: 'custom-rail-layer' // CSSで色を一本線化
});

const map = L.map('map', { layers: [lightTiles], zoomControl: false }).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

// カラーコード全リスト
const RAIL_COLORS = {const RAIL_COLORS = {
  "東海道線": "#F0862B",
  "伊東線": "#008803",
  "上野東京ライン": "#91278F",
  "横須賀線,総武快速線": "#007AC1",
  "湘南新宿ライン": "#E31F26",
  "京浜東北線,根岸線": "#00B2E5",
  "横浜線": "#80C342",
  "南武線,鶴見線": "#FFD400",
  "山手線": "#b1cb39",
  "中央快速線,青梅線,五日市線": "#F15A22",
  "中央・総武線": "#FFD400",
  "宇都宮線,高崎線": "#F68B1E",
  "埼京・川越線": "#00AC84",

  // JR東日本（続き）
  "JR・相鉄直通線": "#002971",
  "常磐快速線": "#36AE6E",
  "常磐緩行線": "#339999",
  "京葉線": "#C9252F",
  "武蔵野線": "#F15A22",
  "総武本線": "#FFD400",
  "成田線": "#00B261",
  "成田線我孫子支線": "#36AE6E",
  "内房線": "#00B2E5",
  "外房線": "#DB4028",
  "相模線": "#009793",

  // JR東日本（信越・東北エリアなど）
  "信越本線": "#00AAEE",
  "白新線": "#F387B7",
  "東北本線(東北エリア)": "#3CB371",
  "羽越本線": "#16C0E9",
  "磐越西線": "#CB7B35",
  "只見線": "#008DD1",
  "仙石線": "#00AAEE",
  "仙山線": "#72BC4A",

  // JR東海
  "JR東海": "#ED6D00",
  "東海道新幹線": "#0072BA",
  "御殿場線": "#40743C",
  "飯田線": "#75A2DB",

  // 地下鉄
  "東京メトロ": "#00A3D9",
  "丸ノ内線": "#F62E36",
  "銀座線": "#FF9500",
  "東西線": "#009BBF",
  "千代田線": "#00BB85",
  "副都心線": "#9C5E31",
  "都営地下鉄": "#199332",
  "大江戸線": "#CE045B",

  // 横浜市営地下鉄
  "横浜市営ブルーライン": "#0070C0",
  "横浜市営グリーンライン": "#00B050",

  // 私鉄
  "東武鉄道": "#005BAC",
  "スカイツリーライン": "#0F6CC3",
  "伊勢崎線": "#FF0000",
  "西武池袋線": "#FF6600",
  "西武新宿線": "#0099CC",
  "京王電鉄": "#C8006B",
  "京王井の頭線": "#00377E",
  "小田急電鉄": "#0D82C7",
  "東急電鉄": "#DA0442",
  "東急東横線": "#DA0442",
  "東急田園都市線": "#20A288",
  "京急電鉄": "#00A3E4",
  "相模鉄道": "#000080",
  "りんかい線": "#00418E",
  "つくばエクスプレス": "#000080",
  "東葉高速線": "#3FB036",
  "みなとみらい線": "#09357F",

  // モノレール・新交通
  "多摩都市モノレール線": "#E97119",
  "ゆりかもめ": "#E97119"
};

};
   
};

let lastLatLng = null;

// --- 2. 永続化ストレージ機能 ---
const storage = {
    saveLog: (html) => localStorage.setItem('v6_chat_log', html),
    getLog: () => localStorage.getItem('v6_chat_log') || "",
    saveAlbum: (data) => localStorage.setItem('v6_album_data', JSON.stringify(data)),
    getAlbum: () => JSON.parse(localStorage.getItem('v6_album_data')) || []
};

// --- 3. タブ・地図切替 ---
function switchTab(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.getElementById('tab-btn-' + id).classList.add('active');

    if (id === 'transit') {
        map.removeLayer(lightTiles);
        darkTiles.addTo(map);
        railwayTiles.addTo(map);
        document.body.classList.add('dark-mode');
    } else {
        if (map.hasLayer(railwayTiles)) map.removeLayer(railwayTiles);
        map.removeLayer(darkTiles);
        lightTiles.addTo(map);
        document.body.classList.remove('dark-mode');
    }
}

// --- 4. ダイス機能 ---
let enterCount = 0;
let enterTimer;
document.getElementById('dice-command').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enterCount++;
        clearTimeout(enterTimer);
        if (enterCount === 2) { rollDice(); enterCount = 0; }
        else { enterTimer = setTimeout(() => { enterCount = 0; }, 400); }
    }
});

function rollDice() {
    const name = document.getElementById('user-name').value || "noname";
    const cmd = document.getElementById('dice-command').value.trim();
    if (!cmd) return;

    let msg = cmd;
    const choiceMatch = cmd.match(/choice\[(.*?)\]/);
    const diceMatch = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);

    if (choiceMatch) {
        const items = choiceMatch[1].split(',').map(s => s.trim());
        msg = `${cmd} ➔ <b>${items[Math.floor(Math.random()*items.length)]}</b>`;
    } else if (diceMatch) {
        const n = parseInt(diceMatch[1]), f = parseInt(diceMatch[2]), mod = diceMatch[3] ? parseInt(diceMatch[3]) : 0;
        let res = [], sum = 0;
        for(let i=0; i<n; i++){ let r = Math.floor(Math.random()*f)+1; res.push(r); sum+=r; }
        msg = `${cmd} (${res.join(',')})${mod!=0?(mod>0?'+'+mod:mod):""} ➔ <b>${sum+mod}</b>`;
    }

    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-meta"><b>${name}</b></div><div class="log-msg">${msg}</div>`;
    log.appendChild(div);
    storage.saveLog(log.innerHTML);
    document.getElementById('dice-command').value = "";
    log.scrollTop = log.scrollHeight;
}

// --- 5. アルバム機能 ---
map.on('click', (e) => {
    lastLatLng = e.latlng;
    document.getElementById('pos-display').innerText = `選択中: ${lastLatLng.lat.toFixed(4)}, ${lastLatLng.lng.toFixed(4)}`;
    L.popup().setLatLng(e.latlng).setContent("ここに写真を登録").openOn(map);
});

const dz = document.getElementById('drop-zone');
dz.ondragover = e => e.preventDefault();
dz.ondrop = e => {
    e.preventDefault();
    if (!lastLatLng) return alert("地点を選択してください");
    Array.from(e.dataTransfer.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => {
            const current = storage.getAlbum();
            current.push({ lat: lastLatLng.lat, lng: lastLatLng.lng, src: ev.target.result });
            storage.saveAlbum(current);
            renderAlbum();
        };
        r.readAsDataURL(f);
    });
};

function renderAlbum() {
    const data = storage.getAlbum();
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    data.forEach(item => {
        const marker = L.marker([item.lat, item.lng]).addTo(map);
        const img = document.createElement('img');
        img.src = item.src; img.className = 'album-img';
        img.onclick = () => { map.setView([item.lat, item.lng], 15); marker.openPopup(); };
        grid.appendChild(img);
    });
}

function clearAllData() { if(confirm('全削除しますか？')) { localStorage.clear(); location.reload(); } }
function togglePanel() { document.getElementById('side-panel').classList.toggle('closed'); }

window.onload = () => {
    document.getElementById('chat-log').innerHTML = storage.getLog();
    renderAlbum();
};
