import path from 'path';

// __dirname est défini en CJS (tsx/tsc) mais absent en ESM (Vitest) :
// en ESM, le répertoire de travail est la racine du repo (== ROOT_PATH).
export const ROOT_PATH =
  typeof __dirname !== 'undefined'
    ? path.resolve(__dirname, '../../../../')
    : process.cwd();
export const STORAGE_PATH = path.join(ROOT_PATH, process.env.STORAGE_PATH!);