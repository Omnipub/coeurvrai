import jwt from 'jsonwebtoken';
import { config } from './config';
import { AccountType, UserRole } from '../models/types';

export interface TokenPayload {
  sub: string;
  accountType: AccountType;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
