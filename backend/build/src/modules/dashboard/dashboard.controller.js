"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = void 0;
const async_handler_1 = require("../../shared/async-handler");
const response_1 = require("../../shared/response");
const dashboard_service_1 = require("./dashboard.service");
exports.getOverview = (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const overview = await (0, dashboard_service_1.getDashboardOverview)();
    (0, response_1.sendSuccess)(res, overview);
});
