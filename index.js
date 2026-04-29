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
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});
// إضافة عضو
app.post('/members', async (req, res) => {
  const {
  full_name,
  registration_number,
  gender,
  graduation_date,
  university,
  national_id,
  birth_year
} = req.body;

 const result = await pool.query(
  `INSERT INTO members 
  (full_name, registration_number, gender, graduation_date, university, national_id, birth_year)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *`,
  [
    full_name,
    registration_number,
    gender,
    graduation_date,
    university,
    national_id,
    birth_year
  ]
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
app.put('/members/:id', async (req, res) => {
  const id = req.params.id;

  const {
    full_name,
    registration_number,
    gender,
    university,
    graduation_date,
    national_id,
    birth_year
  } = req.body;

  await pool.query(
    `UPDATE members SET 
      full_name=$1,
      registration_number=$2,
      gender=$3,
      university=$4,
      graduation_date=$5,
      national_id=$6,
      birth_year=$7
     WHERE id=$8`,
    [
      full_name,
      registration_number,
      gender,
      university,
      graduation_date,
      national_id,
      birth_year,
      id
    ]
  );

  res.json({ message: "تم التحديث ✅" });
});
app.delete('/members/:id', async (req, res) => {
  const id = req.params.id;

  await pool.query(
    `DELETE FROM members WHERE id = $1`,
    [id]
  );

  res.json({ message: "تم حذف العضو ✅" });
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
  background: #ccc;
  font-family: Arial;
}

.page {
  width: 794px;
  height: 1123px;
  margin: auto;
  background-image: url('https://github.com/hosobenzdent/dental-system/blob/main/background.jpg?raw=true');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  position: relative;
}

.content {
  position: absolute;
  top: 300px;
  left: 70px;
  right: 70px;
  text-align: center;
  line-height: 2;
}

.permit-number {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
}

.permit-title {
  font-size: 18px;
  margin-bottom: 20px;
}

.text {
  font-size: 16px;
}

.text p {
  margin: 10px 0;
}
.signature {
  position: absolute;
  bottom: 120px;
  left: 80px;
  text-align: left;
  font-weight: bold;
}
.print-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  background: black;
  color: white;
  padding: 10px;
  border: none;
  cursor: pointer;
}

@media print {
  .print-btn {
    display: none;
  }
}

@page {
  size: A4;
  margin: 0;
}

</style>
</head>

<body>

<button class="print-btn" onclick="window.print()">🖨 طباعة</button>

<div class="page">

  <div class="content">

    <div class="permit-number">
      إذن رقــم (${member.permit_number})
    </div>

    <div class="permit-title">
      بشأن مزاولة مهنة الطب بعيادة أو مؤسسة طبية
    </div>

    <div class="text">

      <p>
      تنفيذا لأحكام القانون رقم (9) لسنة 1985 ولائحته التنفيذية...
      </p>

      <p>
      وبالاشتراك في عضوية نقابة أطباء الأسنان واستيفاء الشروط اللازمة
      </p>

      <p>يؤذن للسيد/السيدة</p>

      <h2>${member.full_name}</h2>

      <p>
        ${genderText.reg} تحت رقم (${member.registration_number})
        ومهنته (${genderText.job})
      </p>

      <p>
        بمزاولة مهنة (طب الأسنان) بعيادة أو مؤسسة طبية
      </p>

      <p>
        وذلك لمدة سنة تبدأ من تاريخ صدوره
      </p>

      <p>
        ويلغى في الحالات المنصوص عليها في القانون
      </p>

      <p>
        صدر هذا الإذن بتاريخ: ${member.issue_date}
      </p>

    </div>

    <br/>

    <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${verifyUrl}" /> 

  </div>
  <!-- التوقيع 👇 -->
    <div class="signature">
      <p>د. حسام الدين عمر بن زايد</p>
      <p>نقيب أطباء الأسنان بالزاوية</p>
    </div>

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
