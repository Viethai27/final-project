"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceRouter = void 0;
const express_1 = require("express");
const invoice_controller_1 = require("./invoice.controller");
exports.invoiceRouter = (0, express_1.Router)();
exports.invoiceRouter.get('/', invoice_controller_1.listInvoicesHandler);
exports.invoiceRouter.get('/:id', invoice_controller_1.getInvoiceHandler);
exports.invoiceRouter.patch('/:id/pay', invoice_controller_1.payInvoiceHandler);
