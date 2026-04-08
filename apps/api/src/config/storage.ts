import path from 'path';

export const ROOT_PATH = path.resolve(__dirname, '../../../../');
export const STORAGE_PATH = path.join(ROOT_PATH, process.env.STORAGE_PATH!);