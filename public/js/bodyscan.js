// ==================== BODY SCAN API ====================
async function submitBodyScan() {
  const input = document.getElementById('body-image-input');
  if (!input.files || !input.files[0]) return toast('Pilih foto tubuh!', 'error');

  hideResult('body-result');
  showLoading('body-loading');

  try {
    const fd = new FormData();
    fd.append('body_image', input.files[0]);

    const res = await fetch(`${API_BASE}/api/body-scan`, { 
      method: 'POST', 
      headers: await getAuthHeaders(false),
      body: fd 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderBodyResult(data.analysis);
    input.value = '';
    document.getElementById('body-preview').classList.add('hidden');
    toast('Body scan berhasil!', 'success');
    loadBodyScanHistory();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading('body-loading');
  }
}

function renderBodyResult(analysis) {
  showResult('body-result');
  const ba = analysis.body_assessment || {};
  const rec = analysis.recommendations || {};

  document.getElementById('body-assessment').innerHTML = `
    <div class="assess-item"><div class="assess-label">BODY FAT ESTIMATE</div><div class="assess-value">${ba.body_fat_estimate||'-'}</div></div>
    <div class="assess-item"><div class="assess-label">MUSCLE ASSESSMENT</div><div class="assess-value">${ba.muscle_assessment||'-'}</div></div>
    <div class="assess-item"><div class="assess-label">POSTUR</div><div class="assess-value">${ba.posture||'-'}</div></div>
    <div class="assess-item"><div class="assess-label">KONDISI KESELURUHAN</div><div class="assess-value">${ba.overall_condition||'-'}</div></div>`;

  const exercises = rec.exercises || [];
  const tips = rec.tips || [];
  const focus = rec.workout_focus || [];

  document.getElementById('body-recommendations').innerHTML = `
    <div class="rec-section">
      <div class="rec-title">🎯 GOAL REKOMENDASI</div>
      <div class="rec-content">${rec.goal||'-'}</div>
    </div>
    <div class="rec-section">
      <div class="rec-title">🥗 STRATEGI DIET</div>
      <div class="rec-content">${rec.diet_strategy||'-'}</div>
    </div>
    <div class="rec-section">
      <div class="rec-title">💪 FOKUS LATIHAN</div>
      <ul class="rec-list">${focus.map(f=>`<li>${f}</li>`).join('')}</ul>
    </div>
    <div class="rec-section">
      <div class="rec-title">🏋️ REKOMENDASI GERAKAN</div>
      <div class="exercise-rec">${exercises.map(e=>`
        <div class="exercise-rec-card">
          <div class="exercise-rec-name">${e.name}</div>
          <div class="exercise-rec-detail">${e.sets} set × ${e.reps} reps${e.notes?' • '+e.notes:''}</div>
        </div>`).join('')}</div>
    </div>
    <div class="rec-section">
      <div class="rec-title">📋 RENCANA MINGGUAN</div>
      <div class="rec-content">${rec.weekly_plan||'-'}</div>
    </div>
    <div class="rec-section">
      <div class="rec-title">💡 TIPS</div>
      <ul class="rec-list">${tips.map(t=>`<li>${t}</li>`).join('')}</ul>
    </div>`;

  document.getElementById('body-summary').textContent = analysis.summary || '';
}

async function loadBodyScanHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/body-scans?start=2020-01-01&end=2099-12-31`, {
      headers: await getAuthHeaders()
    });
    const scans = await res.json();
    const el = document.getElementById('body-scan-history');

    if (!scans.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔬</div>Belum ada body scan</div>';
      return;
    }

    el.innerHTML = scans.slice(0, 10).map(s => `
      <div class="history-entry">
        <div class="history-left">
          <span class="history-type-badge badge-scan">🔬 SCAN</span>
          <div class="history-info">
            <div class="history-desc">Body Fat: ${s.body_fat_estimate || 'N/A'}</div>
            <div class="history-date">${s.date}</div>
          </div>
        </div>
        <div class="history-stats"><span>${s.muscle_assessment || ''}</span></div>
        <button class="delete-btn" onclick="deleteBodyScan(${s.id})">✕ HAPUS</button>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

async function deleteBodyScan(id) {
  const confirmed = await cyberConfirm('Yakin ingin menghapus body scan ini?');
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_BASE}/api/body-scans/${id}`, { 
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus');
    toast('Data body scan dihapus', 'info');
    loadBodyScanHistory();
    if (currentTab === 'history') loadHistory();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ==================== HISTORY ====================
async function loadHistory() {
  const { start, end } = getDateRange(historyPeriod);
  const el = document.getElementById('history-content');
  el.innerHTML = '<div class="ai-loading"><div class="loading-spinner"></div></div>';

  try {
    const [mealsRes, workoutsRes, scansRes, profilRes] = await Promise.all([
      fetch(`${API_BASE}/api/meals?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/workouts?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/body-scans?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/profil?start=${start}&end=${end}`, { headers: await getAuthHeaders() })
    ]);
    const meals = await mealsRes.json();
    const workouts = await workoutsRes.json();
    const scans = await scansRes.json();
    const profils = await profilRes.json();

    let entries = [];

    if (historyType === 'all' || historyType === 'meals') {
      meals.forEach(m => entries.push({ type: 'meal', date: m.date, time: m.time, data: m }));
    }
    if (historyType === 'all' || historyType === 'workouts') {
      workouts.forEach(w => entries.push({ type: 'workout', date: w.date, time: w.time, data: w }));
    }
    if (historyType === 'all' || historyType === 'scans') {
      scans.forEach(s => entries.push({ type: 'scan', date: s.date, time: '00:00', data: s }));
    }
    if (historyType === 'all' || historyType === 'profil') {
      profils.forEach(p => entries.push({ type: 'profil', date: p.date, time: p.time, data: p }));
    }

    entries.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>Tidak ada data di periode ini</div>';
      return;
    }

    el.innerHTML = entries.map(e => renderHistoryEntry(e)).join('');
  } catch (e) {
    el.innerHTML = `<div class="empty-state">Error loading history: ${e.message}</div>`;
  }
}

function renderHistoryEntry(e) {
  if (e.type === 'meal') {
    const m = e.data;
    return `<div class="history-entry" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
        <div class="history-left">
          <span class="history-type-badge badge-meal">${m.input_type==='photo'?'📷':'⌨'} MEAL</span>
          <div class="history-info"><div class="history-desc">${m.description}</div><div class="history-date">${m.date} ${m.time}</div></div>
        </div>
        <button class="delete-btn" onclick="deleteMeal(${m.id})">✕ HAPUS</button>
      </div>
      <div class="meal-nutri-grid">
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.calories||0)}</span><span class="meal-nutri-lbl">KALORI</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.protein||0)}g</span><span class="meal-nutri-lbl">PROTEIN</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.fat||0)}g</span><span class="meal-nutri-lbl">LEMAK</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.cholesterol||0)}mg</span><span class="meal-nutri-lbl">KOLESTEROL</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.sodium||0)}mg</span><span class="meal-nutri-lbl">SODIUM</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.carbs||0)}g</span><span class="meal-nutri-lbl">KARBO</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.fiber||0)}g</span><span class="meal-nutri-lbl">SERAT</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(m.sugar||0)}g</span><span class="meal-nutri-lbl">GULA</span></div>
      </div>
    </div>`;
  } else if (e.type === 'workout') {
    const w = e.data;
    const exs = JSON.parse(w.exercises || '[]');
    return `<div class="history-entry">
      <div class="history-left">
        <span class="history-type-badge badge-workout">${w.type==='gym'?'🏋️':w.type==='cardio'?'🏃':'💪'} ${w.type.toUpperCase()}</span>
        <div class="history-info"><div class="history-desc">${exs.map(x=>x.name).join(', ')}</div><div class="history-date">${w.date} ${w.time} • ${w.total_duration}min</div></div>
      </div>
      <div class="history-stats"><span>🔥 <span class="history-stat-val">${Math.round(w.calories_burned)}</span> burned</span></div>
      <button class="delete-btn" onclick="deleteWorkout(${w.id})">✕ HAPUS</button>
    </div>`;
  } else if (e.type === 'scan') {
    const s = e.data;
    return `<div class="history-entry">
      <div class="history-left">
        <span class="history-type-badge badge-scan">🔬 SCAN</span>
        <div class="history-info"><div class="history-desc">BF: ${s.body_fat_estimate||'N/A'} | ${s.muscle_assessment||''}</div><div class="history-date">${s.date}</div></div>
      </div>
      <button class="delete-btn" onclick="deleteBodyScan(${s.id})">✕ HAPUS</button>
    </div>`;
  } else {
    const p = e.data;
    return `<div class="history-entry" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
        <div class="history-left">
          <span class="history-type-badge" style="background:var(--cyan);color:var(--bg-primary);">👤 PROFIL</span>
          <div class="history-info">
            <div class="history-desc">BMI: ${p.bmi.toFixed(1)} | ${p.goal.toUpperCase()}</div>
            <div class="history-date">${p.date} ${p.time} • BB: ${p.bb}kg | TB: ${p.tb}cm</div>
          </div>
        </div>
        <button class="delete-btn" onclick="deleteProfil(${p.id})">✕ HAPUS</button>
      </div>
      <div class="meal-nutri-grid">
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(p.target_calories)}</span><span class="meal-nutri-lbl">KALORI</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(p.target_protein)}g</span><span class="meal-nutri-lbl">PROTEIN</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(p.target_fat)}g</span><span class="meal-nutri-lbl">LEMAK</span></div>
        <div class="meal-nutri-item"><span class="meal-nutri-val">${Math.round(p.target_carbs)}g</span><span class="meal-nutri-lbl">KARBO</span></div>
      </div>
    </div>`;
  }
}

function loadCustomHistory() {
  const start = document.getElementById('history-start').value;
  const end = document.getElementById('history-end').value;
  if (!start || !end) return toast('Pilih tanggal mulai dan akhir', 'error');
  loadHistoryRange(start, end);
}

async function loadHistoryRange(start, end) {
  const el = document.getElementById('history-content');
  el.innerHTML = '<div class="ai-loading"><div class="loading-spinner"></div></div>';

  try {
    const [mealsRes, workoutsRes, scansRes, profilRes] = await Promise.all([
      fetch(`${API_BASE}/api/meals?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/workouts?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/body-scans?start=${start}&end=${end}`, { headers: await getAuthHeaders() }),
      fetch(`${API_BASE}/api/profil?start=${start}&end=${end}`, { headers: await getAuthHeaders() })
    ]);
    const meals = await mealsRes.json();
    const workouts = await workoutsRes.json();
    const scans = await scansRes.json();
    const profils = await profilRes.json();

    let entries = [];
    if (historyType === 'all' || historyType === 'meals') meals.forEach(m => entries.push({ type: 'meal', date: m.date, time: m.time, data: m }));
    if (historyType === 'all' || historyType === 'workouts') workouts.forEach(w => entries.push({ type: 'workout', date: w.date, time: w.time, data: w }));
    if (historyType === 'all' || historyType === 'scans') scans.forEach(s => entries.push({ type: 'scan', date: s.date, time: '00:00', data: s }));
    if (historyType === 'all' || historyType === 'profil') profils.forEach(p => entries.push({ type: 'profil', date: p.date, time: p.time, data: p }));
    entries.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>Tidak ada data di periode ini</div>';
      return;
    }

    document.querySelectorAll('[data-history-days]').forEach(b => b.classList.remove('active'));
    el.innerHTML = entries.map(e => renderHistoryEntry(e)).join('');
  } catch(e) { el.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}
