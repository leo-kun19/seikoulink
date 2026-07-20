const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, '.env'))) {
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('hex');
  const envContent = `PORT=3500\nJWT_SECRET=${secret}\nDOMAIN=link.seikoupay.my.id\nNODE_ENV=production\n`;
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log('.env file created with random JWT secret');
}

const db = require('./db');

const adminExists = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
if (!adminExists) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n--- Setup Admin Account ---');
  const adminUser = process.env.ADMIN_USER || 'owner';
  const adminPass = process.env.ADMIN_PASS || require('crypto').randomBytes(12).toString('base64url');
  const adminEmail = process.env.ADMIN_EMAIL || 'seikou.jokki@gmail.com';

  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare('INSERT INTO users (username, email, password, display_name, is_admin, email_verified) VALUES (?, ?, ?, ?, 1, 1)').run(
    adminUser, adminEmail, hash, 'Admin'
  );
  console.log('Admin user created:');
  console.log('  Username: ' + adminUser);
  console.log('  Password: ' + adminPass);
  console.log('  PENTING: Simpan password ini! Tidak bisa dilihat lagi.');
} else {
  console.log('Admin user already exists');
}

console.log('\nSetup complete! Run: npm start');
