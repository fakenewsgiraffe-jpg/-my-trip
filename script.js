// 地図設定（ダークモード風のタイルを使用）
const map = L.map('map').setView([35.6895, 139.6917], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// タブ切り替え機能
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ダイス機能
function rollDice() {
    const input = document.getElementById('dice-input').value.trim() || "1d6";
    const resultDisplay = document.getElementById('dice-result-display');
    const logArea = document.getElementById('dice-log');
    let resultText = "";
    let total = 0;

    // ダイス計算（前回と同じ）
    if (input.match(/^\d+d\d+$/)) {
        const [num, face] = input.split('d').map(Number);
        let rolls = [];
        for (let i = 0; i < num; i++) {
            let r = Math.floor(Math.random() * face) + 1;
            rolls.push(r);
            total += r;
        }
        resultText = `${input} ➔ ${total} [${rolls.join(',')}]`;
    } else if (input.startsWith("choice{")) {
        const choices = input.replace("choice{","").replace("}","").split(",");
        resultText = `choice ➔ ${choices[Math.floor(Math.random()*choices.length)]}`;
    }

    // 表示とログ
    resultDisplay.innerText = resultText;
    const newLog = document.createElement('div');
    newLog.innerText = `noname: ${resultText}`;
    logArea.prepend(newLog);

    // 情報タブの内容を自動更新
    updateTrainInfo(total);
}

function updateTrainInfo(val) {
    if (val === 0) return;
    // ここに画像image_7907f2.jpgのような情報を条件分岐で入れる
    document.getElementById('train-type').innerText = val % 2 === 0 ? "快速 (東急田園都市線)" : "各駅停車 (小田急線)";
    document.getElementById('transfer-info').innerText = "町田駅にてJR横浜線へ乗換";
    document.getElementById('station-tips').innerText = `${val}駅先で美味しい駅弁が買えるようです。`;
}

// KML読み込み（ファイル名は自分のものに合わせてください）
fetch('spots.kml').then(res => res.text()).then(kmltext => {
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmltext, 'text/xml');
    const track = new L.KML(kml);
    map.addLayer(track);
});

