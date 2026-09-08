const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'carsafi.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbFile);

const demoAccounts = [
  { id: 'admin-1', name: 'Sam Abdi', role: 'administrator', email: 'admin@carsafi.test', password: 'admin123', initials: 'SA' },
  { id: 'user-1', name: 'Nadia Otieno', role: 'user', email: 'user@carsafi.test', password: 'user123', initials: 'NO' }
];

const demoServices = [
  { plate: 'KDA 284M', customer: 'Amina Noor', vehicle: 'SUV', wash: 'Premium wash', attendant: 'Juma Kariuki', amount: 1500, status: 'paid', datetime: '2026-09-07T08:42', notes: '', createdBy: 'admin-1' },
  { plate: 'KCB 901A', customer: 'David Mwangi', vehicle: 'Sedan', wash: 'Standard wash', attendant: 'Mary Wanjiku', amount: 800, status: 'paid', datetime: '2026-09-07T08:19', notes: '', createdBy: 'admin-1' },
  { plate: 'KDH 118K', customer: 'Rita Okello', vehicle: 'Pickup', wash: 'Full detail', attendant: 'Peter Otieno', amount: 2800, status: 'unpaid', datetime: '2026-09-07T07:55', notes: '', createdBy: 'admin-1' },
  { plate: 'KDG 442P', customer: 'Omar Ali', vehicle: 'Sedan', wash: 'Interior detail', attendant: 'Faith Njeri', amount: 1200, status: 'partial', datetime: '2026-09-06T17:30', notes: '', createdBy: 'admin-1' },
  { plate: 'KDE 773T', customer: 'Wambui Maina', vehicle: 'SUV', wash: 'Premium wash', attendant: 'Juma Kariuki', amount: 1500, status: 'paid', datetime: '2026-09-06T16:44', notes: '', createdBy: 'admin-1' },
  { plate: 'KDF 201B', customer: 'Brian Otieno', vehicle: 'Van', wash: 'Standard wash', attendant: 'Mary Wanjiku', amount: 1000, status: 'paid', datetime: '2026-09-06T15:12', notes: '', createdBy: 'admin-1' }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      initials TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL,
      customer TEXT NOT NULL,
      vehicle TEXT NOT NULL,
      wash TEXT NOT NULL,
      attendant TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      datetime TEXT NOT NULL,
      notes TEXT DEFAULT '',
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const account of demoAccounts) {
    await run(
      `INSERT OR IGNORE INTO users (id, name, role, email, password, initials) VALUES (?, ?, ?, ?, ?, ?)`,
      [account.id, account.name, account.role, account.email, account.password, account.initials]
    );
  }

  const existingCount = await get('SELECT COUNT(*) AS total FROM services');

  if ((existingCount?.total || 0) === 0) {
    for (const service of demoServices) {
      await run(
        `INSERT INTO services (plate, customer, vehicle, wash, attendant, amount, status, datetime, notes, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [service.plate, service.customer, service.vehicle, service.wash, service.attendant, service.amount, service.status, service.datetime, service.notes, service.createdBy]
      );
    }
  }

  return true;
}

async function getUsers() {
  return all(`SELECT id, name, role, email, initials FROM users ORDER BY name ASC`);
}

async function loginUser(email, password) {
  const user = await get(
    `SELECT id, name, role, email, initials FROM users WHERE email = ? AND password = ? LIMIT 1`,
    [email, password]
  );

  return user || null;
}

async function getServices() {
  const rows = await all(`
    SELECT s.*, u.name AS createdByName, u.role AS createdByRole, u.initials AS createdByInitials
    FROM services s
    LEFT JOIN users u ON u.id = s.createdBy
    ORDER BY datetime DESC
  `);

  return rows.map((service) => ({
    ...service,
    amount: Number(service.amount || 0),
    createdByName: service.createdByName || 'Unknown user',
    createdByRole: service.createdByRole || 'user'
  }));
}

async function createService(payload) {
  const {
    plate,
    customer,
    vehicle,
    wash,
    attendant,
    amount,
    status,
    datetime,
    notes,
    createdBy
  } = payload;

  const result = await run(
    `INSERT INTO services (plate, customer, vehicle, wash, attendant, amount, status, datetime, notes, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [plate, customer, vehicle, wash, attendant, Number(amount || 0), status || 'paid', datetime, notes || '', createdBy || 'admin-1']
  );

  const created = await get(
    `SELECT s.*, u.name AS createdByName, u.role AS createdByRole, u.initials AS createdByInitials
     FROM services s
     LEFT JOIN users u ON u.id = s.createdBy
     WHERE s.id = ?`,
    [result.lastID]
  );

  return {
    ...created,
    amount: Number(created.amount || 0),
    createdByName: created.createdByName || 'Unknown user',
    createdByRole: created.createdByRole || 'user'
  };
}

module.exports = {
  db,
  initDb,
  getUsers,
  loginUser,
  getServices,
  createService
};
