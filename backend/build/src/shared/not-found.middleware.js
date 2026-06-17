"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = void 0;
const http_error_1 = require("./http-error");
const notFoundMiddleware = (req, _res, next) => {
    next(new http_error_1.AppError(`Route not found: ${req.originalUrl}`, 404));
};
exports.notFoundMiddleware = notFoundMiddleware;
