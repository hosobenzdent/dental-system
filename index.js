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
