require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const db = require('./database');
const ai = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// FIREBASE ADMIN SETUP
// ========================
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin Initialized with Service Account');
} catch (error) {
  console.warn('⚠️ serviceAccountKey.json not found or invalid. Using default config.');
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
}

// ========================
// NODEMAILER SETUP
// ========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========================
// AUTH MIDDLEWARE
// ========================
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
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
// AUTH ROUTES (OTP)
// ========================
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email diperlukan' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 menit

  try {
    db.saveOTP(email, otp, expiresAt);

    const mailOptions = {
      from: `"LebihFit Tracker" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Kode Verifikasi LebihFit Tracker lu!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a12; color: #fff; padding: 40px; border-radius: 10px; border: 1px solid #00f2ff;">
          <h2 style="color: #00f2ff; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Kode Akses Lu</h2>
          <div style="background: #1a1a2e; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0; border: 1px dashed #ff00ff;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #ff00ff;">${otp}</span>
          </div>
          <p style="text-align: center; color: #888;">Kode ini cuma berlaku 10 menit. Jangan kasih tau siapa-siapa, rahasia cyberpunk kita! 🤫</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP terkirim' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Gagal kirim email. Cek koneksi server atau password app email lu.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const validOtp = db.verifyOTP(email, otp);

  if (validOtp) {
    db.deleteOTPs(email);
    res.json({ success: true, message: 'OTP valid' });
  } else {
    res.status(400).json({ error: 'Kode OTP salah atau udah basi.' });
  }
});

// ========================
// MEAL ROUTES
// ========================

// Manual food input
app.post('/api/meals/manual', authenticateToken, async (req, res) => {
  try {
    const { description, date, time } = req.body;
    if (!description) return res.status(400).json({ error: 'Deskripsi makanan diperlukan' });

    const analysis = await ai.analyzeFoodText(description);

    const meal = db.addMeal({
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

// Photo food input
app.post('/api/meals/photo', authenticateToken, upload.single('food_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto makanan diperlukan' });

    const imagePath = req.file.path;
    const analysis = await ai.analyzeFoodImage(imagePath);

    const meal = db.addMeal({
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

// Get meals by date range
app.get('/api/meals', authenticateToken, (req, res) => {
  try {
    const { start, end, date } = req.query;
    if (date) {
      const meals = db.getMealsByDate(req.user.uid, date);
      return res.json(meals);
    }
    const startDate = start || new Date().toISOString().split('T')[0];
    const endDate = end || startDate;
    const meals = db.getMealsByDateRange(req.user.uid, startDate, endDate);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete meal
app.delete('/api/meals/:id', authenticateToken, (req, res) => {
  try {
    db.deleteMeal(req.user.uid, req.params.id);
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
    if (!type || !exercises) return res.status(400).json({ error: 'Tipe dan latihan diperlukan' });

    // Estimate calories burned
    const calorieEstimate = await ai.estimateCaloriesBurned({ type, exercises, total_duration });

    const workout = db.addWorkout({
      user_id: req.user.uid,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('en-GB'),
      type,
      exercises,
      total_duration: total_duration || 0,
      calories_burned: calorieEstimate.calories_burned || 0,
      notes: notes || ''
    });

    res.json({ success: true, workout, calorieEstimate });
  } catch (error) {
    console.error('Workout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workouts', authenticateToken, (req, res) => {
  try {
    const { start, end, date } = req.query;
    if (date) {
      const workouts = db.getWorkoutsByDate(req.user.uid, date);
      return res.json(workouts);
    }
    const startDate = start || new Date().toISOString().split('T')[0];
    const endDate = end || startDate;
    const workouts = db.getWorkoutsByDateRange(req.user.uid, startDate, endDate);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/workouts/:id', authenticateToken, (req, res) => {
  try {
    db.deleteWorkout(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// BODY SCAN ROUTES
// ========================

app.post('/api/body-scan', authenticateToken, upload.single('body_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto tubuh diperlukan' });

    const imagePath = req.file.path;
    const analysis = await ai.analyzeBodyImage(imagePath);

    const scan = db.addBodyScan({
      user_id: req.user.uid,
      date: req.body.date || new Date().toISOString().split('T')[0],
      image_path: `/uploads/${req.file.filename}`,
      ai_analysis: JSON.stringify(analysis.body_assessment || {}),
      recommendations: JSON.stringify(analysis.recommendations || {}),
      body_fat_estimate: analysis.body_assessment?.body_fat_estimate || '',
      muscle_assessment: analysis.body_assessment?.muscle_assessment || ''
    });

    res.json({ success: true, scan, analysis });
  } catch (error) {
    console.error('Body scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/body-scans', authenticateToken, (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || '2020-01-01';
    const endDate = end || '2099-12-31';
    const scans = db.getBodyScansByDateRange(req.user.uid, startDate, endDate);
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/body-scans/:id', authenticateToken, (req, res) => {
  try {
    db.deleteBodyScan(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// DASHBOARD ROUTE
// ========================

app.get('/api/dashboard', authenticateToken, (req, res) => {
  try {
    const { start, end } = req.query;
    const todayDate = new Date().toISOString().split('T')[0];
    const startDate = start || todayDate;
    const endDate = end || todayDate;
    const stats = db.getDashboardStats(req.user.uid, startDate, endDate);
    
    // Include latest profil data
    const latestProfil = db.getLatestProfilLog(req.user.uid);
    stats.profil = latestProfil || null;

    // Include today's recap if exists
    const todayRecap = db.getDailyRecap(req.user.uid, todayDate);
    stats.todayRecap = todayRecap || null;
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Recap AI
app.get('/api/recap/daily', authenticateToken, async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const existing = db.getDailyRecap(req.user.uid, todayDate);
    
    if (existing && !req.query.force) {
      return res.json(existing);
    }

    const meals = db.getMealsByDate(req.user.uid, todayDate);
    const workouts = db.getWorkoutsByDate(req.user.uid, todayDate);
    const profil = db.getLatestProfilLog(req.user.uid);

    if (!meals.length && !workouts.length) {
      return res.json({ date: todayDate, summary: "Belum ada aktivitas hari ini untuk diringkas. Ayo mulai catat makanan atau workout-mu, Cyber-Athlete!" });
    }

    const summary = await ai.generateDailyRecap({ meals, workouts, profil, date: todayDate });
    db.upsertDailyRecap(req.user.uid, todayDate, summary);
    
    res.json({ date: todayDate, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// PROFIL / BODY CALCULATOR
// ========================
app.post('/api/profil/calculate', authenticateToken, async (req, res) => {
  try {
    const { bb, tb, usia, gender, activity, goal } = req.body;
    
    if (!bb || !tb || !usia) {
      return res.status(400).json({ error: 'Lengkapi semua data (BB, TB, Usia)' });
    }

    // Calculate BMI
    const heightM = tb / 100;
    const bmi = bb / (heightM * heightM);

    // Calculate BMR (Mifflin-St Jeor)
    let bmr;
    if (gender === 'male') {
      bmr = 10 * bb + 6.25 * tb - 5 * usia + 5;
    } else {
      bmr = 10 * bb + 6.25 * tb - 5 * usia - 161;
    }

    // Activity multiplier for TDEE
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const tdee = bmr * (activityMultipliers[activity] || 1.55);

    // Get AI analysis
    const aiResult = await ai.analyzeBodyProfile({ bb, tb, usia, gender, activity, goal, bmi, bmr, tdee });

    const nutrition = aiResult.daily_nutrition || {};

    // Save to database
    db.addProfilLog({
      user_id: req.user.uid,
      bb, tb, usia, gender, activity, goal,
      bmi, bmr, tdee,
      target_calories: nutrition.calories || 0,
      target_protein: nutrition.protein || 0,
      target_fat: nutrition.fat || 0,
      target_carbs: nutrition.carbs || 0,
      target_cholesterol: nutrition.cholesterol || 0,
      target_sodium: nutrition.sodium || 0,
      target_fiber: nutrition.fiber || 0,
      target_sugar: nutrition.sugar || 0,
      ai_response: aiResult
    });

    res.json({
      bmi: { value: bmi, bmr, tdee },
      nutrition,
      ai_analysis: {
        explanation: aiResult.explanation || '',
        meal_plan: aiResult.meal_plan || [],
        tips: aiResult.tips || [],
        supplements: aiResult.supplements || [],
        timeline: aiResult.timeline || '',
        summary: aiResult.summary || ''
      },
      summary: aiResult.summary || ''
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ error: 'Gagal menganalisis profil: ' + error.message });
  }
});

// Profil history
app.get('/api/profil', authenticateToken, (req, res) => {
  try {
    const { start, end } = req.query;
    const logs = db.getProfilLogsByDateRange(req.user.uid, start || '2020-01-01', end || '2099-12-31');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profil/:id', authenticateToken, (req, res) => {
  try {
    db.deleteProfilLog(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// SERVE SPA
// ========================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   🔥 LEBIHFIT TRACKER - CYBERPUNK ENGINE 🔥   ║`);
  console.log(`║   Server running on http://localhost:${PORT}     ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Auto-generate recap at 23:59
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 59) {
      const todayDate = now.toISOString().split('T')[0];
      const existing = db.getDailyRecap(todayDate);
      if (!existing) {
        console.log(`[SYSTEM] Auto-generating daily recap for ${todayDate}...`);
        try {
          const meals = db.getMealsByDate(todayDate);
          const workouts = db.getWorkoutsByDate(todayDate);
          const profil = db.getLatestProfilLog();
          if (meals.length || workouts.length) {
            const summary = await ai.generateDailyRecap({ meals, workouts, profil, date: todayDate });
            db.upsertDailyRecap(todayDate, summary);
          }
        } catch (err) {
          console.error('[SYSTEM] Auto-recap error:', err.message);
        }
      }
    }
  }, 60000); // Check every minute
});
