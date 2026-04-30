const express = require('express');
const { Pool } = require('pg');
require('dotenv').config(); // تحميل متغيرات البيئة

const app = express();
app.use(express.json());

// 1. الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. إنشاء الجدول وتحديث الأعمدة الناقصة
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        registration_number TEXT,
        gender TEXT,
        university TEXT,
        graduation_date TEXT,
        national_id TEXT,
        birth_year TEXT,
        permit_number INTEGER,
        issue_date DATE
      );
    `);
    console.log("Database initialized successfully ✅");
  } catch (err) {
    console.error("Error initializing database: ", err);
  }
};
initDB();

// --- المسارات (Routes) ---

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send("<h1>Dental Union System - Online ✅</h1>");
});

// إضافة عضو جديد
app.post('/members', async (req, res) => {
  try {
    const { full_name, registration_number, gender, graduation_date, university, national_id, birth_year } = req.body;
    const result = await pool.query(
      `INSERT INTO members 
      (full_name, registration_number, gender, graduation_date, university, national_id, birth_year)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [full_name, registration_number, gender, graduation_date, university, national_id, birth_year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "خطأ أثناء إضافة العضو: " + err.message });
  }
});

// عرض كل الأعضاء
app.get('/members', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM members ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تحديث بيانات عضو
app.put('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, registration_number, gender, university, graduation_date, national_id, birth_year } = req.body;
    
    await pool.query(
      `UPDATE members SET 
        full_name=$1, registration_number=$2, gender=$3, university=$4, 
        graduation_date=$5, national_id=$6, birth_year=$7
      WHERE id=$8`,
      [full_name, registration_number, gender, university, graduation_date, national_id, birth_year, id]
    );
    res.json({ message: "تم تحديث البيانات بنجاح ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حذف عضو
app.delete('/members/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM members WHERE id = $1`, [req.params.id]);
    res.json({ message: "تم حذف العضو بنجاح ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إصدار رقم إذن مزاولة
app.post('/permit/:id', async (req, res) => {
  try {
    const permitNumber = Math.floor(10000 + Math.random() * 90000); // رقم خماسي
    await pool.query(
      `UPDATE members SET permit_number = $1, issue_date = CURRENT_DATE WHERE id = $2`,
      [permitNumber, req.params.id]
    );
    res.json({ message: "تم إصدار الإذن", permit_number: permitNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// عرض الإذن الرسمي للطباعة
app.get('/permit/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM members WHERE id = $1`, [req.params.id]);
    const member = result.rows[0];

    if (!member || !member.permit_number) {
      return res.status(404).send("<h2>⚠️ عذراً، لا يوجد إذن مزاولة لهذا العضو</h2>");
    }

    const isFemale = member.gender === 'أنثى' || member.gender === 'female';
    const title = isFemale ? "السيدة" : "السيد";
    const profession = isFemale ? "طبيبة أسنان" : "طبيب أسنان";
    const registeredAs = isFemale ? "المسجلة" : "المسجل";
    
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${member.permit_number}`;

    res.send(`
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>إذن مزاولة - ${member.full_name}</title>
        <style>
            body { margin: 0; background: #f0f0f0; font-family: 'Arial', sans-serif; }
            .page { width: 210mm; height: 297mm; padding: 20mm; margin: 10mm auto; background: white; border: 1px solid #d3d3d3; position: relative; box-sizing: border-box; }
            .content { text-align: center; margin-top: 100px; }
            .permit-number { font-size: 24px; font-weight: bold; color: #1a5f7a; }
            .permit-title { font-size: 22px; margin: 20px 0; border-bottom: 2px solid #333; display: inline-block; padding-bottom: 5px; }
            .text-body { font-size: 18px; line-height: 1.8; text-align: justify; margin-top: 30px; }
            .member-name { font-size: 26px; font-weight: bold; color: #c0392b; margin: 15px 0; }
            .qr-code { margin-top: 40px; }
            .signature { position: absolute; bottom: 80px; left: 80px; text-align: center; }
            .print-btn { position: fixed; top: 20px; left: 20px; padding: 10px 20px; background: #27ae60; color: white; border: none; cursor: pointer; border-radius: 5px; font-weight: bold; }
            @media print { .print-btn { display: none; } .page { margin: 0; border: none; } }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()">🖨 طباعة الإذن</button>
        <div class="page">
            <div class="content">
                <div class="permit-number">إذن رقــم: ${member.permit_number}</div>
                <div class="permit-title">إذن مزاولة مهنة طب الأسنان</div>
                
                <div class="text-body">
                    <p>بناءً على أحكام التشريعات النافذة المنظمة للمهن الطبية، وبعد الإطلاع على ملف العضو المذكور أدناه واستيفاء كافة الشروط القانونية لنقابة أطباء الأسنان.</p>
                    <p align="center">يؤذن لـ ${title}/</p>
                    <div class="member-name">${member.full_name}</div>
                    <p>باعتباره/ها <strong>${registeredAs}</strong> بالنقابة تحت رقم قيد (<strong>${member.registration_number}</strong>) ومهنته/ها (<strong>${profession}</strong>) بمزاولة المهنة في العيادات والمؤسسات الطبية المعتمدة.</p>
                    <p>صدر هذا الإذن بتاريخ: ${new Date(member.issue_date).toLocaleDateString('ar-LY')}</p>
                    <p>صلاحية الإذن: سنة واحدة من تاريخ الصدور.</p>
                </div>

                <div class="qr-code">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${verifyUrl}" />
                    <p style="font-size: 12px;">امسح الكود للتحقق من صحة البيانات</p>
                </div>
            </div>

            <div class="signature">
                <p>نقيب أطباء الأسنان</p>
                <p><strong>د. حسام الدين عمر بن زايد</strong></p>
                <p>ـــــــــــــــــــــــــــــــــــــ</p>
            </div>
        </div>
    </body>
    </html>
    `);
  } catch (err) {
    res.status(500).send("خطأ في النظام");
  }
});

// التحقق من الإذن عبر الـ QR
app.get('/verify/:permit_number', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM members WHERE permit_number = $1`, [req.params.permit_number]);
    const member = result.rows[0];

    if (!member) return res.status(404).send("<h2 style='color:red;'>❌ بيانات غير صحيحة أو إذن ملغي</h2>");

    res.send(`
      <div style="text-align:center; font-family:Arial; direction:rtl; border:2px solid green; padding:20px; margin:20px;">
        <h2 style="color:green;">✅ إذن مزاولة معتمد</h2>
        <p><strong>الاسم:</strong> ${member.full_name}</p>
        <p><strong>رقم القيد:</strong> ${member.registration_number}</p>
        <p><strong>تاريخ الإصدار:</strong> ${new Date(member.issue_date).toLocaleDateString('ar-LY')}</p>
        <p>الحالة: ساري المفعول</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send("خطأ في التحقق");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
