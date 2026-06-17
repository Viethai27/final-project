import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http-error';

const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 8 * 60 * 60);
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? 'dev-phase-1-auth-secret-change-me';

type TokenPayload = {
  sub: string;
  username: string;
  role: UserRole;
  exp: number;
};

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string) =>
  crypto.createHmac('sha256', TOKEN_SECRET).update(value).digest('base64url');

const mapUser = (user: {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  department: { id: string; name: string; code: string } | null;
  doctorProfile?: { id: string; defaultRoomId: string | null } | null;
  isActive: boolean;
  lastLogin: Date | null;
}) => ({
  id: user.id,
  username: user.username,
  name: user.fullName,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  department: user.department?.name ?? null,
  departmentId: user.department?.id ?? null,
  departmentCode: user.department?.code ?? null,
  doctorProfileId: user.doctorProfile?.id ?? null,
  roomId: user.doctorProfile?.defaultRoomId ?? null,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
});

const userSelect = {
  id: true,
  username: true,
  passwordHash: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  lastLogin: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  doctorProfile: {
    select: {
      id: true,
      defaultRoomId: true,
    },
  },
} as const;

export const createAuthToken = (payload: Omit<TokenPayload, 'exp'>) => {
  const body: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

export const verifyAuthToken = (token: string): TokenPayload => {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    throw new AppError('Token không hợp lệ.', 401);
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
  } catch {
    throw new AppError('Token không hợp lệ.', 401);
  }

  if (!payload.sub || !payload.username || !payload.role || !payload.exp) {
    throw new AppError('Token không hợp lệ.', 401);
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError('Phiên đăng nhập đã hết hạn.', 401);
  }

  return payload;
};

export const login = async (input: { username: string; password: string }) => {
  const username = input.username.trim();

  if (!username || !input.password) {
    throw new AppError('Vui lòng nhập tài khoản và mật khẩu.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: userSelect,
  });

  if (!user) {
    throw new AppError('Tài khoản hoặc mật khẩu không đúng.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Tài khoản đã bị khóa hoặc ngừng hoạt động.', 403);
  }

  const passwordMatched = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatched) {
    throw new AppError('Tài khoản hoặc mật khẩu không đúng.', 401);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
    select: userSelect,
  });

  const token = createAuthToken({
    sub: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
  });

  return {
    token,
    expiresIn: TOKEN_TTL_SECONDS,
    user: mapUser(updatedUser),
  };
};

export const getCurrentUser = async (token: string) => {
  const payload = verifyAuthToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError('Tài khoản không còn quyền truy cập.', 401);
  }

  return mapUser(user);
};
