"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaginatedSuccess = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
    });
};
exports.sendSuccess = sendSuccess;
const sendPaginatedSuccess = (res, data, pagination, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        pagination,
    });
};
exports.sendPaginatedSuccess = sendPaginatedSuccess;
