const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'tracker.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now','localtime')),
    time TEXT NOT NULL DEFAULT (time('now','localtime')),
    description TEXT NOT NULL,
    image_path TEXT,
    food_items TEXT,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    cholesterol REAL DEFAULT 0,
    sodium REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    sugar REAL DEFAULT 0,
    ai_response TEXT,
    input_type TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now','localtime')),
    time TEXT NOT NULL DEFAULT (time('now','localtime')),
    type TEXT NOT NULL,
    exercises TEXT NOT NULL,
    total_duration INTEGER DEFAULT 0,
    calories_burned REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS body_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now','localtime')),
    image_path TEXT NOT NULL,
    ai_analysis TEXT,
    recommendations TEXT,
    body_fat_estimate TEXT,
    muscle_assessment TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS profil_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now','localtime')),
    time TEXT NOT NULL DEFAULT (time('now','localtime')),
    bb REAL NOT NULL,
    tb REAL NOT NULL,
    usia INTEGER NOT NULL,
    gender TEXT NOT NULL,
    activity TEXT NOT NULL,
    goal TEXT NOT NULL,
    bmi REAL DEFAULT 0,
    bmr REAL DEFAULT 0,
    tdee REAL DEFAULT 0,
    target_calories REAL DEFAULT 0,
    target_protein REAL DEFAULT 0,
    target_fat REAL DEFAULT 0,
    target_carbs REAL DEFAULT 0,
    target_cholesterol REAL DEFAULT 0,
    target_sodium REAL DEFAULT 0,
    target_fiber REAL DEFAULT 0,
    target_sugar REAL DEFAULT 0,
    ai_response TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_recaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    summary TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ========================
// MEALS CRUD
// ========================
function addMeal(data) {
  const stmt = db.prepare(`
    INSERT INTO meals (user_id, date, time, description, image_path, food_items, calories, protein, fat, cholesterol, sodium, carbs, fiber, sugar, ai_response, input_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.user_id,
    data.date || new Date().toISOString().split('T')[0],
    data.time || new Date().toLocaleTimeString('en-GB'),
    data.description || '',
    data.image_path || null,
    JSON.stringify(data.food_items || []),
    data.calories || 0,
    data.protein || 0,
    data.fat || 0,
    data.cholesterol || 0,
    data.sodium || 0,
    data.carbs || 0,
    data.fiber || 0,
    data.sugar || 0,
    JSON.stringify(data.ai_response || {}),
    data.input_type || 'manual'
  );
  return { id: result.lastInsertRowid, ...data };
}

function getMealsByDateRange(user_id, startDate, endDate) {
  const stmt = db.prepare(`SELECT * FROM meals WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, time DESC`);
  return stmt.all(user_id, startDate, endDate);
}

function getMealsByDate(user_id, date) {
  const stmt = db.prepare(`SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY time DESC`);
  return stmt.all(user_id, date);
}

function deleteMeal(user_id, id) {
  const stmt = db.prepare(`DELETE FROM meals WHERE user_id = ? AND id = ?`);
  return stmt.run(user_id, id);
}

// ========================
// WORKOUTS CRUD
// ========================
function addWorkout(data) {
  const stmt = db.prepare(`
    INSERT INTO workouts (user_id, date, time, type, exercises, total_duration, calories_burned, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.user_id,
    data.date || new Date().toISOString().split('T')[0],
    data.time || new Date().toLocaleTimeString('en-GB'),
    data.type || 'gym',
    JSON.stringify(data.exercises || []),
    data.total_duration || 0,
    data.calories_burned || 0,
    data.notes || ''
  );
  return { id: result.lastInsertRowid, ...data };
}

function getWorkoutsByDateRange(user_id, startDate, endDate) {
  const stmt = db.prepare(`SELECT * FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, time DESC`);
  return stmt.all(user_id, startDate, endDate);
}

function getWorkoutsByDate(user_id, date) {
  const stmt = db.prepare(`SELECT * FROM workouts WHERE user_id = ? AND date = ? ORDER BY time DESC`);
  return stmt.all(user_id, date);
}

function deleteWorkout(user_id, id) {
  const stmt = db.prepare(`DELETE FROM workouts WHERE user_id = ? AND id = ?`);
  return stmt.run(user_id, id);
}

// ========================
// BODY SCANS CRUD
// ========================
function addBodyScan(data) {
  const stmt = db.prepare(`
    INSERT INTO body_scans (user_id, date, image_path, ai_analysis, recommendations, body_fat_estimate, muscle_assessment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.user_id,
    data.date || new Date().toISOString().split('T')[0],
    data.image_path || '',
    data.ai_analysis || '',
    data.recommendations || '',
    data.body_fat_estimate || '',
    data.muscle_assessment || ''
  );
  return { id: result.lastInsertRowid, ...data };
}

function getBodyScansByDateRange(user_id, startDate, endDate) {
  const stmt = db.prepare(`SELECT * FROM body_scans WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC`);
  return stmt.all(user_id, startDate, endDate);
}

function deleteBodyScan(user_id, id) {
  const stmt = db.prepare(`DELETE FROM body_scans WHERE user_id = ? AND id = ?`);
  return stmt.run(user_id, id);
}

// ========================
// DASHBOARD AGGREGATIONS
// ========================
function getDashboardStats(user_id, startDate, endDate) {
  const mealStats = db.prepare(`
    SELECT 
      COUNT(*) as total_meals,
      COALESCE(SUM(calories),0) as total_calories,
      COALESCE(AVG(calories),0) as avg_calories,
      COALESCE(SUM(protein),0) as total_protein,
      COALESCE(SUM(fat),0) as total_fat,
      COALESCE(SUM(carbs),0) as total_carbs,
      COALESCE(SUM(fiber),0) as total_fiber,
      COALESCE(SUM(sugar),0) as total_sugar
    FROM meals WHERE user_id = ? AND date BETWEEN ? AND ?
  `).get(user_id, startDate, endDate);

  const workoutStats = db.prepare(`
    SELECT 
      COUNT(*) as total_workouts,
      COALESCE(SUM(total_duration),0) as total_duration,
      COALESCE(SUM(calories_burned),0) as total_calories_burned,
      COALESCE(AVG(total_duration),0) as avg_duration
    FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?
  `).get(user_id, startDate, endDate);

  const dailyCalories = db.prepare(`
    SELECT date, SUM(calories) as calories FROM meals WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date
  `).all(user_id, startDate, endDate);

  const dailyWorkouts = db.prepare(`
    SELECT date, SUM(total_duration) as duration, SUM(calories_burned) as burned FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date
  `).all(user_id, startDate, endDate);

  const workoutTypes = db.prepare(`
    SELECT type, COUNT(*) as count FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY type
  `).all(user_id, startDate, endDate);

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = db.prepare(`SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY time DESC`).all(user_id, today);
  const todayWorkouts = db.prepare(`SELECT * FROM workouts WHERE user_id = ? AND date = ? ORDER BY time DESC`).all(user_id, today);
  const latestRecap = db.prepare(`SELECT * FROM daily_recaps WHERE user_id = ? ORDER BY date DESC LIMIT 1`).get(user_id);

  return {
    meals: mealStats,
    workouts: workoutStats,
    dailyCalories,
    dailyWorkouts,
    workoutTypes,
    todayHistory: {
      meals: todayMeals,
      workouts: todayWorkouts
    },
    latestRecap
  };
}

// ========================
// PROFIL LOGS CRUD
// ========================
function addProfilLog(data) {
  const stmt = db.prepare(`
    INSERT INTO profil_logs (user_id, date, time, bb, tb, usia, gender, activity, goal, bmi, bmr, tdee,
      target_calories, target_protein, target_fat, target_carbs, target_cholesterol, target_sodium, target_fiber, target_sugar, ai_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.user_id,
    data.date || new Date().toISOString().split('T')[0],
    data.time || new Date().toLocaleTimeString('en-GB'),
    data.bb, data.tb, data.usia, data.gender, data.activity, data.goal,
    data.bmi || 0, data.bmr || 0, data.tdee || 0,
    data.target_calories || 0, data.target_protein || 0, data.target_fat || 0,
    data.target_carbs || 0, data.target_cholesterol || 0, data.target_sodium || 0,
    data.target_fiber || 0, data.target_sugar || 0,
    JSON.stringify(data.ai_response || {})
  );
  return { id: result.lastInsertRowid, ...data };
}

function getProfilLogsByDateRange(user_id, startDate, endDate) {
  const stmt = db.prepare(`SELECT * FROM profil_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, time DESC`);
  return stmt.all(user_id, startDate, endDate);
}

function getLatestProfilLog(user_id) {
  const stmt = db.prepare(`SELECT * FROM profil_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`);
  return stmt.get(user_id) || null;
}

function deleteProfilLog(user_id, id) {
  const stmt = db.prepare(`DELETE FROM profil_logs WHERE user_id = ? AND id = ?`);
  return stmt.run(user_id, id);
}

// ========================
// DAILY RECAPS CRUD
// ========================
function upsertDailyRecap(user_id, date, summary) {
  const stmt = db.prepare(`
    INSERT INTO daily_recaps (user_id, date, summary) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET summary = excluded.summary
  `);
  return stmt.run(user_id, date, summary);
}

function getDailyRecap(user_id, date) {
  const stmt = db.prepare(`SELECT * FROM daily_recaps WHERE user_id = ? AND date = ?`);
  return stmt.get(user_id, date);
}

// ========================
// OTP CRUD
// ========================
function saveOTP(email, code, expiresAt) {
  const stmt = db.prepare(`INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)`);
  return stmt.run(email, code, expiresAt);
}

function verifyOTP(email, code) {
  const stmt = db.prepare(`
    SELECT * FROM otps 
    WHERE email = ? AND code = ? AND expires_at > datetime('now','localtime')
    ORDER BY created_at DESC LIMIT 1
  `);
  return stmt.get(email, code);
}

function deleteOTPs(email) {
  const stmt = db.prepare(`DELETE FROM otps WHERE email = ?`);
  return stmt.run(email);
}

module.exports = {
  db,
  addMeal, getMealsByDateRange, getMealsByDate, deleteMeal,
  addWorkout, getWorkoutsByDateRange, getWorkoutsByDate, deleteWorkout,
  addBodyScan, getBodyScansByDateRange, deleteBodyScan,
  addProfilLog, getProfilLogsByDateRange, getLatestProfilLog, deleteProfilLog,
  upsertDailyRecap, getDailyRecap,
  saveOTP, verifyOTP, deleteOTPs,
  getDashboardStats
};
