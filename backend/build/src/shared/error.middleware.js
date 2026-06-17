"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const client_1 = require("@prisma/client");
const http_error_1 = require("./http-error");
const errorMiddleware = (err, _req, res, _next) => {
    if (err instanceof http_error_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientInitializationError) {
        return res.status(503).json({
            success: false,
            message: 'Database connection unavailable. Make sure MySQL is running and DATABASE_URL is correct.',
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: 'Duplicate record.',
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: 'Record not found.',
            });
        }
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            success: false,
            message: 'Invalid Prisma query.',
        });
    }
    console.error(err);
    return res.status(500).json({
        success: false,
        message: 'Internal server error.',
    });
};
exports.errorMiddleware = errorMiddleware;
