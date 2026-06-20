"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, options) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = options?.code;
        this.details = options?.details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
