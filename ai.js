const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ========================
// ANALYZE FOOD TEXT (Manual Input)
// ========================
async function analyzeFoodText(description) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Kamu adalah ahli nutrisi profesional. Ketika user mendeskripsikan makanan, kamu harus menganalisis dan mengembalikan data nutrisi dalam format JSON yang STRICT.
          
PENTING: Response HARUS berupa JSON valid tanpa teks tambahan. Format:
{
  "food_items": [
    { "name": "nama makanan", "amount": "jumlah gram", "grams": 100 }
  ],
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "fat": 0,
    "cholesterol": 0,
    "sodium": 0,
    "carbs": 0,
    "fiber": 0,
    "sugar": 0
  },
  "summary": "ringkasan singkat dalam bahasa Indonesia"
}

Semua nilai nutrisi dalam satuan:
- calories: kkal
- protein, fat, carbs, fiber, sugar: gram
- cholesterol, sodium: mg

Berikan estimasi yang akurat berdasarkan database nutrisi umum.`
        },
        {
          role: "user",
          content: description
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing food text:', error.message);
    return estimateFoodFromText(description);
  }
}

// ========================
// ANALYZE FOOD IMAGE
// ========================
async function analyzeFoodImage(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analisis foto makanan ini. Identifikasi semua makanan yang ada, estimasi jumlah gramnya, dan hitung total nutrisinya.

PENTING: Response HARUS berupa JSON valid tanpa teks tambahan. Format:
{
  "food_items": [
    { "name": "nama makanan", "amount": "estimasi jumlah", "grams": 100 }
  ],
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "fat": 0,
    "cholesterol": 0,
    "sodium": 0,
    "carbs": 0,
    "fiber": 0,
    "sugar": 0
  },
  "summary": "ringkasan singkat dalam bahasa Indonesia"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.3,
      max_tokens: 1024
    });

    const content = completion.choices[0]?.message?.content;
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing food image:', error.message);
    return {
      food_items: [{ name: "Makanan tidak teridentifikasi", amount: "N/A", grams: 0 }],
      nutrition: { calories: 0, protein: 0, fat: 0, cholesterol: 0, sodium: 0, carbs: 0, fiber: 0, sugar: 0 },
      summary: "Gagal menganalisis gambar. Silakan coba lagi atau input manual. Error: " + error.message
    };
  }
}

// ========================
// ANALYZE BODY SCAN
// ========================
async function analyzeBodyImage(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analisis foto tubuh ini sebagai fitness consultant profesional. Berikan assessment kondisi tubuh dan rekomendasi.

PENTING: Response HARUS berupa JSON valid tanpa teks tambahan. Format:
{
  "body_assessment": {
    "body_fat_estimate": "estimasi persentase lemak tubuh",
    "muscle_assessment": "penilaian massa otot",
    "posture": "penilaian postur",
    "overall_condition": "kondisi keseluruhan"
  },
  "recommendations": {
    "goal": "rekomendasi goal (bulking/cutting/maintaining)",
    "diet_strategy": "strategi diet detail",
    "workout_focus": ["area fokus latihan 1", "area fokus latihan 2"],
    "exercises": [
      { "name": "nama gerakan", "sets": 3, "reps": "8-12", "notes": "catatan" }
    ],
    "weekly_plan": "rencana mingguan singkat",
    "tips": ["tip 1", "tip 2", "tip 3"]
  },
  "summary": "ringkasan keseluruhan dalam bahasa Indonesia"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.4,
      max_tokens: 2048
    });

    const content = completion.choices[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing body image:', error.message);
    return {
      body_assessment: {
        body_fat_estimate: "Tidak dapat dianalisis",
        muscle_assessment: "Tidak dapat dianalisis",
        posture: "Tidak dapat dianalisis",
        overall_condition: "Error dalam analisis"
      },
      recommendations: {
        goal: "Silakan coba lagi",
        diet_strategy: "-",
        workout_focus: [],
        exercises: [],
        weekly_plan: "-",
        tips: ["Coba upload foto dengan pencahayaan yang lebih baik", "Pastikan seluruh tubuh terlihat dalam foto"]
      },
      summary: "Gagal menganalisis. Error: " + error.message
    };
  }
}

// ========================
// ESTIMATE CALORIES BURNED
// ========================
async function estimateCaloriesBurned(workoutData) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Kamu adalah ahli fitness. Estimasi kalori yang terbakar berdasarkan data workout yang diberikan. Response HARUS berupa JSON valid.
Format: { "calories_burned": 0, "intensity": "low/medium/high", "notes": "catatan singkat" }`
        },
        {
          role: "user",
          content: JSON.stringify(workoutData)
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 256,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error estimating calories:', error.message);
    const duration = workoutData.total_duration || 30;
    const multiplier = workoutData.type === 'cardio' ? 10 : workoutData.type === 'gym' ? 7 : 8;
    return { calories_burned: Math.round(duration * multiplier), intensity: "medium", notes: "Estimasi lokal (AI tidak tersedia)" };
  }
}

// ========================
// LOCAL FALLBACK ESTIMATION
// ========================
function estimateFoodFromText(description) {
  const lower = description.toLowerCase();
  let calories = 200, protein = 10, fat = 5, carbs = 30;

  if (lower.includes('ayam') || lower.includes('chicken')) { calories = 250; protein = 30; fat = 12; carbs = 0; }
  if (lower.includes('nasi') || lower.includes('rice')) { calories += 200; carbs += 45; protein += 4; }
  if (lower.includes('telur') || lower.includes('egg')) { calories += 150; protein += 12; fat += 10; }
  if (lower.includes('ikan') || lower.includes('fish')) { calories = 200; protein = 25; fat = 8; carbs = 0; }

  const gramMatch = description.match(/(\d+)\s*(gram|gr|g)/i);
  if (gramMatch) {
    const ratio = parseInt(gramMatch[1]) / 100;
    calories = Math.round(calories * ratio);
    protein = Math.round(protein * ratio);
    fat = Math.round(fat * ratio);
    carbs = Math.round(carbs * ratio);
  }

  return {
    food_items: [{ name: description, amount: gramMatch ? gramMatch[1] + 'g' : 'estimasi', grams: gramMatch ? parseInt(gramMatch[1]) : 100 }],
    nutrition: { calories, protein, fat, cholesterol: 50, sodium: 300, carbs, fiber: 2, sugar: 3 },
    summary: `Estimasi lokal untuk: ${description} (AI tidak tersedia, menggunakan data perkiraan)`
  };
}

// ========================
// ANALYZE BODY PROFILE (BB/TB/Usia/Goals)
// ========================
async function analyzeBodyProfile(profileData) {
  try {
    const { bb, tb, usia, gender, activity, goal, bmi, bmr, tdee } = profileData;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Kamu adalah ahli nutrisi dan fitness profesional. User memberikan data tubuhnya dan kamu harus memberikan analisis kebutuhan nutrisi harian yang detail.

PENTING: Response HARUS berupa JSON valid tanpa teks tambahan. Format:
{
  "daily_nutrition": {
    "calories": 0,
    "protein": 0,
    "fat": 0,
    "cholesterol": 300,
    "sodium": 2300,
    "carbs": 0,
    "fiber": 25,
    "sugar": 50
  },
  "explanation": "penjelasan detail bagaimana kalkulasi dilakukan berdasarkan BMR dan TDEE",
  "meal_plan": [
    { "meal": "Sarapan", "foods": "contoh makanan", "calories": 500 },
    { "meal": "Snack Pagi", "foods": "contoh makanan", "calories": 200 },
    { "meal": "Makan Siang", "foods": "contoh makanan", "calories": 600 },
    { "meal": "Snack Sore", "foods": "contoh makanan", "calories": 200 },
    { "meal": "Makan Malam", "foods": "contoh makanan", "calories": 500 }
  ],
  "tips": ["tip nutrisi 1", "tip nutrisi 2", "tip nutrisi 3", "tip nutrisi 4"],
  "supplements": ["suplemen yang direkomendasikan"],
  "timeline": "estimasi berapa lama untuk mencapai goal",
  "summary": "ringkasan keseluruhan dalam bahasa Indonesia"
}

Sesuaikan kalori dan macro berdasarkan goal user:
- cutting: deficit 300-500 kkal dari TDEE, protein tinggi 2-2.5g/kg BB
- maintain: sesuai TDEE, protein 1.6-2g/kg BB
- bulking: surplus 300-500 kkal dari TDEE, protein 1.8-2.2g/kg BB
- lean_bulk: surplus 200-300 kkal dari TDEE, protein 2-2.5g/kg BB

Berikan rekomendasi makanan dalam konteks Indonesia.`
        },
        {
          role: "user",
          content: `Data tubuh saya:
- Berat Badan: ${bb} kg
- Tinggi Badan: ${tb} cm
- Usia: ${usia} tahun
- Jenis Kelamin: ${gender === 'male' ? 'Laki-laki' : 'Perempuan'}
- Level Aktivitas: ${activity}
- Goal: ${goal}
- BMI: ${bmi.toFixed(1)}
- BMR (Mifflin-St Jeor): ${bmr.toFixed(0)} kkal
- TDEE: ${tdee.toFixed(0)} kkal

Berikan analisis kebutuhan nutrisi harian saya yang detail.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing body profile:', error.message);
    // Fallback calculation
    const { bb, tdee, goal } = profileData;
    let calories = tdee;
    if (goal === 'cutting') calories -= 400;
    if (goal === 'bulking') calories += 400;
    if (goal === 'lean_bulk') calories += 250;
    
    const protein = Math.round(bb * 2);
    const fat = Math.round(calories * 0.25 / 9);
    const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

    return {
      daily_nutrition: { calories: Math.round(calories), protein, fat, cholesterol: 300, sodium: 2300, carbs, fiber: 25, sugar: 50 },
      explanation: `Kalkulasi lokal (AI tidak tersedia). BMR × activity multiplier = TDEE ${Math.round(tdee)} kkal. Goal ${goal} diterapkan.`,
      meal_plan: [
        { meal: "Sarapan", foods: "Oatmeal + telur + buah", calories: Math.round(calories * 0.25) },
        { meal: "Makan Siang", foods: "Nasi + ayam + sayur", calories: Math.round(calories * 0.3) },
        { meal: "Snack", foods: "Protein shake + kacang", calories: Math.round(calories * 0.15) },
        { meal: "Makan Malam", foods: "Ikan + sayur + nasi", calories: Math.round(calories * 0.3) }
      ],
      tips: ["Minum minimal 2L air per hari", "Makan protein di setiap meal", "Konsumsi sayur dan buah setiap hari"],
      supplements: ["Whey Protein", "Multivitamin", "Omega-3"],
      timeline: `Estimasi 8-12 minggu untuk melihat perubahan signifikan dengan konsistensi`,
      summary: `Estimasi lokal untuk ${goal}. AI tidak tersedia. Gunakan sebagai panduan awal.`
    };
  }
}

// ========================
// GENERATE DAILY RECAP
// ========================
async function generateDailyRecap(data) {
  try {
    const { meals, workouts, profil, date } = data;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Kamu adalah asisten fitness AI bernama "LebihFit Coach". Tugasmu adalah memberikan ringkasan harian (Daily Recap) berdasarkan apa yang dimakan dan dilakukan user hari ini.
Berikan feedback yang memotivasi, informatif, dan sedikit "cyberpunk" style.
Gunakan bahasa Indonesia yang santai tapi profesional.`
        },
        {
          role: "user",
          content: `Ringkasan Harian (${date}):
          
DATA MAKANAN:
${meals.map(m => `- ${m.description} (${m.calories} kkal, P: ${m.protein}g, F: ${m.fat}g, C: ${m.carbs}g)`).join('\n')}

DATA WORKOUT:
${workouts.map(w => `- ${w.type.toUpperCase()}: ${w.total_duration} menit, terbakar ${w.calories_burned} kkal`).join('\n')}

TARGET PROFIL (Kebutuhan Harian):
- Target Kalori: ${profil ? Math.round(profil.target_calories) : 'Belum diatur'} kkal
- Target Protein: ${profil ? Math.round(profil.target_protein) : 'Belum diatur'} g

Berikan ringkasan harian yang mencakup:
1. Evaluasi asupan kalori & nutrisi vs target.
2. Evaluasi workout hari ini.
3. Tips spesifik untuk besok berdasarkan data hari ini.
4. Satu kalimat motivasi bergaya cyberpunk.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024
    });

    return completion.choices[0]?.message?.content || "Gagal menghasilkan ringkasan.";
  } catch (error) {
    console.error('Error generating daily recap:', error.message);
    return "AI sedang offline, tapi kamu sudah melakukan yang terbaik hari ini! Terus konsisten, Cyber-Athlete!";
  }
}

module.exports = {
  analyzeFoodText,
  analyzeFoodImage,
  analyzeBodyImage,
  estimateCaloriesBurned,
  analyzeBodyProfile,
  generateDailyRecap
};
