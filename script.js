// --- 1. カラー定義と設定 ---
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

const tiles = {
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
};

const map = L.map('map', { layers: [tiles.light], zoomControl: false }).setView([35.6812, 139.7671], 12);
L.control.zoom({ position: 'topleft' }).addTo(map);

let railLayer = null;

// --- 2. 外部データ読み込み ---

// Googleマイマップ (KML) の読み込み
function loadMyMap() {
    omnivore.kml(MY_MAP_URL).addTo(map);
}

// 鉄道GeoJSONの読み込みとスタイル適用
async function loadRailwayData() {
    try {
        const response = await fetch('railway.json'); // リネームしたファイルを指定
        const data = await response.json();
        
        railLayer = L.geoJson(data, {
            style: (feature) => {
                const name = feature.properties.N02_003; // 国土数値情報の路線名キー
                return {
                    color: RAIL_COLORS[name] || "#888888",
                    weight: 3,
                    opacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<b>${feature.properties.N02_003}</b><br>${feature.properties.N02_004}`);
            }
        });

        if (document.getElementById('tab-btn-transit').classList.contains('active')) {
            railLayer.addTo(map);
        }
    } catch (e) {
        console.error("GeoJSONの読み込みに失敗しました。ファイル名を確認してください。");
    }
}

// --- 3. UI・タブ制御 ---
function switchTab(id) {
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
}

const togglePanel = () => document.getElementById('side-panel').classList.toggle('closed');

// --- 4. ダイス機能 (既存機能を保持) ---
const save = (k, v) => localStorage.setItem(k, v);
const load = (k) => localStorage.getItem(k);
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
        for(let i=0; i<parseInt(dm[1]); i++) { 
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
    log.innerHTML += `<div class="log-item"><div class="log-meta">${name}</div><div>${res}</div></div>`;
    save('v7_log', log.innerHTML);
    document.getElementById('dice-command').value = "";
    log.scrollTop = log.scrollHeight;
}

// --- 5. アルバム機能 (既存機能を保持) ---
let lastPos = null;
map.on('click', e => {
    lastPos = e.latlng;
    L.popup().setLatLng(e.latlng).setContent("地点を選択しました").openOn(map);
});

const dz = document.getElementById('drop-zone');
dz.ondrop = e => {
    e.preventDefault();
    if (!lastPos) return alert("先に地図をクリックして地点を選択してください");
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

const clearData = () => { if(confirm('全データを消去しますか？')) { localStorage.clear(); location.reload(); } };
const searchRoute = () => document.getElementById('route-res').innerText = "路線図を表示中（GeoJSON連携済）";

// --- 初期化 ---
window.onload = () => {
    document.getElementById('chat-log').innerHTML = load('v7_log') || "";
    renderAlbum();
    loadMyMap();
    loadRailwayData();
};
