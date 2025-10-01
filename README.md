# Backend-node-postgres
create Backend using node:18 and progress latest

الهدف: عندنا مشروع بيع/شراء منتجات :

🟢 حاوية خاصة بقاعدة البيانات (PostgreSQL)

🟢 حاوية خاصة بالباك-إند (Node.js + Express)

🔗 وربطهم بشبكة مشتركة باش يتواصلو مع بعض

🟩 الجزء الأول: قاعدة البيانات PostgreSQL
1. إنشاء شبكة خاصة

باش الحاويتين يتكلمو مع بعض بلا مشاكل:



docker network create shop-net


2. تشغيل PostgreSQL في حاوية

docker run -d \
  --name postgres-db \
  --network shop-net \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=shopdb \
  -v /home/badr/postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:latest


📌 التوضيح:

--name postgres-db → اسم الحاوية

--network shop-net → نربطها بالشبكة الجديدة

-e ... → متغيرات البيئة (مستخدم/كلمة سر/قاعدة بيانات)

-v ... → نخزنو البيانات في مجلد محلي باش ما تضيعش

-p 5432:5432 → نفتح المنفذ باش تقدر تدخل من جهازك


🟩 الجزء الثاني: مشروع الباك-إند Node.js
1. تجهيز الملفات

📂 في جهازك أنشئ مجلد:


/home/badr/shop-backend



فيه ملف package.json:

{
  "name": "shop-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0"
  }
}


وملف index.js:

// استيراد المكتبات

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// الاتصال بقاعدة البيانات
const pool = new Pool({
  host: 'postgres-db', // اسم الحاوية متاع Postgres
  port: 5432,
  user: 'admin',
  password: 'admin123',
  database: 'shopdb',
});

// إنشاء جدول للمنتجات
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      quantity INT NOT NULL
    )
  `);
})();

// API: إضافة منتج
app.post('/products', async (req, res) => {
  const { name, price, quantity } = req.body;
  const result = await pool.query(
    'INSERT INTO products (name, price, quantity) VALUES ($1, $2, $3) RETURNING *',
    [name, price, quantity]
  );
  res.json(result.rows[0]);
});

// API: عرض المنتجات
app.get('/products', async (req, res) => {
  const result = await pool.query('SELECT * FROM products');
  res.json(result.rows);
});

// API: شراء منتج (تخفيض الكمية)
app.post('/buy/:id', async (req, res) => {
  const { qty } = req.body;
  const id = req.params.id;

  const result = await pool.query(
    'UPDATE products SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING *',
    [qty, id]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Stock not enough or invalid ID' });
  }
  res.json(result.rows[0]);
});

// تشغيل السيرفر
app.listen(3000, () => {
  console.log('🚀 Backend running on port 3000');
});

2. تشغيل الباك-إند داخل حاوية Node
docker run -d \
  --name shop-backend \
  --network shop-net \
  -v /home/badr/shop-backend:/usr/src/app \
  -w /usr/src/app \
  -p 3000:3000 \
  node:18 \
  npm start


📌 التوضيح:

-v ... → نركب مجلد المشروع داخل الحاوية

-w /usr/src/app → نحدد مجلد العمل داخل الحاوية

-p 3000:3000 → API يكون متاح على http://localhost:3000

npm start → يشغل السيرفر

🟩 الجزء الثالث: التجربة
إضافة منتج:
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"شعير","price":100,"quantity":200}'

عرض المنتجات:
curl http://localhost:3000/products

شراء 20 كيلو من المنتج ID=1:
curl -X POST http://localhost:3000/buy/1 \
  -H "Content-Type: application/json" \
  -d '{"qty":20}'


🎯 الآن عندك مشروع يدوي:

قاعدة بيانات Postgres في حاوية وحدها

باك-إند Node.js في حاوية وحدها

متصلين عبر شبكة shop-net
