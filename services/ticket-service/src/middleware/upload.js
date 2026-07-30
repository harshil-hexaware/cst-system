'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config/env');
const { ApiError } = require('./errorHandler');

if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.upload.dir),
  filename: (req, file, cb) => {
    // Never trust the client-supplied filename for the on-disk name —
    // prevents path traversal and overwrite attacks. Original name is
    // preserved separately in the DB record for display purposes.
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const randomName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, randomName);
  },
});

function fileFilter(req, file, cb) {
  if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', `File type ${file.mimetype} is not allowed`));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024, files: 5 },
});

module.exports = upload;
