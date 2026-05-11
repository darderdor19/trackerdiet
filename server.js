require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const ai = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========================
// AUTH MIDDLEWARE (BYPASSED FOR PRIVATE MODE)
// ========================
async function authenticateToken(req, res, next) {
  // Hardcode user ke 'private_user' biar datanya kesimpen terus di database tunggal
  req.user = { uid: 'private_user', email: process.env.EMAIL_USER };
  next();
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// ========================
// MEAL ROUTES
// ========================
app.post('/api/meals/manual', authenticateToken, async (req, res) => {
  try {
    const { description, date, time } = req.body;
    if (!description) return res.status(400).json({ error: 'Deskripsi makanan diperlukan' });

    const analysis = await ai.analyzeFoodText(description);

    const meal = await db.addMeal({
      user_id: req.user.uid,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('en-GB'),
      description,
      food_items: analysis.food_items || [],
      calories: analysis.nutrition?.calories || 0,
      protein: analysis.nutrition?.protein || 0,
      fat: analysis.nutrition?.fat || 0,
      cholesterol: analysis.nutrition?.cholesterol || 0,
      sodium: analysis.nutrition?.sodium || 0,
      carbs: analysis.nutrition?.carbs || 0,
      fiber: analysis.nutrition?.fiber || 0,
      sugar: analysis.nutrition?.sugar || 0,
      ai_response: analysis,
      input_type: 'manual'
    });

    res.json({ success: true, meal, analysis });
  } catch (error) {
    console.error('Meal manual error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meals/photo', authenticateToken, upload.single('food_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto makanan diperlukan' });
    const imagePath = req.file.path;
    const analysis = await ai.analyzeFoodImage(imagePath);

    const meal = await db.addMeal({
      user_id: req.user.uid,
      date: req.body.date || new Date().toISOString().split('T')[0],
      time: req.body.time || new Date().toLocaleTimeString('en-GB'),
      description: analysis.summary || 'Food photo analysis',
      image_path: `/uploads/${req.file.filename}`,
      food_items: analysis.food_items || [],
      calories: analysis.nutrition?.calories || 0,
      protein: analysis.nutrition?.protein || 0,
      fat: analysis.nutrition?.fat || 0,
      cholesterol: analysis.nutrition?.cholesterol || 0,
      sodium: analysis.nutrition?.sodium || 0,
      carbs: analysis.nutrition?.carbs || 0,
      fiber: analysis.nutrition?.fiber || 0,
      sugar: analysis.nutrition?.sugar || 0,
      ai_response: analysis,
      input_type: 'photo'
    });

    res.json({ success: true, meal, analysis });
  } catch (error) {
    console.error('Meal photo error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const meals = await db.getMealsByDate(req.user.uid, targetDate);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    await db.deleteMeal(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// WORKOUT ROUTES
// ========================
app.post('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const { type, exercises, total_duration, notes, date, time } = req.body;
    const calorieEstimate = await ai.estimateCaloriesBurned({ type, exercises, total_duration });

    const workout = await db.addWorkout({
      user_id: req.user.uid,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('en-GB'),
      type, exercises, total_duration,
      calories_burned: calorieEstimate.calories_burned || 0,
      notes: notes || ''
    });

    res.json({ success: true, workout, calorieEstimate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const workouts = await db.getWorkoutsByDate(req.user.uid, targetDate);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/workouts/:id', authenticateToken, async (req, res) => {
  try {
    await db.deleteWorkout(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// DASHBOARD & PROFIL
// ========================
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const stats = await db.getDashboardStats(req.user.uid, todayDate, todayDate);
    const latestProfil = await db.getLatestProfilLog(req.user.uid);
    stats.profil = latestProfil;
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profil/calculate', authenticateToken, async (req, res) => {
  try {
    const { bb, tb, usia, gender, activity, goal } = req.body;
    const bmi = bb / ((tb / 100) ** 2);
    const aiResult = await ai.analyzeBodyProfile({ bb, tb, usia, gender, activity, goal, bmi });
    const nutrition = aiResult.daily_nutrition || {};

    await db.addProfilLog({
      user_id: req.user.uid,
      bb, tb, usia, gender, activity, goal, bmi,
      target_calories: nutrition.calories || 0,
      target_protein: nutrition.protein || 0,
      target_fat: nutrition.fat || 0,
      target_carbs: nutrition.carbs || 0,
      ai_response: aiResult
    });

    res.json({ nutrition, ai_analysis: aiResult, summary: aiResult.summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profil', authenticateToken, async (req, res) => {
  try {
    const log = await db.getLatestProfilLog(req.user.uid);
    res.json(log ? [log] : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// START SERVER
// ========================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   🚀 PRIVATE MODE - LEBIHFIT ENGINE v2.0   ║`);
    console.log(`║   Running on port ${PORT} with DB Cloud support   ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
});
