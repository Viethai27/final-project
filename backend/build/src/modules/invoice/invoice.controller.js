"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payInvoiceHandler = exports.getInvoiceHandler = exports.listInvoicesHandler = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const response_1 = require("../../shared/response");
const invoice_service_1 = require("./invoice.service");
const readId = (value, message) => {
    const id = typeof value === 'string' ? value : value?.[0];
    if (!id) {
        throw new http_error_1.AppError(message, 400);
    }
    return id;
};
exports.listInvoicesHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = typeof req.query.visitId === 'string' ? req.query.visitId : null;
    const invoices = await (0, invoice_service_1.getInvoices)({ visitId });
    (0, response_1.sendSuccess)(res, invoices);
});
exports.getInvoiceHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const invoiceId = readId(req.params.id, 'Invoice id is required.');
    const invoice = await (0, invoice_service_1.getInvoiceById)(invoiceId);
    (0, response_1.sendSuccess)(res, invoice);
});
exports.payInvoiceHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const invoiceId = readId(req.params.id, 'Invoice id is required.');
    const body = req.body;
    const invoice = await (0, invoice_service_1.payInvoice)(invoiceId, {
        paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : 'CASH',
        paidById: typeof body.paidById === 'string' ? body.paidById : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    (0, response_1.sendSuccess)(res, invoice);
});
