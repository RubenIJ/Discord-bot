const Database = require('better-sqlite3');
const db = new Database('projectdata.db');

// 1. Tabel voor scores en gebruikers (voor /pinpointscore en het leaderboard)
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    laatste_keer TEXT
  )
`);

// 2. Tabel om de dagelijkse bezienswaardigheid vast te leggen (zodat het per dag verschilt)
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_pinpoint (
    dag TEXT PRIMARY KEY,
    titel TEXT,
    land TEXT,
    image_url TEXT,
    beschrijving TEXT
  )
`);

console.log("Database voor PinPoint (Scores & Wikipedia data) is klaar!");

module.exports = db;