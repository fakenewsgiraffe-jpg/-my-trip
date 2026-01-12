// 1. 地図の初期設定
const map = L.map('map').setView([35.6895, 139.6917], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 2. Googleマイマップ(KML)の読み込み
fetch('spots.kml')
    .then(res => res.text())
    .then(kmltext => {
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, 'text/xml');
        const track = new L.KML(kml);
        map.addLayer(track);
        
        // ピンをクリックした時にアルバム（名前）を出す設定
        track.on('click', function(e) {
            const name = e.layer.options.title || "不明な地点";
            document.getElementById('location-name').innerText = name;
            document.getElementById('photo-list').innerText = "ここに写真を紐付ける準備ができました。";
            document.getElementById('album-modal').classList.remove('hidden');
        });

        const bounds = track.getBounds();
        map.fitBounds(bounds);
    })
    .catch(err => console.error("KML読み込みエラー: spots.kmlが見つからないか、形式が違います。"));

// 3. 高機能ダイスロール
function rollDice() {
    const input = document.getElementById('dice-input').value.trim() || "1d6";
    const resultArea = document.getElementById('dice-result');
    const logArea = document.getElementById('dice-log');
    let resultText = "";
    let totalValue = 0;

    if (input.startsWith("choice{") && input.endsWith("}")) {
        const choices = input.replace("choice{", "").replace("}", "").split(",");
        const picked = choices[Math.floor(Math.random() * choices.length)].trim();
        resultText = `選択結果: ${picked}`;
    } 
    else if (input.match(/^\d+d\d+$/)) {
        const [num, face] = input.split('d').map(Number);
        let rolls = [];
        for (let i = 0; i < num; i++) {
            let r = Math.floor(Math.random() * face) + 1;
            rolls.push(r);
            totalValue += r;
        }
        resultText = `${input} ➔ 合計: ${totalValue} (${rolls.join(', ')})`;
    } 
    else {
        alert("入力例: 1d100, 2d6, choice{駅弁,カレー}");
        return;
    }

    resultArea.innerText = resultText;

    // ログ追加
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newLog = document.createElement('div');
    newLog.innerText = `[${time}] ${resultText}`;
    logArea.prepend(newLog);

    // 右側のタブ情報を更新（ダイスの合計値に応じて情報を変える例）
    updateInfoTab(totalValue);
}

// 4. 右側情報の更新
function updateInfoTab(value) {
    const type = document.getElementById('train-type');
    const transfer = document.getElementById('transfer-info');
    const tips = document.getElementById('station-tips');

    if (value === 0) return; // choiceの場合は更新しない

    if (value % 2 === 0) {
        type.innerText = "快速 / 特急";
        transfer.innerText = "次の主要駅で乗り換え可能";
        tips.innerText = `${value}駅先は大きな街です。お土産をチェック！`;
    } else {
        type.innerText = "各駅停車";
        transfer.innerText = "なし（のんびり旅）";
        tips.innerText = `${value}駅先は静かな駅です。駅舎の写真を撮りましょう。`;
    }
}

function closeAlbum() {
    document.getElementById('album-modal').classList.add('hidden');
}
