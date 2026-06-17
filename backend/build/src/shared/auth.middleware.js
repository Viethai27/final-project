"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const auth_service_1 = require("../modules/auth/auth.service");
const http_error_1 = require("./http-error");
const getBearerToken = (authorization) => {
    if (!authorization?.startsWith('Bearer ')) {
        return null;
    }
    return authorization.slice('Bearer '.length).trim();
};
const requireAuth = async (req, _res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);
        if (!token) {
            throw new http_error_1.AppError('Chưa đăng nhập.', 401);
        }
        req.user = await (0, auth_service_1.getCurrentUser)(token);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAuth = requireAuth;
