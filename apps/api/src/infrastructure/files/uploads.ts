import path from 'path';
import fs from 'fs';

// Chemin ABSOLU garanti vers la racine du projet (Campaign/uploads/campaigns)
export const UPLOADS_ROOT_DIR = path.resolve(__dirname, '../../../../../uploads');
export const CAMPAIGN_UPLOADS_DIR = path.join(UPLOADS_ROOT_DIR, 'campaigns');

export function ensureUploadsDirectories() {
    if (!fs.existsSync(UPLOADS_ROOT_DIR)) {
        fs.mkdirSync(UPLOADS_ROOT_DIR, { recursive: true });
    }

    if (!fs.existsSync(CAMPAIGN_UPLOADS_DIR)) {
        fs.mkdirSync(CAMPAIGN_UPLOADS_DIR, { recursive: true });
    }
}

export function resolveUploadFilePath(filePath: string) {
    const normalizedPath = filePath
        .replace(/\\/g, '/')
        .replace(/^\/?uploads\/?/, '');

    return path.resolve(UPLOADS_ROOT_DIR, normalizedPath);
}