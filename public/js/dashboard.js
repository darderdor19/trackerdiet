// ==================== DASHBOARD ====================
async function loadDashboard() {
  const { start, end } = getDateRange(dashboardPeriod);
  try {
    const res = await fetch(`${API_BASE}/api/dashboard?start=${start}&end=${end}`, {
      headers: await getAuthHeaders()
    });
    const data = await res.json();
    updateStatCards(data);
    updateCharts(data);
    renderProfilDashboard(data.profil);
    renderTodayHistory(data.todayHistory);
    renderRecap(data.todayRecap);
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

function updateStatCards(data) {
  const m = data.meals || {};
  const w = data.workouts || {};

  document.getElementById('stat-calories').textContent = Math.round(m.total_calories || 0).toLocaleString();
  document.getElementById('stat-avg-cal').textContent = `avg: ${Math.round(m.avg_calories || 0)}/meal`;
  document.getElementById('stat-protein').textContent = `${Math.round(m.total_protein || 0)}g`;
  document.getElementById('stat-fat-carb').textContent = `F: ${Math.round(m.total_fat || 0)}g | C: ${Math.round(m.total_carbs || 0)}g`;
  document.getElementById('stat-workouts').textContent = w.total_workouts || 0;
  document.getElementById('stat-workout-dur').textContent = `${Math.round(w.total_duration || 0)} menit total`;
  document.getElementById('stat-burned').textContent = Math.round(w.total_calories_burned || 0).toLocaleString();
  const avgBurn = w.total_workouts ? Math.round(w.total_calories_burned / w.total_workouts) : 0;
  document.getElementById('stat-avg-burn').textContent = `avg: ${avgBurn}/sesi`;
}

function updateCharts(data) {
  const dailyCal = data.dailyCalories || [];
  const dailyWo = data.dailyWorkouts || [];
  const woTypes = data.workoutTypes || [];
  const m = data.meals || {};

  // Destroy old charts
  Object.values(charts).forEach(c => { if (c) c.destroy(); });

  const chartFont = { family: "'Rajdhani', sans-serif", size: 11 };
  const gridColor = 'rgba(42,42,58,0.8)';
  const tickColor = '#555570';

  // Calories chart
  const calCtx = document.getElementById('caloriesChart').getContext('2d');
  charts.cal = new Chart(calCtx, {
    type: 'bar',
    data: {
      labels: dailyCal.map(d => d.date.slice(5)),
      datasets: [{
        label: 'Kalori (kkal)',
        data: dailyCal.map(d => Math.round(d.calories)),
        backgroundColor: 'rgba(0,240,255,0.3)',
        borderColor: '#00f0ff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } }
      }
    }
  });

  // Workout duration chart
  const woCtx = document.getElementById('workoutChart').getContext('2d');
  charts.wo = new Chart(woCtx, {
    type: 'line',
    data: {
      labels: dailyWo.map(d => d.date.slice(5)),
      datasets: [
        {
          label: 'Durasi (min)',
          data: dailyWo.map(d => d.duration),
          borderColor: '#ffe600',
          backgroundColor: 'rgba(255,230,0,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#ffe600'
        },
        {
          label: 'Burned (kkal)',
          data: dailyWo.map(d => Math.round(d.burned)),
          borderColor: '#ff00aa',
          backgroundColor: 'rgba(255,0,170,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#ff00aa'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: tickColor, font: chartFont } } },
      scales: {
        x: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } }
      }
    }
  });

  // Macro distribution chart
  const macCtx = document.getElementById('macroChart').getContext('2d');
  charts.mac = new Chart(macCtx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Lemak', 'Karbo', 'Serat', 'Gula'],
      datasets: [{
        data: [
          Math.round(m.total_protein || 0),
          Math.round(m.total_fat || 0),
          Math.round(m.total_carbs || 0),
          Math.round(m.total_fiber || 0),
          Math.round(m.total_sugar || 0)
        ],
        backgroundColor: ['#ff00aa', '#ffe600', '#00ff88', '#aa44ff', '#ff3355'],
        borderColor: '#16161f',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor, font: chartFont, padding: 16 } } }
    }
  });

  // Workout type chart
  const wtCtx = document.getElementById('workoutTypeChart').getContext('2d');
  charts.wt = new Chart(wtCtx, {
    type: 'polarArea',
    data: {
      labels: woTypes.map(t => t.type.toUpperCase()),
      datasets: [{
        data: woTypes.map(t => t.count),
        backgroundColor: ['rgba(0,240,255,0.4)', 'rgba(255,230,0,0.4)', 'rgba(255,0,170,0.4)'],
        borderColor: ['#00f0ff', '#ffe600', '#ff00aa'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor, font: chartFont, padding: 16 } } },
      scales: { r: { ticks: { color: tickColor, backdropColor: 'transparent' }, grid: { color: gridColor } } }
    }
  });
}

// ==================== PROFIL DASHBOARD PANEL ====================
function renderProfilDashboard(profil) {
  const panel = document.getElementById('profilDashboardPanel');
  const content = document.getElementById('profilDashboardContent');
  if (!profil) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';

  const goalLabels = { cutting: '🔥 CUTTING', maintain: '⚖️ MAINTAIN', bulking: '💪 BULKING', lean_bulk: '🎯 LEAN BULK' };
  const genderLabels = { male: 'Laki-laki', female: 'Perempuan' };
  const actLabels = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', very_active: 'Very Active' };

  const bmiVal = (profil.bmi || 0).toFixed(1);
  let bmiColor = '#00ff88', bmiCat = 'NORMAL';
  if (bmiVal < 18.5) { bmiColor = '#00f0ff'; bmiCat = 'UNDERWEIGHT'; }
  else if (bmiVal >= 25 && bmiVal < 30) { bmiColor = '#ffe600'; bmiCat = 'OVERWEIGHT'; }
  else if (bmiVal >= 30) { bmiColor = '#ff3355'; bmiCat = 'OBESE'; }

  content.innerHTML = `
    <div class="profil-dash-meta">
      <span>⚖️ BB: <strong>${profil.bb}kg</strong></span>
      <span>📏 TB: <strong>${profil.tb}cm</strong></span>
      <span>🎂 Usia: <strong>${profil.usia}th</strong></span>
      <span>👤 ${genderLabels[profil.gender] || profil.gender}</span>
      <span>🏃 ${actLabels[profil.activity] || profil.activity}</span>
      <span>🎯 ${goalLabels[profil.goal] || profil.goal}</span>
      <span style="color:${bmiColor}">BMI: <strong>${bmiVal}</strong> (${bmiCat})</span>
    </div>
    <div class="profil-dashboard-stats">
      <div class="profil-dash-item"><div class="profil-dash-val">${Math.round(profil.target_calories)}</div><div class="profil-dash-lbl">TARGET KALORI</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val" style="color:var(--magenta)">${Math.round(profil.target_protein)}g</div><div class="profil-dash-lbl">TARGET PROTEIN</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val" style="color:var(--yellow)">${Math.round(profil.target_fat)}g</div><div class="profil-dash-lbl">TARGET LEMAK</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val" style="color:var(--green)">${Math.round(profil.target_carbs)}g</div><div class="profil-dash-lbl">TARGET KARBO</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val">${Math.round(profil.target_cholesterol)}mg</div><div class="profil-dash-lbl">KOLESTEROL</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val">${Math.round(profil.target_sodium)}mg</div><div class="profil-dash-lbl">SODIUM</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val">${Math.round(profil.target_fiber)}g</div><div class="profil-dash-lbl">SERAT</div></div>
      <div class="profil-dash-item"><div class="profil-dash-val">${Math.round(profil.target_sugar)}g</div><div class="profil-dash-lbl">GULA</div></div>
    </div>`;
}

// ==================== TODAY HISTORY DASHBOARD ====================
function renderTodayHistory(history) {
  const el = document.getElementById('todayDashboardActivity');
  if (!history || (!history.meals.length && !history.workouts.length)) {
    el.innerHTML = '<div class="empty-state">Belum ada aktivitas hari ini.</div>';
    return;
  }

  let html = '';
  
  // Render meals
  history.meals.forEach(m => {
    html += `
      <div class="history-entry">
        <div class="history-left">
          <span class="history-type-badge badge-meal">${m.input_type === 'photo' ? '📷' : '⌨'} MEAL</span>
          <div class="history-info">
            <div class="history-desc">${m.description}</div>
            <div class="history-date">${m.time}</div>
          </div>
        </div>
        <div class="history-stats"><span>🔥 <span class="history-stat-val">${Math.round(m.calories)}</span> kkal</span></div>
      </div>`;
  });

  // Render workouts
  history.workouts.forEach(w => {
    const exs = JSON.parse(w.exercises || '[]');
    html += `
      <div class="history-entry">
        <div class="history-left">
          <span class="history-type-badge badge-workout">${w.type === 'gym' ? '🏋️' : '🏃'} ${w.type.toUpperCase()}</span>
          <div class="history-info">
            <div class="history-desc">${exs.map(e => e.name).join(', ')}</div>
            <div class="history-date">${w.time} • ${w.total_duration}m</div>
          </div>
        </div>
        <div class="history-stats"><span>🔥 <span class="history-stat-val">${Math.round(w.calories_burned)}</span> kkal</span></div>
      </div>`;
  });

  el.innerHTML = html;
}

// ==================== AI RECAP DASHBOARD ====================
function renderRecap(recap) {
  const el = document.getElementById('recapDashboardContent');
  if (!recap || !recap.summary) {
    el.innerHTML = '<div class="empty-state">Belum ada ringkasan harian. AI akan otomatis membuat ringkasan di akhir hari atau klik tombol di atas.</div>';
    return;
  }
  
  // Convert markdown-ish to basic HTML
  let summary = recap.summary;
  summary = summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  summary = summary.replace(/### (.*?)\n/g, '<strong>$1</strong>\n');
  
  el.innerHTML = summary;
}

async function generateRecap() {
  const el = document.getElementById('recapDashboardContent');
  el.innerHTML = '<div class="ai-loading"><div class="loading-spinner"></div><p>AI Sedang menyusun ringkasan harimu...</p></div>';
  
  try {
    const res = await fetch(`${API_BASE}/api/recap/daily?force=true`, {
      headers: await getAuthHeaders()
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderRecap(data);
    toast('Ringkasan harian berhasil diperbarui!', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
    el.innerHTML = '<div class="empty-state">Gagal memuat ringkasan. Coba lagi nanti.</div>';
  }
}
