// ==================== GLOBAL STATE ====================
let currentTab = 'dashboard';
let currentWorkoutType = 'gym';
let currentFoodMode = 'manual';
let dashboardPeriod = 7;
let historyPeriod = 7;
let historyType = 'all';
let charts = {};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSidebar();
  setupDropZones();
  setupPeriodButtons();
  setupHistoryButtons();
  updateClock();
  setInterval(updateClock, 1000);
  switchTab('dashboard');
});

function updateClock() {
  const now = new Date();
  const el = document.getElementById('navTime');
  if (el) el.textContent = now.toLocaleTimeString('en-GB');
}

// ==================== SIDEBAR ====================
function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', () => {
    toggle.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

function closeSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (toggle) toggle.classList.remove('open');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ==================== NAVIGATION ====================
function setupNavigation() {
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  closeSidebar();
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'food') loadTodayMeals();
  if (tab === 'workout') loadTodayWorkouts();
  if (tab === 'bodyscan') loadBodyScanHistory();
  if (tab === 'history') loadHistory();
}

// ==================== FOOD MODE ====================
function setFoodMode(mode) {
  currentFoodMode = mode;
  document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');
  document.getElementById('mode-photo').classList.toggle('active', mode === 'photo');
  document.getElementById('panel-manual').classList.toggle('hidden', mode !== 'manual');
  document.getElementById('panel-photo').classList.toggle('hidden', mode !== 'photo');
}

// ==================== WORKOUT TYPE ====================
function setWorkoutType(type) {
  currentWorkoutType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  document.getElementById('cardio-fields').classList.toggle('hidden', type !== 'cardio');
}

// ==================== DROP ZONES ====================
function setupDropZones() {
  setupDrop('food-dropzone', 'food-image-input', 'food-preview');
  setupDrop('body-dropzone', 'body-image-input', 'body-preview');
}

function setupDrop(zoneId, inputId, previewId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; showPreview(input, preview); }
  });
  input.addEventListener('change', () => showPreview(input, preview));
}

function showPreview(input, preview) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.classList.remove('hidden'); };
    reader.readAsDataURL(input.files[0]);
  }
}

// ==================== PERIOD BUTTONS ====================
function setupPeriodButtons() {
  document.querySelectorAll('.period-btn[data-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.period-selector').querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dashboardPeriod = parseInt(btn.dataset.days);
      loadDashboard();
    });
  });
}

function setupHistoryButtons() {
  document.querySelectorAll('.period-btn[data-history-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-history-days]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      historyPeriod = parseInt(btn.dataset.historyDays);
      loadHistory();
    });
  });
}

// ==================== HELPERS ====================
function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: fmt(start), end: fmt(end) };
}

function fmt(d) { return d.toISOString().split('T')[0]; }
function today() { return fmt(new Date()); }

function showLoading(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden'); 
}
function hideLoading(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden'); 
}
function showResult(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden'); 
}
function hideResult(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden'); 
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return console.log('Toast:', msg);
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function showToast(msg, type) { toast(msg, type); }


function filterHistoryType(type) {
  historyType = type;
  document.querySelectorAll('.htab-btn').forEach(b => b.classList.toggle('active', b.dataset.htype === type));
  loadHistory();
}

function addExerciseRow() {
  const list = document.getElementById('exercise-list');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'exercise-entry';
  div.dataset.index = idx;
  div.innerHTML = `<div class="exercise-row">
    <div class="cyber-input-group flex-2"><label class="cyber-label">GERAKAN</label><input type="text" class="cyber-input exercise-name" placeholder="Nama gerakan..."></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">SET</label><input type="number" class="cyber-input exercise-sets" placeholder="3" min="1"></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">REPS</label><input type="text" class="cyber-input exercise-reps" placeholder="8-12"></div>
    <div class="cyber-input-group flex-1"><label class="cyber-label">BEBAN (kg)</label><input type="number" class="cyber-input exercise-weight" placeholder="0" min="0"></div>
  </div>`;
  list.appendChild(div);
}

// ==================== CUSTOM CONFIRM MODAL ====================
function cyberConfirm(msg = 'Yakin ingin menghapus data ini?', title = 'KONFIRMASI HAPUS') {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmOverlay');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    overlay.classList.add('show');

    function cleanup(result) {
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onOverlay(e) { if (e.target === overlay) cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
  });
}
