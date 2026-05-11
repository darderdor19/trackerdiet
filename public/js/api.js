// ==================== API BASE ====================
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

// Helper to get Firebase Token
async function getAuthHeaders(isJson = true) {
  const user = firebase.auth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  const headers = { 'Authorization': `Bearer ${token}` };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

// ==================== FOOD API ====================
async function submitManualFood() {
  const desc = document.getElementById('food-description').value.trim();
  if (!desc) return toast('Masukkan deskripsi makanan!', 'error');

  hideResult('food-result');
  showLoading('food-loading');

  try {
    const res = await fetch(`${API_BASE}/api/meals/manual`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ description: desc })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderFoodResult(data.analysis);
    document.getElementById('food-description').value = '';
    toast('Makanan berhasil dianalisis!', 'success');
    loadTodayMeals();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading('food-loading');
  }
}

async function submitPhotoFood() {
  const input = document.getElementById('food-image-input');
  if (!input.files || !input.files[0]) return toast('Pilih foto makanan!', 'error');

  hideResult('food-result');
  showLoading('food-loading');

  try {
    const fd = new FormData();
    fd.append('food_image', input.files[0]);

    const res = await fetch(`${API_BASE}/api/meals/photo`, { 
      method: 'POST', 
      headers: await getAuthHeaders(false),
      body: fd 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderFoodResult(data.analysis);
    input.value = '';
    document.getElementById('food-preview').classList.add('hidden');
    toast('Foto berhasil dianalisis!', 'success');
    loadTodayMeals();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading('food-loading');
  }
}

function renderFoodResult(analysis) {
  showResult('food-result');

  // Food items
  const itemsEl = document.getElementById('food-items-list');
  const items = analysis.food_items || [];
  itemsEl.innerHTML = items.map(i => `<span class="food-item-tag">⬡ ${i.name} (${i.amount || i.grams + 'g'})</span>`).join('');

  // Nutrition
  const n = analysis.nutrition || {};
  const grid = document.getElementById('nutrition-grid');
  grid.innerHTML = `
    <div class="nutri-item cal"><div class="nutri-value">${Math.round(n.calories||0)}</div><div class="nutri-label">Kalori (kkal)</div></div>
    <div class="nutri-item pro"><div class="nutri-value">${Math.round(n.protein||0)}g</div><div class="nutri-label">Protein</div></div>
    <div class="nutri-item fat"><div class="nutri-value">${Math.round(n.fat||0)}g</div><div class="nutri-label">Lemak</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.cholesterol||0)}mg</div><div class="nutri-label">Kolesterol</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.sodium||0)}mg</div><div class="nutri-label">Sodium</div></div>
    <div class="nutri-item carb"><div class="nutri-value">${Math.round(n.carbs||0)}g</div><div class="nutri-label">Karbohidrat</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.fiber||0)}g</div><div class="nutri-label">Serat</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.sugar||0)}g</div><div class="nutri-label">Gula</div></div>`;

  document.getElementById('food-summary').textContent = analysis.summary || '';
}

async function loadTodayMeals() {
  try {
    const res = await fetch(`${API_BASE}/api/meals?date=${today()}`, {
      headers: await getAuthHeaders()
    });
    const meals = await res.json();
    const el = document.getElementById('today-meals');

    if (!meals.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🍽</div>Belum ada makanan hari ini</div>';
      return;
    }

    el.innerHTML = meals.map(m => `
      <div class="history-entry" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
          <div class="history-left">
            <span class="history-type-badge badge-meal">${m.input_type === 'photo' ? '📷' : '⌨'} MEAL</span>
            <div class="history-info">
              <div class="history-desc">${m.description}</div>
              <div class="history-date">${m.time}</div>
            </div>
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
      </div>`).join('');
  } catch (e) { console.error(e); }
}

async function deleteMeal(id) {
  const confirmed = await cyberConfirm('Yakin ingin menghapus data makanan ini?');
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_BASE}/api/meals/${id}`, { 
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus');
    toast('Data makanan dihapus', 'info');
    loadTodayMeals();
    if (currentTab === 'history') loadHistory();
    if (currentTab === 'dashboard') loadDashboard();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ==================== WORKOUT API ====================
async function submitWorkout() {
  const entries = document.querySelectorAll('.exercise-entry');
  const exercises = [];

  entries.forEach(entry => {
    const name = entry.querySelector('.exercise-name')?.value.trim();
    if (!name) return;
    exercises.push({
      name,
      sets: parseInt(entry.querySelector('.exercise-sets')?.value) || 0,
      reps: entry.querySelector('.exercise-reps')?.value || '',
      weight: parseFloat(entry.querySelector('.exercise-weight')?.value) || 0
    });
  });

  if (!exercises.length) return toast('Tambahkan minimal 1 gerakan!', 'error');

  const duration = parseInt(document.getElementById('workout-duration').value) || 0;
  const notes = document.getElementById('workout-notes').value.trim();

  const payload = { type: currentWorkoutType, exercises, total_duration: duration, notes };

  if (currentWorkoutType === 'cardio') {
    payload.distance = parseFloat(document.getElementById('cardio-distance').value) || 0;
    payload.pace = document.getElementById('cardio-pace').value || '';
  }

  hideResult('workout-result');
  showLoading('workout-loading');

  try {
    const res = await fetch(`${API_BASE}/api/workouts`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showResult('workout-result');
    const ce = data.calorieEstimate || {};
    document.getElementById('workout-result-content').innerHTML = `
      <div class="nutrition-grid">
        <div class="nutri-item cal"><div class="nutri-value">${Math.round(ce.calories_burned||0)}</div><div class="nutri-label">Kalori Terbakar</div></div>
        <div class="nutri-item pro"><div class="nutri-value">${exercises.length}</div><div class="nutri-label">Gerakan</div></div>
        <div class="nutri-item carb"><div class="nutri-value">${duration}</div><div class="nutri-label">Menit</div></div>
        <div class="nutri-item fat"><div class="nutri-value">${(ce.intensity||'').toUpperCase()}</div><div class="nutri-label">Intensitas</div></div>
      </div>
      <div class="ai-summary">${ce.notes || 'Workout berhasil disimpan!'}</div>`;

    toast('Workout tersimpan!', 'success');
    loadTodayWorkouts();
    resetWorkoutForm();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading('workout-loading');
  }
}

function resetWorkoutForm() {
  const list = document.getElementById('exercise-list');
  list.innerHTML = `<div class="exercise-entry" data-index="0"><div class="exercise-row">
    <div class="cyber-input-group flex-2"><label class="cyber-label">GERAKAN</label><input type="text" class="cyber-input exercise-name" placeholder="Bench Press, Squat, dll..."></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">SET</label><input type="number" class="cyber-input exercise-sets" placeholder="3" min="1"></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">REPS</label><input type="text" class="cyber-input exercise-reps" placeholder="8-12"></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">BEBAN (kg)</label><input type="number" class="cyber-input exercise-weight" placeholder="50" min="0"></div>
  </div></div>`;
  document.getElementById('workout-duration').value = '';
  document.getElementById('workout-notes').value = '';
}

async function loadTodayWorkouts() {
  try {
    const res = await fetch(`${API_BASE}/api/workouts?date=${today()}`, {
      headers: await getAuthHeaders()
    });
    const data = await res.json();
    const el = document.getElementById('today-workouts');

    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div>Belum ada workout hari ini</div>';
      return;
    }

    el.innerHTML = data.map(w => {
      const exs = JSON.parse(w.exercises || '[]');
      return `<div class="history-entry">
        <div class="history-left">
          <span class="history-type-badge badge-workout">${w.type === 'gym' ? '🏋️' : w.type === 'cardio' ? '🏃' : '💪'} ${w.type.toUpperCase()}</span>
          <div class="history-info">
            <div class="history-desc">${exs.map(e=>e.name).join(', ')}</div>
            <div class="history-date">${w.time} • ${w.total_duration} menit</div>
          </div>
        </div>
        <div class="history-stats">
          <span>🔥 <span class="history-stat-val">${Math.round(w.calories_burned)}</span> kkal</span>
        </div>
        <button class="delete-btn" onclick="deleteWorkout(${w.id})">✕ HAPUS</button>
      </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

async function deleteWorkout(id) {
  const confirmed = await cyberConfirm('Yakin ingin menghapus data workout ini?');
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_BASE}/api/workouts/${id}`, { 
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus');
    toast('Data workout dihapus', 'info');
    loadTodayWorkouts();
    if (currentTab === 'history') loadHistory();
    if (currentTab === 'dashboard') loadDashboard();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}
