import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { q, DB_PATH } from './db.js';
import { attachUser, purgeExpiredSessions, hashPassword, normalizeEmail } from './auth.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Harden responses a little. The 3D scene is all first-party code plus inline
// styles, so a strict-ish policy still works.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(attachUser);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'numeria', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown endpoint.' }));

// Serve the built client when one exists (production / preview).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (req, res) => {
    res.type('html').send(
      '<h1>Numeria API</h1><p>The API is running. Start the client with <code>npm run dev</code> from the project root, ' +
        'then open the Vite URL it prints.</p>'
    );
  });
}

// Express 4 error handler: four arguments are required for it to be recognised.
app.use((err, req, res, next) => {
  console.error('[numeria] unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

/* ------------------------------------------------------------------ */
/* First-run admin account                                             */
/* ------------------------------------------------------------------ */

function seedAdmin() {
  const existing = q.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing) return;

  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@numeria.local');
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url') + '7a';
  const already = q.get('SELECT id FROM users WHERE email = ?', email);
  if (already) {
    q.run("UPDATE users SET role = 'admin' WHERE id = ?", already.id);
    console.log('[numeria] promoted existing account ' + email + ' to admin.');
    return;
  }
  const { hash, salt } = hashPassword(password);
  q.run(
    `INSERT INTO users (email, password_hash, password_salt, role, display_name, onboarded)
     VALUES (?, ?, ?, 'admin', 'Administrator', 1)`,
    email, hash, salt
  );
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │  Numeria admin account created                          │');
  console.log('  ├─────────────────────────────────────────────────────────┤');
  console.log('  │  Email:    ' + email.padEnd(44) + ' │');
  console.log('  │  Password: ' + password.padEnd(44) + ' │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('  Save this password now. It is shown only once.');
  console.log('  Set ADMIN_EMAIL / ADMIN_PASSWORD to choose your own.');
  console.log('');
}

seedAdmin();
purgeExpiredSessions();
setInterval(purgeExpiredSessions, 6 * 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log('[numeria] API listening on http://localhost:' + PORT);
  console.log('[numeria] database: ' + DB_PATH);
});
