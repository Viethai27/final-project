"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentRouter = void 0;
const express_1 = require("express");
const department_controller_1 = require("./department.controller");
exports.departmentRouter = (0, express_1.Router)();
exports.departmentRouter.get('/', department_controller_1.listDepartments);
