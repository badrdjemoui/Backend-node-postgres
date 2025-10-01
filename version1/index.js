// استيراد المكتبات
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// الاتصال بقاعدة البيانات
const pool = new Pool({
  host: 'postgres-dbb', // اسم الحاوية متاع PostgreSQL
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

