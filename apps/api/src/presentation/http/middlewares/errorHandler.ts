import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@campaign/shared';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation Error',
      details: err.errors,
    } as ApiError);
  }

  return res.status(500).json({
    message: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  } as ApiError);
};
