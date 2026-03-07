import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@campaign/shared';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' } as ApiError);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super-secret-jwt-key-change-me'
    ) as any;

    req.user = {
      userId: Number(decoded.userId),
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' } as ApiError);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' } as ApiError);
    }
    next();
  };
};