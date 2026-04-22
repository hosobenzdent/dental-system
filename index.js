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
<head>
<meta charset="UTF-8">
<style>
body {
  font-family: 'Arial';
  text-align: center;
  padding: 40px;
}
.title {
  font-size: 28px;
  font-weight: bold;
}
.subtitle {
  margin-top: 10px;
}
.name {
  font-size: 26px;
  font-weight: bold;
  margin: 20px 0;
}
.box {
  border: 2px solid #000;
  padding: 30px;
  margin-top: 30px;
}
.footer {
  margin-top: 50px;
}
</style>
</head>

<body>

<div class="title">إذن رقم (2020)</div>
<div class="subtitle">بشأن مزاولة مهنة الطب بعيادة أو مؤسسة طبية</div>

<div class="box">

<p>وبالاشتراك في عضوية نقابة أطباء الأسنان واستيفاء الشروط اللازمة</p>

<p>يؤذن للسيد/السيدة</p>

<div class="name">${member.full_name}</div>

<p>${genderText.reg} تحت رقم (${member.registration_number})</p>

<p>بمزاولة مهنة ${genderText.job}</p>

<p>وذلك لمدة سنة تبدأ من تاريخ صدوره</p>

<p>تاريخ الإصدار: ${member.issue_date}</p>

</div>

<br/>

<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${verifyUrl}" />

<p>امسح الرمز للتحقق</p>

<div class="footer">
<p>نقيب أطباء الأسنان</p>
<p>د. حسام الدين عمر بن زايد</p>
</div>

</body>
</html>
  `);
});
