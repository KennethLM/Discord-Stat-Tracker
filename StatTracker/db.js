const path = require('path')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, '..', 'storage', 'stats.db'));//currently set to default path

db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        guild_id TEXT,
        username TEXT,
        msgs INTEGER,
        bi_msgs INTEGER,
        total_voice REAL,
        bi_voice REAL
      )
    `);
});

  module.exports = db;