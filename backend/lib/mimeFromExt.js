const path = require('path');

/** Maps common file extensions to MIME types for reliable preview/download when DB mime is missing. */
const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function mimeFromFilename(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  return EXT_TO_MIME[ext] || null;
}

/**
 * Resolve Content-Type: prefer stored mime when present and not generic; otherwise infer from extension.
 */
function resolveContentType(storedMime, filename) {
  const inferred = mimeFromFilename(filename);
  const m = String(storedMime || '').trim().toLowerCase();
  if (!m || m === 'application/octet-stream') return inferred || 'application/octet-stream';
  return m;
}

module.exports = { mimeFromFilename, resolveContentType };
