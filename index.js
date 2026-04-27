const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

// الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// إنشاء جدول إذا لم يوجد
pool.query(`
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  registration_number TEXT,
  gender TEXT,
  permit_number INTEGER,
  issue_date TEXT
);
`);

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send("Dental System API Running");
});

// إضافة عضو
app.post('/members', async (req, res) => {
  const { full_name, registration_number, gender } = req.body;

  const result = await pool.query(
    `INSERT INTO members (full_name, registration_number, gender)
     VALUES ($1, $2, $3) RETURNING *`,
    [full_name, registration_number, gender]
  );

  res.json(result.rows[0]);
});

// عرض الأعضاء
app.get('/members', async (req, res) => {
  const result = await pool.query(`SELECT * FROM members`);
  res.json(result.rows);
});

// إنشاء إذن
app.post('/permit/:id', async (req, res) => {
  const id = req.params.id;

  const permitNumber = Math.floor(Math.random() * 100000);

  await pool.query(
    `UPDATE members 
     SET permit_number = $1, issue_date = CURRENT_DATE
     WHERE id = $2`,
    [permitNumber, id]
  );

  res.json({ permit_number: permitNumber });
});

// عرض إذن
app.get('/permit/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM members WHERE id = $1`,
    [req.params.id]
  );

  const member = result.rows[0];

  if (!member) return res.send("غير موجود");

  if (!member.permit_number) {
    return res.send("⚠️ لم يتم إصدار إذن لهذا العضو بعد");
  }

  const genderText = member.gender === 'female'
    ? { reg: "المسجلة", job: "طبيبة أسنان" }
    : { reg: "المسجل", job: "طبيب أسنان" };

  const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${member.permit_number}`;

  res.send(`
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
body {
  margin: 0;
  font-family: Arial;
}
.page {
  width: 794px;
  height: 1123px;
  background-image: url('https://raw.githubusercontent.com/hosobenzdent/dental-system/main/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  padding: 100px;
  text-align: center;
}

.name {
  font-size: 26px;
  font-weight: bold;
  margin: 20px 0;
}

.text {
  font-size: 18px;
  margin: 10px 0;
}

.print-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 10px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}

@media print {
  .print-btn {
    display: none;
  }
}
</style>
</head>

<body>

<button class="print-btn" onclick="window.print()">🖨 طباعة</button>

<div class="page">
  <div class="text">يؤذن للسيد/السيدة</div>
  <div class="name">${member.full_name}</div>
  <div class="text">${genderText.reg} تحت رقم (${member.registration_number})</div>
  <div class="text">بمزاولة مهنة ${genderText.job}</div>
  <div class="text">تاريخ الإصدار: ${member.issue_date}</div>

  <br/>

  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${verifyUrl}" />
</div>

</body>
</html>
  `);
});

// التحقق
app.get('/verify/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM members WHERE permit_number = $1`,
    [req.params.id]
  );

  const member = result.rows[0];

  if (!member) return res.send("❌ غير صحيح");

  res.send(`
    <h2>✅ إذن صحيح</h2>
    <p>${member.full_name}</p>
  `);
});

app.listen(3000, () => {
  console.log("Server running");
});
