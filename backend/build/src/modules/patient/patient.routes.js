"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientRouter = void 0;
const express_1 = require("express");
const patient_controller_1 = require("./patient.controller");
exports.patientRouter = (0, express_1.Router)();
exports.patientRouter.get('/', patient_controller_1.listPatients);
exports.patientRouter.post('/', patient_controller_1.createPatient);
