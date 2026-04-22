const express = require('express');
const app = express();

app.use(express.json());

let members = [];
let payments = [];

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send("Dental System API Running");
});

// إضافة عضو
app.post('/members', (req, res) => {
  const member = {
    id: Date.now(),
    ...req.body
  };
  members.push(member);
  res.json(member);
});

// عرض الأعضاء
app.get('/members', (req, res) => {
  res.json(members);
});

// تسجيل دفع
app.post('/payments', (req, res) => {
  payments.push(req.body);
  res.json({ success: true });
});

// تسجيل دخول بسيط
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "123456") {
    return res.json({ token: "demo-token", role: "admin" });
  }

  res.status(401).json({ error: "invalid" });
});

app.listen(3000, () => {
  console.log("Server running");
});
let permitCounter = 1;

// إنشاء إذن مزاولة
app.post('/permit/:id', (req, res) => {
  const member = members.find(m => m.id == req.params.id);

  if (!member) {
    return res.status(404).send("العضو غير موجود");
  }

  const permitNumber = permitCounter++;

  member.permit_number = permitNumber;
  member.issue_date = new Date().toISOString().split('T')[0];

  res.json({
    message: "تم إنشاء الإذن",
    permit_number: permitNumber
  });
});app.get('/permit/:id', (req, res) => {
  const member = members.find(m => m.id == req.params.id);

  if (!member) {
    return res.send("غير موجود");
  }

  const genderText = member.gender === 'female'
    ? { reg: "المسجلة", job: "طبيبة أسنان" }
    : { reg: "المسجل", job: "طبيب أسنان" };

  const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${member.permit_number}`;

  res.send(`
    <html dir="rtl">
    <body style="text-align:center;font-family:Arial">
      <h2>إذن مزاولة مهنة</h2>

      <p>إذن رقم: ${member.permit_number || '---'}</p>

      <p>يؤذن للسيد/السيدة</p>
      <h3>${member.full_name}</h3>

      <p>${genderText.reg} تحت رقم ${member.registration_number}</p>
      <p>ومهنته ${genderText.job}</p>

      <p>لمدة سنة من تاريخ الإصدار</p>
      <p>تاريخ الإصدار: ${member.issue_date || ''}</p>

      <br/>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${verifyUrl}" />

      <p>امسح الرمز للتحقق</p>
    </body>
    </html>
  `);
});app.get('/verify/:id', (req, res) => {
  const member = members.find(m => m.permit_number == req.params.id);

  if (!member) {
    return res.send("❌ الإذن غير صحيح");
  }

  res.send(`
    <h2>✅ إذن صحيح</h2>
    <p>الاسم: ${member.full_name}</p>
    <p>رقم القيد: ${member.registration_number}</p>
  `);
});
