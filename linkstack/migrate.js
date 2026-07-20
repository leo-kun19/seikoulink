const db = require('./db');

const migrations = [
  "ALTER TABLE users ADD COLUMN og_image TEXT",
  "ALTER TABLE users ADD COLUMN theme_preset TEXT DEFAULT 'default'",
  "ALTER TABLE users ADD COLUMN banner TEXT",
  "ALTER TABLE links ADD COLUMN is_social INTEGER DEFAULT 0",
  "ALTER TABLE links ADD COLUMN schedule_start TEXT",
  "ALTER TABLE links ADD COLUMN schedule_end TEXT",
  "ALTER TABLE links ADD COLUMN is_divider INTEGER DEFAULT 0",
  "ALTER TABLE links ADD COLUMN password TEXT",
  "ALTER TABLE clicks ADD COLUMN country TEXT",
  "ALTER TABLE page_views ADD COLUMN country TEXT",
  "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN verification_token TEXT",
  "ALTER TABLE users ADD COLUMN verification_sent_at TEXT",
  "ALTER TABLE users ADD COLUMN totp_secret TEXT",
  "ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN username_changed_at TEXT"
];

migrations.forEach(function(sql) {
  try {
    db.exec(sql);
    console.log('OK: ' + sql.slice(0, 60));
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('SKIP (exists): ' + sql.slice(0, 60));
    } else {
      console.log('SKIP: ' + e.message);
    }
  }
});

console.log('\nMigration done!');
