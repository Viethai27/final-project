"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_routes_1 = require("./routes/api.routes");
const not_found_middleware_1 = require("./shared/not-found.middleware");
const error_middleware_1 = require("./shared/error.middleware");
exports.app = (0, express_1.default)();
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
}));
exports.app.use(express_1.default.json());
exports.app.use('/api', api_routes_1.apiRouter);
exports.app.use(not_found_middleware_1.notFoundMiddleware);
exports.app.use(error_middleware_1.errorMiddleware);
