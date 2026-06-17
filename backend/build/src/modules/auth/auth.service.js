"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.verifyAuthToken = exports.createAuthToken = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 8 * 60 * 60);
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? 'dev-phase-1-auth-secret-change-me';
const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');
const sign = (value) => crypto_1.default.createHmac('sha256', TOKEN_SECRET).update(value).digest('base64url');
const mapUser = (user) => ({
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
};
const createAuthToken = (payload) => {
    const body = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(body));
    return `${encodedPayload}.${sign(encodedPayload)}`;
};
exports.createAuthToken = createAuthToken;
const verifyAuthToken = (token) => {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
        throw new http_error_1.AppError('Token không hợp lệ.', 401);
    }
    let payload;
    try {
        payload = JSON.parse(base64UrlDecode(encodedPayload));
    }
    catch {
        throw new http_error_1.AppError('Token không hợp lệ.', 401);
    }
    if (!payload.sub || !payload.username || !payload.role || !payload.exp) {
        throw new http_error_1.AppError('Token không hợp lệ.', 401);
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new http_error_1.AppError('Phiên đăng nhập đã hết hạn.', 401);
    }
    return payload;
};
exports.verifyAuthToken = verifyAuthToken;
const login = async (input) => {
    const username = input.username.trim();
    if (!username || !input.password) {
        throw new http_error_1.AppError('Vui lòng nhập tài khoản và mật khẩu.', 400);
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { username },
        select: userSelect,
    });
    if (!user) {
        throw new http_error_1.AppError('Tài khoản hoặc mật khẩu không đúng.', 401);
    }
    if (!user.isActive) {
        throw new http_error_1.AppError('Tài khoản đã bị khóa hoặc ngừng hoạt động.', 403);
    }
    const passwordMatched = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    if (!passwordMatched) {
        throw new http_error_1.AppError('Tài khoản hoặc mật khẩu không đúng.', 401);
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
        select: userSelect,
    });
    const token = (0, exports.createAuthToken)({
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
exports.login = login;
const getCurrentUser = async (token) => {
    const payload = (0, exports.verifyAuthToken)(token);
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: payload.sub },
        select: userSelect,
    });
    if (!user || !user.isActive) {
        throw new http_error_1.AppError('Tài khoản không còn quyền truy cập.', 401);
    }
    return mapUser(user);
};
exports.getCurrentUser = getCurrentUser;
