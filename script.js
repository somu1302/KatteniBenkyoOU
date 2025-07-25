let startTime, endTime, studyMeta = {}, timerId = null;

// フラグで記録処理の多重実行を防ぐ
let recordingInProgress = false;

function switchMode(mode) {
  clearInterval(timerId);
  removeOverlay();
  const c = document.getElementById('mainContent');
  c.innerHTML = '';
  if (mode === 'study') showStudy();
  else if (mode === 'records') showRecords();
  else if (mode === 'ranking') showRanking();
  else if (mode === 'settings') showSettings();
}

// --- 勉強するモード ---
function showStudy() {
  document.getElementById('mainContent').innerHTML = `
    <h2>勉強する</h2>
    <label for="fileInput" class="custom-file-label">写真またはPDFを選択</label>
    <input type="file" id="fileInput" accept="image/*,application/pdf" style="display:none">
    <div id="startPhotoPreview" style="text-align:center; margin-bottom:16px;"></div>
    <input type="text" id="titleInput" placeholder="タイトル(教科・タグなど)">
    <textarea id="startMemo" placeholder="開始メモ"></textarea>
    <button onclick="startStudy()">スタート</button>
  `;

  const fileInput = document.getElementById('fileInput');
  const previewDiv = document.getElementById('startPhotoPreview');

  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      fileToBase64(file, base64 => {
        if (file.type === 'application/pdf') {
          // PDFプレビュー
          previewDiv.innerHTML = `<embed src="${base64}" type="application/pdf" width="100" height="120" />`;
        } else {
          // 画像プレビュー
          previewDiv.innerHTML = `<img src="${base64}" alt="開始写真プレビュー" style="max-width:100px; max-height:100px; border-radius:6px;">`;
        }
      });
    } else {
      previewDiv.innerHTML = '';
    }
  };
}

function startStudy() {
  const fileInput = document.getElementById('fileInput');

  // ファイル未選択ならエラー
  if (!fileInput.files[0]) {
    alert('開始時の写真またはPDFを選択してください。');
    return;
  }

  studyMeta = {
    title: document.getElementById('titleInput').value.trim() || "なし",
    startMemo: document.getElementById('startMemo').value.trim() || "なし",
  };

  fileToBase64(fileInput.files[0], (base64) => {
    studyMeta.startPhoto = base64;
    studyMeta.startPhotoType = fileInput.files[0].type; // ファイルタイプも保持
    startTimerView();
  });
}

function startTimerView() {
  startTime = new Date();
  document.getElementById('mainContent').innerHTML = `
    <h2>取組中…</h2>
    <p id="timer">経過時間: 0:00</p>
    <button onclick="endStudy()">終わり</button>
  `;
  timerId = setInterval(() => {
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    document.getElementById('timer').innerText = `経過時間: ${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function endStudy() {
  clearInterval(timerId);
  endTime = new Date();
  document.getElementById('mainContent').innerHTML = `
    <h2>結果入力</h2>
    <label for="endFileInput" class="custom-file-label">終了写真またはPDFを選択</label>
    <input type="file" id="endFileInput" accept="image/*,application/pdf" style="display:none">
    <div id="endPhotoPreview" style="text-align:center; margin-bottom:16px;"></div>
    <input type="number" id="correctCount" placeholder="正解数">
    <input type="number" id="totalCount" placeholder="問題数">
    <textarea id="endMemo" placeholder="終了メモ"></textarea>
    <button onclick="recordAndGo()">記録する</button>
  `;

  const endFileInput = document.getElementById('endFileInput');
  const previewDiv = document.getElementById('endPhotoPreview');

  endFileInput.onchange = () => {
    if (endFileInput.files && endFileInput.files[0]) {
      const file = endFileInput.files[0];
      fileToBase64(file, base64 => {
        if (file.type === 'application/pdf') {
          previewDiv.innerHTML = `<embed src="${base64}" type="application/pdf" width="100" height="120" />`;
        } else {
          previewDiv.innerHTML = `<img src="${base64}" alt="終了写真プレビュー" style="max-width:100px; max-height:100px; border-radius:6px;">`;
        }
      });
    } else {
      previewDiv.innerHTML = '';
    }
  };
}

function recordAndGo() {
  const c = parseInt(document.getElementById('correctCount').value);
  const t = parseInt(document.getElementById('totalCount').value);
  const endFileInput = document.getElementById('endFileInput');

  if (isNaN(c) || isNaN(t) || t <= 0) { alert('正しい数値を入力してください'); return; }
  if (c > t) { alert('正解数が問題数を超えています'); return; }

  // ファイル未選択ならエラー
  if (!endFileInput.files[0]) {
    alert('終了時の写真またはPDFを選択してください。');
    return;
  }

  const totalSec = (endTime - startTime) / 1000;
  const accuracyRatio = c / t;
  const questionsPer20Sec = (t * 20) / totalSec;
  const score = parseFloat((accuracyRatio * 80 + Math.min(questionsPer20Sec * 10, 20)).toFixed(2));

  const recs = JSON.parse(localStorage.getItem('studyRecords') || '[]');
  const newId = recs.length + 1

  fileToBase64(endFileInput.files[0], (base64) => {
    saveRecord(recs, newId, c, t, score, totalSec, base64, endFileInput.files[0].type);
  });
}

function saveRecord(recs, newId, c, t, score, totalSec, endPhotoBase64, endPhotoType) {
  try {
    const endMemoElem = document.getElementById('endMemo');
    const endMemo = endMemoElem ? endMemoElem.value.trim() || "なし" : "なし";

    const record = {
      id: newId,
      title: studyMeta.title || "なし",
      startMemo: studyMeta.startMemo || "なし",
      endMemo: endMemo,
      total: t,
      correct: c,
      score,
      startTime: startTime.toISOString(),
      elapsedSec: totalSec,
      startPhoto: studyMeta.startPhoto || null,
      startPhotoType: studyMeta.startPhotoType || null,
      endPhoto: endPhotoBase64 || null,
      endPhotoType: endPhotoType || null
    };
    recs.push(record);
    localStorage.setItem('studyRecords', JSON.stringify(recs));
    updateDailyRates(recs);
    switchMode('records');

    setTimeout(() => expandDetail(newId), 100);
  } catch (e) {
    alert("記録保存中にエラーが発生しました: " + e.message);
  }
}


function fileToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = e => callback(e.target.result);
  reader.readAsDataURL(file);
}

// --- 日別レート更新 ---
function updateDailyRates(recs) {
  const grouped = {};
  recs.forEach(r => {
    const d = r.startTime.split('T')[0];
    grouped[d] = grouped[d] || [];
    grouped[d].push(r.score);
  });
  const rates = JSON.parse(localStorage.getItem('dailyRates') || '{}');
  let prev = 0;
  Object.keys(grouped).sort().forEach(d => {
    const avg = grouped[d].reduce((a, b) => a + b, 0) / grouped[d].length;
    const nr = prev + (avg - prev * 0.9) * 0.1;
    rates[d] = Math.max(0, parseFloat(nr.toFixed(2)));
    prev = rates[d];
  });
  localStorage.setItem('dailyRates', JSON.stringify(rates));
}

// --- 記録を見るモード ---
function showRecords() {
  const recs = JSON.parse(localStorage.getItem('studyRecords') || '[]');
  const rates = JSON.parse(localStorage.getItem('dailyRates') || '{}');
  const dates = Object.keys(rates).sort();
  
  // 1. レート一覧
  const rateList = dates.map(d => rates[d]);

  // 2. 合計スコア
  const totalScore = recs.reduce((sum, r) => sum + (r.score || 0), 0);

  // 3. 合計時間（秒）→ 分・秒 → 時間・分
  const totalSec = recs.reduce((sum, r) => sum + (r.elapsedSec || 0), 0);
  const totalMinutes = Math.floor(totalSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 4. 最新レート
  const latestRate = dates.length > 0 ? rates[dates[dates.length - 1]].toFixed(2) : '0.00';

  // 5. 勉強時間リスト（日ごと）
  const times = dates.map(d => {
    const secs = recs.filter(r => r.startTime.startsWith(d))
      .reduce((a, r) => a + (r.elapsedSec || 0), 0);
    return parseFloat((secs / 3600).toFixed(2));
  });

  // 6. HTML出力
  let html = `<h2>記録を見る</h2>
    <div style="margin-bottom: 16px;">
      <strong>レート：</strong>${latestRate}<br>
      <strong>合計スコア：</strong>${totalScore}<br>
      <strong>合計勉強時間：</strong>${hours}時間${minutes}分
    </div>
    <canvas id="rateChart"></canvas>
    <canvas id="timeChart"></canvas>
    <div class="record-list"><div class="record-grid">`;

  recs.forEach(r => {
    const dt = new Date(r.startTime);
    const label = `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()} ${dt.getHours()}:${dt.getMinutes().toString().padStart(2, '0')}`;
    const mm = Math.floor(r.elapsedSec / 60), ss = Math.floor(r.elapsedSec % 60);
    html += `
      <div class="record-card" onclick="expandDetail(${r.id})">
        #${r.id} ${r.title}
        ${label}
        ${r.total}問中${r.correct}問正解
        かかった時間：${mm}:${ss.toString().padStart(2, '0')}
        スコア：${r.score}
        開始メモ：${r.startMemo}
        終了メモ：${r.endMemo}
      </div>`;
  });

  html += `</div></div>`;
  document.getElementById('mainContent').innerHTML = html;

  // 7. グラフ描画
  new Chart(document.getElementById('rateChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'レート',
        data: rateList,
        borderColor: '#ff9933',
        fill: false
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(100, Math.ceil(Math.max(...rateList)))
        }
      }
    }
  });

  new Chart(document.getElementById('timeChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: '勉強時間 (h)',
        data: times,
        backgroundColor: '#3399ff'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(4, Math.ceil(Math.max(...times))),
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}


// 拡大詳細表示関連
function expandDetail(id) {
  const recs = JSON.parse(localStorage.getItem('studyRecords') || '[]');
  const r = recs.find(x => x.id === id);
  if (!r) return;
  const dt = new Date(r.startTime);
  const label = `#${r.id}　${r.title}　${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()} ${dt.getHours()}:${dt.getMinutes().toString().padStart(2, '0')}`;
  const mm = Math.floor(r.elapsedSec / 60), ss = Math.floor(r.elapsedSec % 60);

  // オーバーレイ作成
  let overlay = document.createElement('div');
  overlay.className = 'overlay visible';
  overlay.onclick = (e) => {
    if (e.target === overlay) removeOverlay();
  };

  let card = document.createElement('div');
  card.className = 'detail-card';
  card.onclick = e => e.stopPropagation();

  // 開始写真 or PDF表示
  let startMediaHTML = '';
  if (r.startPhoto) {
    if (r.startPhotoType === 'application/pdf') {
      startMediaHTML = `<embed src="${r.startPhoto}" type="application/pdf" width="300" height="400" />`;
    } else {
      startMediaHTML = `<img src="${r.startPhoto}" alt="開始写真" style="max-width:300px; max-height:400px;">`;
    }
  }

  // 終了写真 or PDF表示
  let endMediaHTML = '';
  if (r.endPhoto) {
    if (r.endPhotoType === 'application/pdf') {
      endMediaHTML = `<embed src="${r.endPhoto}" type="application/pdf" width="300" height="400" />`;
    } else {
      endMediaHTML = `<img src="${r.endPhoto}" alt="終了写真" style="max-width:300px; max-height:400px;">`;
    }
  }

  card.innerHTML = `
    <button class="detail-close-btn" aria-label="閉じる">&times;</button>
    <h2>${label}</h2>
    <p>${r.total}問中${r.correct}問正解　正答率${((r.correct / r.total) * 100).toFixed(0)}%　かかった時間：${mm}:${ss.toString().padStart(2, '0')}</p>
    <p>スコア：${r.score}</p>
    ${startMediaHTML}
    <p>開始メモ：${r.startMemo}</p>
    ${endMediaHTML}
    <p>終了メモ：${r.endMemo}</p>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // 閉じるボタンイベント
  card.querySelector('.detail-close-btn').onclick = removeOverlay;
}

function removeOverlay() {
  const ov = document.querySelector('.overlay');
  if (ov) ov.remove();
}

function showRanking() {
  document.getElementById('mainContent').innerHTML = `<h2>ランキング</h2>`;
}

function showSettings() {
  document.getElementById('mainContent').innerHTML = `
    <h2>設定</h2>
    <button onclick="if(confirm('データを削除しますか？')) { localStorage.clear(); alert('データを削除しました'); switchMode('study'); }">データを削除</button>
  `;
}

window.onload = () => switchMode('study');