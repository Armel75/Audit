import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Ce module doit être importé EN PREMIER dans server.ts.
// En mode CJS (tsx), les require() s'exécutent dans l'ordre des imports :
// importer ce fichier avant tout autre garantit que dotenv.config() tourne
// avant que storage.ts (ou tout module lisant process.env) ne soit évalué.

// __dirname est défini en CJS (tsx/tsc) mais absent en ESM (Vitest) :
// fallback vers le répertoire de travail (racine du repo) dans ce cas.
const envPath =
  typeof __dirname !== 'undefined'
    ? path.resolve(__dirname, '../../../../.env')
    : path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️ .env not found at:', envPath);
}
