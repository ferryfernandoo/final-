import db from '../server/database.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const firstNames = [
  'Ahmad', 'Budi', 'Rizky', 'Bayu', 'Dimas', 'Aditya', 'Fajar', 'Ilham', 'Farhan', 'Hendra',
  'Wahyu', 'Arif', 'Eko', 'Agus', 'Bambang', 'Dedi', 'Surya', 'Teguh', 'Indra', 'Gilang',
  'Siti', 'Nur', 'Dewi', 'Putri', 'Rini', 'Dian', 'Tri', 'Sri', 'Mega', 'Anisa',
  'Nadia', 'Aulia', 'Fitri', 'Lestari', 'Wulandari', 'Maya', 'Tia', 'Anggun', 'Citra', 'Nabila',
  'Rian', 'Danang', 'Galih', 'Yuda', 'Bagas', 'Doni', 'Rangga', 'Alif', 'Reza', 'Guntur',
  'Zahra', 'Salma', 'Alya', 'Kania', 'Shinta', 'Tiara', 'Bella', 'Clarissa', 'Gisella', 'Melati',
  'Alex', 'David', 'Michael', 'James', 'Daniel', 'Sarah', 'Emma', 'Jessica', 'Emily', 'Chloe',
  'Kenji', 'Takeshi', 'Yuki', 'Chen', 'Wei', 'Li', 'Hao', 'Marcus', 'Lucas', 'Oliver',
  'Satria', 'Bintang', 'Arya', 'Pradipta', 'Pratama', 'Darmawan', 'Mahendra', 'Wicaksono', 'Gunawan', 'Hartono'
];

const lastNames = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Setiawan', 'Hidayat', 'Wibowo', 'Nugroho', 'Purnomo',
  'Siregar', 'Nasution', 'Lubis', 'Harahap', 'Ginting', 'Tarigan', 'Sembiring', 'Pasaribu', 'Simanjuntak', 'Hutapea',
  'Sitorus', 'Manurung', 'Sinaga', 'Panjaitan', 'Simatupang', 'Sitompul', 'Hutabarat', 'Tanjung', 'Chaniago', 'Koto',
  'Piliang', 'Sikumbang', 'Utomo', 'Wahyudi', 'Kurniawan', 'Firmansyah', 'Budiman', 'Handoko', 'Suharto', 'Yuliyanto',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
  'Wong', 'Tan', 'Lim', 'Lee', 'Park', 'Kim', 'Sato', 'Suzuki', 'Takahashi', 'Tanaka'
];

const domains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'deepernova.user.id', 'mail.id', 'cybermail.com', 'techindo.id', 'proton.me'
];

async function seed() {
  console.log('--- Generating real bcrypt password hash ---');
  const hashedPassword = await bcrypt.hash('DeeperNova2026!', 10);
  console.log('✓ Password hash generated');

  const currentCount = db.prepare('SELECT count(*) as c FROM users').get()?.c || 0;
  console.log(`Current users in database: ${currentCount}`);

  const targetToAdd = 2000;
  const existingEmails = new Set(
    db.prepare('SELECT email FROM users').all().map(r => r.email.toLowerCase())
  );

  const insertStmt = db.prepare(`
    INSERT INTO users (id, email, name, password, picture, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  // Spread account creation timestamps over the past 90 days
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const usersToAdd = [];
  let counter = 1;

  while (usersToAdd.length < targetToAdd) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${fn} ${ln}`;

    const numSuffix = Math.floor(10 + Math.random() * 990);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const cleanFn = fn.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLn = ln.toLowerCase().replace(/[^a-z]/g, '');

    // Different realistic email patterns
    const pattern = counter % 4;
    let email = '';
    if (pattern === 0) email = `${cleanFn}.${cleanLn}${numSuffix}@${domain}`;
    else if (pattern === 1) email = `${cleanFn}${cleanLn}${numSuffix}@${domain}`;
    else if (pattern === 2) email = `${cleanLn}.${cleanFn}${numSuffix}@${domain}`;
    else email = `${cleanFn}_${numSuffix}@${domain}`;

    if (existingEmails.has(email)) {
      counter++;
      continue;
    }
    existingEmails.add(email);

    const id = crypto.randomUUID();
    // Random created date between (now - 90 days) and now
    const randomPastTime = new Date(now - Math.floor(Math.random() * ninetyDaysMs));
    const createdAtStr = randomPastTime.toISOString().replace('T', ' ').slice(0, 19);

    // Optional avatar avatar generator URL or null
    const avatar = Math.random() > 0.4
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=ea580c,f97316,6366f1,059669`
      : null;

    usersToAdd.push({
      id,
      email,
      name: fullName,
      password: hashedPassword,
      picture: avatar,
      createdAt: createdAtStr,
      updatedAt: createdAtStr
    });

    counter++;
  }

  console.log(`Generated ${usersToAdd.length} valid accounts. Inserting inside SQLite transaction...`);

  const insertAll = db.transaction((users) => {
    for (const u of users) {
      insertStmt.run(u.id, u.email, u.name, u.password, u.picture, u.createdAt, u.updatedAt);
    }
  });

  const t0 = Date.now();
  insertAll(usersToAdd);
  const elapsed = Date.now() - t0;

  const finalCount = db.prepare('SELECT count(*) as c FROM users').get()?.c || 0;
  console.log(`\n🎉 SUCCESS! Inserted ${usersToAdd.length} accounts in ${elapsed}ms.`);
  console.log(`TOTAL REGISTERED USERS IN DATABASE: ${finalCount}`);
}

seed().catch(console.error);
