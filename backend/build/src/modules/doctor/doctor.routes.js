"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorRouter = void 0;
const express_1 = require("express");
const doctor_controller_1 = require("./doctor.controller");
exports.doctorRouter = (0, express_1.Router)();
exports.doctorRouter.get('/', doctor_controller_1.listDoctors);
