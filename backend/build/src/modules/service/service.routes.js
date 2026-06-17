"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRouter = void 0;
const express_1 = require("express");
const service_controller_1 = require("./service.controller");
exports.serviceRouter = (0, express_1.Router)();
exports.serviceRouter.get('/', service_controller_1.listServices);
