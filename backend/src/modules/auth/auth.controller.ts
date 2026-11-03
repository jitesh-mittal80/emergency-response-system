import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return next(createError('Invalid credentials', 401));
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return next(createError('Invalid credentials', 401));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(createError('JWT not configured', 500));

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!admin) return next(createError('Admin not found', 404));
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}
