// --- 1. 全路線のカラーコードリスト ---
const RAIL_COLORS = {
  "東海道線": "#F0862B", "伊東線": "#008803", "上野東京ライン": "#91278F",
  "横須賀線,総武快速線": "#007AC1", "湘南新宿ライン": "#E31F26", "京浜東北線,根岸線": "#00B2E5",
  "横浜線": "#80C342", "南武線,鶴見線": "#FFD400", "山手線": "#b1cb39",
  "中央快速線,青梅線,五日市線": "#F15A22", "中央・総武線": "#FFD400", "宇都宮線,高崎線": "#F68B1E",
  "埼京・川越線": "#00AC84", "JR・相鉄直通線": "#002971", "常磐快速線": "#36AE6E",
  "常磐緩行線": "#339999", "京葉線": "#C9252F", "武蔵野線": "#F15A22",
  "総武本線": "#FFD400", "成田線": "#00B261", "成田線我孫子支線": "#36AE6E",
  "内房線": "#00B2E5", "外房線": "#DB4028", "相模線": "#009793",
  "信越本線": "#00AAEE", "白新線": "#F387B7", "東北本線(東北エリア)": "#3CB371",
  "羽越本線": "#16C0E9", "磐越西線": "#CB7B35", "只見線": "#008DD1",
  "仙石線": "#00AAEE", "仙山線": "#72BC4A", "JR東海": "#ED6D00",
  "東海道新幹線": "#0072BA", "御殿場線": "#40743C", "飯田線": "#75A2DB",
  "東京メトロ": "#00A3D9", "丸ノ内線": "#F62E36", "銀座線": "#FF9500",
  "東西線": "#009BBF", "千代田線": "#00BB85", "副都心線": "#9C5E31",
  "都営地下鉄": "#199332", "大江戸線": "#CE045B", "横浜市営ブルーライン": "#0070C0",
  "横浜市営グリーンライン": "#00B050", "東武鉄道": "#005BAC", "スカイツリーライン": "#0F6CC3",
  "伊勢崎線": "#FF0000", "西武池袋線": "#FF6600", "西武新宿線": "#0099CC",
  "京王電鉄": "#C8006B", "京王井の頭線": "#00377E", "小田急電鉄": "#0D82C7",
  "東急電鉄": "#DA0442", "東急東横線": "#DA0442", "東急田園都市線": "#20A288",
  "京急電鉄": "#00A3E4", "相模鉄道": "#000080", "りんかい線": "#00418E",
  "つくばエクスプレス": "#000080", "東葉高速線": "#3FB036", "みなとみらい線": "#09357F",
  "多摩都市モノレール線": "#E97119", "ゆりかもめ": "#E97119"
};

const MY_MAP_URL = "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

// --- 2. 地図の基本設定 ---
let map, tiles, railLayer = null;
let lastPos = null;

function initMap() {
    tiles = {
        light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
    };
    map = L.map('map', { zoomControl: false }).setView([35.6812, 139.7671], 12);
    tiles.light.addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // 地図クリックで写真地点を保持
    map.on('click', e => {
        lastPos = e.latlng;
        document.getElementById('pos-display').innerText = `地点を選択: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
        L.popup().setLatLng(e.latlng).setContent("ここで写真を登録できます").openOn(map);
    });
}

// --- 3. タブとUI ---
window.switchTab = function(id) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${id}`).classList.add('active');
    document.getElementById(`tab-btn-${id}`).classList.add('active');

    if (id === 'transit') {
        map.removeLayer(tiles.light);
        tiles.dark.addTo(map);
        if (railLayer) railLayer.addTo(map);
    } else {
        map.removeLayer(tiles.dark);
        tiles.light.addTo(map);
        if (railLayer) map.removeLayer(railLayer);
    }
};

window.togglePanel = () => document.getElementById('side-panel').classList.toggle('closed');

// --- 4. データ読み込み ---
async function loadData() {
    try {
        if (typeof omnivore !== 'undefined') omnivore.kml(MY_MAP_URL).addTo(map);
    } catch (e) { console.warn("MyMap failed"); }

    try {
        const res = await fetch('railway.json');
        const data = await res.json();
        railLayer = L.geoJson(data, {
            style: f => ({
                color: RAIL_COLORS[f.properties.N02_003] || "#888888",
                weight: 3, opacity: 0.8
            }),
            onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.N02_003}</b><br>${f.properties.N02_004}`)
        });
        document.getElementById('route-res').innerText = "路線図の読み込みが完了しました";
    } catch (e) { document.getElementById('route-res').innerText = "データのロードに失敗しました"; }
}

// --- 5. ダイス機能 ---
let enterCnt = 0;
window.rollDice = function() {
    const name = document.getElementById('user-name').value || "noname";
    const cmdInput = document.getElementById('dice-command');
    const cmd = cmdInput.value.trim();
    if (!cmd) return;

    let res = cmd;
    const dm = cmd.match(/^(\d+)d(\d+)([\+\-]\d+)?$/i);
    const cm = cmd.match(/choice\[(.*?)\]/);

    if (dm) {
        let s = 0, rolls = [];
        for(let i=0; i<parseInt(dm[1]); i++){
            let r = Math.floor(Math.random()*parseInt(dm[2]))+1;
            rolls.push(r); s+=r;
        }
        let mod = dm[3] ? parseInt(dm[3]) : 0;
        res = `${cmd} (${rolls.join(',')})${mod!=0?(mod>0?'+'+mod:mod):''} ➔ <b>${s+mod}</b>`;
    } else if (cm) {
        const items = cm[1].split(',');
        res = `${cmd} ➔ <b>${items[Math.floor(Math.random()*items.length)].trim()}</b>`;
    }

    const log = document.getElementById('chat-log');
    log.innerHTML += `<div style="border-left:3px solid #007bff; padding:5px; margin-bottom:10px; background:#222;">
        <div style="font-size:10px; color:#888;">${name}</div><div>${res}</div></div>`;
    localStorage.setItem('v7_log', log.innerHTML);
    cmdInput.value = "";
    log.scrollTop = log.scrollHeight;
};

// --- 6. 写真アルバム機能 ---
function initAlbum() {
    const dz = document.getElementById('drop-zone');
    dz.ondragover = e => { e.preventDefault(); dz.style.background = "#333"; };
    dz.ondragleave = () => { dz.style.background = "transparent"; };
    dz.ondrop = e => {
        e.preventDefault();
        dz.style.background = "transparent";
        if (!lastPos) return alert("先に地図をクリックして地点を選択してください！");

        Array.from(e.dataTransfer.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                let data = JSON.parse(localStorage.getItem('v7_album') || "[]");
                data.push({ lat: lastPos.lat, lng: lastPos.lng, src: ev.target.result });
                localStorage.setItem('v7_album', JSON.stringify(data));
                renderAlbum();
            };
            reader.readAsDataURL(file);
        });
    };
    renderAlbum();
}

function renderAlbum() {
    const data = JSON.parse(localStorage.getItem('v7_album') || "[]");
    const grid = document.getElementById('album-grid');
    grid.innerHTML = "";
    data.forEach(d => {
        L.marker([d.lat, d.lng]).addTo(map);
        const img = document.createElement('img');
        img.src = d.src;
        img.style.width = "100%";
        img.style.borderRadius = "5px";
        grid.appendChild(img);
    });
}

window.clearData = () => { if(confirm('全データをリセットしますか？')) { localStorage.clear(); location.reload(); } };
window.searchRoute = () => { alert("検索機能は現在開発中です。GeoJSONの全路線は表示されています。"); };

// --- 初期化 ---
window.onload = () => {
    initMap();
    initAlbum();
    loadData();
    const log = document.getElementById('chat-log');
    if (log) {
        log.innerHTML = localStorage.getItem('v7_log') || "";
        log.scrollTop = log.scrollHeight;
    }
};
