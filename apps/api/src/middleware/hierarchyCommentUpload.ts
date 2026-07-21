import multer from 'multer';

// Utilisation du stockage mémoire, car les fichiers sont gérés ailleurs (DocumentService)
export const hierarchyCommentUpload = multer({ storage: multer.memoryStorage() });
