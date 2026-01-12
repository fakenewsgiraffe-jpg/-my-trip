// 1. 設定値（変更なし）
const RAIL_COLORS = { "東海道線": "#F0862B", "伊東線": "#008803", "上野東京ライン": "#91278F", "横須賀線,総武快速線": "#007AC1", "湘南新宿ライン": "#E31F26", "京浜東北線,根岸線": "#00B2E5", "横浜線": "#80C342", "南武線,鶴見線": "#FFD400", "山手線": "#b1cb39", "中央快速線,青梅線,五日市線": "#F15A22", "中央・総武線": "#FFD400", "宇都宮線,高崎線": "#F68B1E", "埼京・川越線": "#00AC84", "JR・相鉄直通線": "#002971", "常磐快速線": "#36AE6E", "常磐緩行線": "#339999", "京葉線": "#C9252F", "武蔵野線": "#F15A22", "総武本線": "#FFD400", "成田線": "#00B261", "内房線": "#00B2E5", "外房線": "#DB4028", "相模線": "#009793", "東京メトロ": "#00A3D9", "都営地下鉄": "#199332", "小田急電鉄": "#0D82C7", "東急電鉄": "#DA0442", "京急電鉄": "#00A3E4", "相模鉄道": "#000080" };
const MY_MAP_URL = "https://www.google.com/maps/d/edit?mid=1Rzv6BhrJVWUstH44KSTPe_Eq5idyLC4&usp=sharing";

// グローバル変数
let map, tiles, railLayer = null;

// 2. 地図の初期化（これを最優先で実行）
function initMap() {
    try {
        tiles = {
            light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
            dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
        };
        map = L.map('map', { zoomControl: false }).setView([35.6812, 139.7671], 12);
        tiles.light.addTo(map);
        L.control.zoom({ position: 'topleft' }).addTo(map);
        console.log("Map initialized successfully.");
    } catch (e) {
        console.error("Map initialization failed:", e);
    }
}

// 3. タブ切り替え（地図データに関わらず動作させる）
window.switchTab = function(id) {
    console.log("Switching to tab:", id);
    // タブ表示の切り替え
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    const targetContent = document.getElementById(`tab-${id}`);
    const targetBtn = document.getElementById(`tab-btn-${id}`);
    if (targetContent) targetContent.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    // 地図レイヤーの切り替え（mapが存在する場合のみ）
    if (!map) return;
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

// 4. データ読み込み（失敗しても他を止めない）
async function loadData() {
    // マイマップ読み込み
    try {
        if (typeof omnivore !== 'undefined') {
            omnivore.kml(MY_MAP_URL).addTo(map);
        }
    } catch (e) { console.warn("MyMap failed to load."); }

    // 鉄道GeoJSON読み込み
    try {
        const res = await fetch('railway.json');
        const data = await res.json();
        railLayer = L.geoJson(data, {
            style: (f) => ({ color: RAIL_COLORS[f.properties.N02_003] || "#888888", weight: 3, opacity: 0.8 }),
            onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.N02_003}</b>`)
        });
        console.log("Railway data loaded.");
    } catch (e) { console.error("Railway data failed to load."); }
}

// 5. ページ読み込み完了時に実行
window.onload = () => {
    initMap();
    loadData();
    // 既存のログ表示など
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = localStorage.getItem('v7_log') || "";
};

// その他UI用
window.togglePanel = () => document.getElementById('side-panel').classList.toggle('closed');
