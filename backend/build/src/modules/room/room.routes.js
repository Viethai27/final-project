"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomRouter = void 0;
const express_1 = require("express");
const room_controller_1 = require("./room.controller");
exports.roomRouter = (0, express_1.Router)();
exports.roomRouter.get('/', room_controller_1.listRooms);
