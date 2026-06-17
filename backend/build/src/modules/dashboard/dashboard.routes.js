"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.get('/overview', dashboard_controller_1.getOverview);
