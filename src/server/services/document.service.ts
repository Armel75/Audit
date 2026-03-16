import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Simulating the secure local storage path (e.g., /var/sorepco/sisar/storage)
const STORAGE_ROOT = path.join(process.cwd(), '.storage');

export class DocumentService {
  /**
   * Saves a file to the local disk securely, renaming it with a UUID.
   * Returns the metadata to be saved in the database.
   */
  static async saveFileLocally(
    tenantId: string, 
    fileBuffer: Buffer, 
    originalName: string, 
    mimeType: string
  ) {
    // 1. Generate UUID for physical file name to prevent Path Traversal
    const fileId = crypto.randomUUID();
    const extension = path.extname(originalName);
    const safeFileName = `${fileId}${extension}`;
    
    // 2. Create Tenant-specific directory structure (e.g., .storage/tenantId/YYYY/MM/)
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const tenantDir = path.join(STORAGE_ROOT, tenantId, year, month);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    
    const fullPath = path.join(tenantDir, safeFileName);
    
    // 3. Calculate SHA-256 Hash for integrity
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const fileHash = hashSum.digest('hex');
    
    // 4. Write to disk
    fs.writeFileSync(fullPath, fileBuffer);
    
    // 5. Return metadata for DB
    return {
      id: fileId,
      originalName,
      mimeType,
      sizeBytes: fileBuffer.length,
      storagePath: fullPath,
      fileHash
    };
  }

  /**
   * Retrieves a file stream for secure download.
   */
  static getFileStream(storagePath: string) {
    if (!fs.existsSync(storagePath)) {
      throw new Error('File not found on disk');
    }
    return fs.createReadStream(storagePath);
  }
}
