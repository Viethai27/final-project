"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutHandler = exports.meHandler = exports.loginHandler = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const response_1 = require("../../shared/response");
const auth_service_1 = require("./auth.service");
const getBearerToken = (authorization) => {
    if (!authorization?.startsWith('Bearer ')) {
        return null;
    }
    return authorization.slice('Bearer '.length).trim();
};
exports.loginHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const result = await (0, auth_service_1.login)({ username, password });
    (0, response_1.sendSuccess)(res, result);
});
exports.meHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
        throw new http_error_1.AppError('Chưa đăng nhập.', 401);
    }
    const user = await (0, auth_service_1.getCurrentUser)(token);
    (0, response_1.sendSuccess)(res, { user });
});
exports.logoutHandler = (0, async_handler_1.asyncHandler)(async (_req, res) => {
    (0, response_1.sendSuccess)(res, { loggedOut: true });
});
