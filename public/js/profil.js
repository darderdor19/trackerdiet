// ==================== PROFIL / BODY CALCULATOR ====================
async function submitProfil() {
  const bb = parseFloat(document.getElementById('profil-bb').value);
  const tb = parseFloat(document.getElementById('profil-tb').value);
  const usia = parseInt(document.getElementById('profil-usia').value);
  const gender = document.getElementById('profil-gender').value;
  const activity = document.getElementById('profil-activity').value;
  const goal = document.getElementById('profil-goal').value;

  if (!bb || !tb || !usia) return toast('Lengkapi semua data (BB, TB, Usia)!', 'error');

  hideResult('profil-result');
  showLoading('profil-loading');

  try {
    const res = await fetch(`${API_BASE}/api/profil/calculate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ bb, tb, usia, gender, activity, goal })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderProfilResult(data);
    toast('Analisis berhasil!', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading('profil-loading');
  }
}

function renderProfilResult(data) {
  showResult('profil-result');

  const bmi = data.bmi || {};
  const n = data.nutrition || {};
  const ai = data.ai_analysis || {};

  // BMI Card
  const bmiVal = bmi.value || 0;
  let bmiColor, bmiCat;
  if (bmiVal < 18.5) { bmiColor = '#00f0ff'; bmiCat = 'UNDERWEIGHT'; }
  else if (bmiVal < 25) { bmiColor = '#00ff88'; bmiCat = 'NORMAL'; }
  else if (bmiVal < 30) { bmiColor = '#ffe600'; bmiCat = 'OVERWEIGHT'; }
  else { bmiColor = '#ff3355'; bmiCat = 'OBESE'; }

  // BMI marker position (15-40 range mapped to 0-100%)
  const markerPos = Math.min(100, Math.max(0, ((bmiVal - 15) / 25) * 100));

  document.getElementById('profil-bmi').innerHTML = `
    <div class="bmi-value">${bmiVal.toFixed(1)}</div>
    <div class="bmi-label">BODY MASS INDEX</div>
    <div class="bmi-category" style="color:${bmiColor};border:1px solid ${bmiColor};background:${bmiColor}15">${bmiCat}</div>
    <div class="bmi-bar"><div class="bmi-marker" style="left:${markerPos}%"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.6rem;color:var(--text-muted);font-family:var(--font-mono)">
      <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
    </div>`;

  // Nutrition Grid
  document.getElementById('profil-nutrition').innerHTML = `
    <div class="nutri-item cal"><div class="nutri-value">${Math.round(n.calories||0)}</div><div class="nutri-label">Kalori (kkal)</div></div>
    <div class="nutri-item pro"><div class="nutri-value">${Math.round(n.protein||0)}g</div><div class="nutri-label">Protein</div></div>
    <div class="nutri-item fat"><div class="nutri-value">${Math.round(n.fat||0)}g</div><div class="nutri-label">Lemak</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.cholesterol||0)}mg</div><div class="nutri-label">Kolesterol</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.sodium||0)}mg</div><div class="nutri-label">Sodium</div></div>
    <div class="nutri-item carb"><div class="nutri-value">${Math.round(n.carbs||0)}g</div><div class="nutri-label">Karbohidrat</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.fiber||0)}g</div><div class="nutri-label">Serat</div></div>
    <div class="nutri-item other"><div class="nutri-value">${Math.round(n.sugar||0)}g</div><div class="nutri-label">Gula</div></div>`;

  // AI Detail Sections
  const mealPlan = ai.meal_plan || [];
  const tips = ai.tips || [];
  const supplements = ai.supplements || [];
  const timeline = ai.timeline || '';

  let detailHTML = '';

  if (ai.explanation) {
    detailHTML += `<div class="profil-detail-card">
      <div class="profil-detail-title">📊 PENJELASAN KALKULASI</div>
      <div class="profil-detail-content">${ai.explanation}</div>
    </div>`;
  }

  if (mealPlan.length) {
    detailHTML += `<div class="profil-detail-card">
      <div class="profil-detail-title">🍽 CONTOH MEAL PLAN</div>
      <div class="profil-detail-content"><ul>${mealPlan.map(m => `<li><strong>${m.meal}:</strong> ${m.foods} (${m.calories || ''} kkal)</li>`).join('')}</ul></div>
    </div>`;
  }

  if (tips.length) {
    detailHTML += `<div class="profil-detail-card">
      <div class="profil-detail-title">💡 TIPS NUTRISI</div>
      <div class="profil-detail-content"><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
    </div>`;
  }

  if (supplements.length) {
    detailHTML += `<div class="profil-detail-card">
      <div class="profil-detail-title">💊 REKOMENDASI SUPLEMEN</div>
      <div class="profil-detail-content"><ul>${supplements.map(s => `<li>${s}</li>`).join('')}</ul></div>
    </div>`;
  }

  if (timeline) {
    detailHTML += `<div class="profil-detail-card">
      <div class="profil-detail-title">📅 TARGET TIMELINE</div>
      <div class="profil-detail-content">${timeline}</div>
    </div>`;
  }

  document.getElementById('profil-details').innerHTML = detailHTML;
  document.getElementById('profil-summary').textContent = ai.summary || data.summary || '';
}

async function deleteProfil(id) {
  const confirmed = await cyberConfirm('Yakin ingin menghapus data profil ini?');
  if (!confirmed) return;
  try {
    const res = await fetch(`${API_BASE}/api/profil/${id}`, { 
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus');
    toast('Data profil dihapus', 'info');
    if (currentTab === 'history') loadHistory();
    if (currentTab === 'dashboard') loadDashboard();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}
