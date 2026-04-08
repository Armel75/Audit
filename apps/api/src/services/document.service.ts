import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STORAGE_PATH } from '../config/storage';

export class DocumentService {
  static async saveFileLocally(
    tenantId: number,
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ) {

    const BASE_STORAGE = STORAGE_PATH;

    if (!BASE_STORAGE) {
      throw new Error('STORAGE_PATH non défini');
    }

    // 📁 isolation tenant
    const tenantDir = path.join(BASE_STORAGE, tenantId.toString());

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // 🔐 hash fichier
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 🔒 sécurisation nom fichier
    const ext = path.extname(originalName);
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_');

    const fileName = `${Date.now()}-${fileHash.slice(0, 12)}-${safeBaseName}${ext}`;

    const fullPath = path.join(tenantDir, fileName);

    fs.writeFileSync(fullPath, buffer);

    return {
      originalName,
      mimeType,
      sizeBytes: buffer.length,

      // 🔥 IMPORTANT → RELATIF
      storagePath: path.join(tenantId.toString(), fileName),

      fileHash
    };
  }

  static getFullPath(storagePath: string) {
    const normalizedPath = path
      .normalize(storagePath)
      .replace(/^(\.\.(\/|\\|$))+/, '');

    return path.join(STORAGE_PATH, normalizedPath);
  }


  static getFileStream(storagePath: string) {
    const fullPath = this.getFullPath(storagePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    return fs.createReadStream(fullPath);
  }
}