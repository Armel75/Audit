import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Ce module doit être importé EN PREMIER dans server.ts.
// En mode CJS (tsx), les require() s'exécutent dans l'ordre des imports :
// importer ce fichier avant tout autre garantit que dotenv.config() tourne
// avant que storage.ts (ou tout module lisant process.env) ne soit évalué.

const envPath = path.resolve(__dirname, '../../../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️ .env not found at:', envPath);
}
