"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRouter = void 0;
const express_1 = require("express");
const queue_controller_1 = require("./queue.controller");
exports.queueRouter = (0, express_1.Router)();
exports.queueRouter.get('/', queue_controller_1.listQueue);
exports.queueRouter.get('/:id', queue_controller_1.getQueueDetail);
