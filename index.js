const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

// الاتصال بقاعدة البيانات (Supabase / Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// إنشاء الجدول
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
  res.send("Dental System Running ✅");
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

  const permitNumber = Math.floor(1000 + Math.random() * 9000);

  await pool.query(
    `UPDATE members 
     SET permit_number = $1, issue_date = CURRENT_DATE
     WHERE id = $2`,
    [permitNumber, id]
  );

  res.json({ permit_number: permitNumber });
});

// عرض إذن رسمي
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

  // 👇 النص الذكي حسب الجنس
  const isFemale = member.gender === 'female';

  const genderText = {
    reg: isFemale ? "المسجلة" : "المسجل",
    job: isFemale ? "طبيبة أسنان" : "طبيب أسنان"
  };

  const titleText = isFemale ? "السيدة" : "السيد";

  const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${member.permit_number}`;

  res.send(`
<html dir="rtl">
<head>
<meta charset="UTF-8">

<style>

body {
  margin: 0;
  font-family: Arial;
  direction: rtl;
  text-align: center;
}

/* صفحة A4 */
.page {
  width: 794px;
  height: 1123px;
  margin: auto;
  background-image: url('https://github.com/hosobenzdent/dental-system/blob/main/background.jpg?raw=true');
  background-size: 100% 100%; 
  background-repeat: no-repeat;
  position: relative;
  padding: 300px 80px 80px 80px;
  box-sizing: border-box; 
}

/* رقم الإذن */
.permit-number {
  font-size: 26px;
  font-weight: bold;
}

/* العنوان */
.permit-title {
  margin-top: 10px;
  font-size: 18px;
}

/* الاسم */
.name {
  font-size: 26px;
  font-weight: bold;
  margin: 20px 0;
}

/* النص */
.text {
  margin-top: 40px;
  line-height: 2;
  font-size: 18px;
}

/* QR */
.qr {
  margin-top: 20px;
}

/* التوقيع */
.signature {
  margin-top: 60px;
  text-align: left;
  padding-left: 50px;
}

/* زر الطباعة */
.print-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}

/* الطباعة */
@media print {
  .print-btn {
    display: none;
  }
}

/* حجم الصفحة */
@page {
  size: A4;
  margin: 0;
}

</style>
</head>

<body>

<button class="print-btn" onclick="window.print()">🖨 طباعة</button>

<div class="page">

<div class="permit-number">
إذن رقــم (${member.permit_number})
</div>

<div class="permit-title">
بشأن مزاولة مهنة الطب بعيادة أو مؤسسة طبية
</div>

<div class="text">

<p>
تنفيذا لأحكام القانون رقم (9) لسنة 1985 ولائحته التنفيذية الصادرة بقرار اللجنة الشعبية العامة (سابقا) رقم (698) لسنة 1985
وقرار أمين اللجنة الشعبية العامة للصحة (سابقا) رقم (67) لسنة 1986
بتحديد الأنشطة والأعمال الطبية التي يجوز مزاولتها في العيادات والمؤسسات الطبية.
</p>

<p>
وبالاشتراك في عضوية نقابة أطباء الأسنان واستيفاء الشروط اللازمة للحصول على الإذن
</p>

<p>
يؤذن لـ ${titleText}
</p>

<div class="name">
د/ ${member.full_name}
</div>

<p>
${genderText.reg} تحت رقم (${member.registration_number})
ومهنته (${genderText.job})
بمزاولة مهنة (طب الأسنان) بعيادة أو مؤسسة طبية
</p>

<p>
وذلك لمدة سنة تبدأ من تاريخ صدوره
</p>

<p>
ويلغى في الحالات المنصوص عليها في نص القانون رقم (9) لسنة (1985)
</p>

<p>
صدر هذا الإذن بتاريخ: ${member.issue_date}
</p>

</div>

<div class="qr">
<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${verifyUrl}" />
</div>

<div class="signature">
<p>د. حسام الدين عمر بن زايد</p>
<p>نقيب أطباء الأسنان بالزاوية</p>
</div>

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
  console.log("Server running 🚀");
});
