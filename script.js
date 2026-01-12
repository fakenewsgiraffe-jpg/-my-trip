script.js

// 1. 地図の初期設定（東京を中心に表示）
const map = L.map('map').setView([35.6895, 139.6917], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 2. 旅行データのサンプル
const tripData = [
    { name: "東京タワー", coords: [35.6586, 139.7454], photos: ["📸 東京タワーの夜景", "📸 芝公園からの眺め"] },
    { name: "大阪城", coords: [34.6873, 135.5262], photos: ["🏯 満開の桜と天守閣"] }
];

// 3. 地図にピン（マーカー）を立てる
tripData.forEach(item => {
    const marker = L.marker(item.coords).addTo(map);
    marker.on('click', () => {
        document.getElementById('location-name').innerText = item.name;
        document.getElementById('photo-list').innerHTML = item.photos.join('<br>');
        document.getElementById('album-modal').classList.remove('hidden');
    });
});

// 4. ダイスロール機能
function rollDice() {
    const result = Math.floor(Math.random() * 6) + 1;
    document.getElementById('dice-result').innerText = result + " が出ました！";
}

function closeAlbum() {
    document.getElementById('album-modal').classList.add('hidden');
}
