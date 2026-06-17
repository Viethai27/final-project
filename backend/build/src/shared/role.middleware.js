"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const http_error_1 = require("./http-error");
const requireRole = (roles) => (req, _res, next) => {
    const user = req.user;
    if (!user) {
        next(new http_error_1.AppError('Chưa đăng nhập.', 401));
        return;
    }
    if (!roles.includes(user.role)) {
        next(new http_error_1.AppError('Không có quyền truy cập.', 403));
        return;
    }
    next();
};
exports.requireRole = requireRole;
