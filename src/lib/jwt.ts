import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'aula-control-dev-secret-key-change-in-production';

export interface JwtPayload {
  userId: string;
  rol: 'encargado' | 'ayudante';
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
