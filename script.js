// 地図の初期設定
const map = L.map('map').setView([35.6895, 139.6917], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Googleマイマップ（KMLファイル）を読み込む
fetch('spots.kml')
    .then(res => res.text())
    .then(kmltext => {
        // KMLデータを解析する
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, 'text/xml');
        const track = new L.KML(kml);
        
        // 地図にピンを表示
        map.addLayer(track);
        
        // ピンが全部収まるように地図の表示範囲を自動調整
        const bounds = track.getBounds();
        map.fitBounds(bounds);
    });

// ダイス機能
function rollDice() {
    const result = Math.floor(Math.random() * 6) + 1;
    document.getElementById('dice-result').innerText = result + " 進む！";
}

function closeAlbum() {
    document.getElementById('album-modal').classList.add('hidden');
}


