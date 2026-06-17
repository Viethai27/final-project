"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', auth_controller_1.loginHandler);
exports.authRouter.get('/me', auth_controller_1.meHandler);
exports.authRouter.post('/logout', auth_controller_1.logoutHandler);
