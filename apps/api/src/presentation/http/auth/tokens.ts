import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function signAccessToken(payload: { userId: number; role: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });
}

export function newRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}