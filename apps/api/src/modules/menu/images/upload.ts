import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../../../lib/app-error';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 4, parts: 5 },
});

/** Campo `image` (un archivo) + campos de texto; traduce los errores de multer a AppError. */
export const imageUpload: RequestHandler = (req, res, next) => {
  multerUpload.single('image')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, 'IMAGE_TOO_LARGE', 'Image larger than 10 MB'));
      }
      return next(new AppError(400, 'INVALID_UPLOAD', 'Invalid upload'));
    }
    next(err);
  });
};
