import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  admin?: { id: string; email: string; role: string };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(createError('JWT secret not configured', 500));
  }

  try {
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };
    req.admin = decoded;
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}
