import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class DocumentService {
  static async saveFileLocally(tenantId: number, buffer: Buffer, originalName: string, mimeType: string) {
    //const storagePath = path.join(process.cwd(), '../../.storage', tenantId.toString());
    const storagePath = path.resolve(process.cwd(), 'storage', tenantId.toString());
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = `${Date.now()}-${originalName}`;
    const filePath = path.join(storagePath, fileName);

    fs.writeFileSync(filePath, buffer);

    return {
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      storagePath: filePath,
      fileHash
    };
  }

  static getFileStream(storagePath: string) {
    if (!fs.existsSync(storagePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(storagePath);
  }
}
