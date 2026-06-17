"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClsResultDetail = exports.listClsResults = exports.completeClsOrderHandler = exports.startClsOrderHandler = exports.getVisitClsOrders = exports.getClsOrderDetail = exports.createClsOrderHandler = exports.listClsOrders = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const cls_service_1 = require("./cls.service");
const readId = (value, message) => {
    const id = typeof value === 'string' ? value : value?.[0];
    if (!id) {
        throw new http_error_1.AppError(message, 400);
    }
    return id;
};
exports.listClsOrders = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, cls_service_1.getClsOrders)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.createClsOrderHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const order = await (0, cls_service_1.createClsOrder)({
        visitId: typeof body.visitId === 'string' ? body.visitId : '',
        orderedById: typeof body.orderedById === 'string' ? body.orderedById : '',
        serviceId: typeof body.serviceId === 'string' ? body.serviceId : '',
        roomId: typeof body.roomId === 'string' ? body.roomId : null,
        priority: body.priority === 'URGENT' ? 'URGENT' : 'ROUTINE',
        clinicalNote: typeof body.clinicalNote === 'string' ? body.clinicalNote : null,
        note: typeof body.note === 'string' ? body.note : null,
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    });
    (0, response_1.sendSuccess)(res, order, 201);
});
exports.getClsOrderDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const orderId = readId(req.params.id, 'CLS order id is required.');
    const order = await (0, cls_service_1.getClsOrderById)(orderId);
    (0, response_1.sendSuccess)(res, order);
});
exports.getVisitClsOrders = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = readId(req.params.visitId, 'Visit id is required.');
    const orders = await (0, cls_service_1.getClsOrdersByVisitId)(visitId);
    (0, response_1.sendSuccess)(res, orders);
});
exports.startClsOrderHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const orderId = readId(req.params.id, 'CLS order id is required.');
    const body = req.body;
    const order = await (0, cls_service_1.startClsOrder)(orderId, {
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    (0, response_1.sendSuccess)(res, order);
});
exports.completeClsOrderHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const orderId = readId(req.params.id, 'CLS order id is required.');
    const body = req.body;
    const order = await (0, cls_service_1.completeClsOrder)(orderId, {
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
        note: typeof body.note === 'string' ? body.note : null,
        resultText: typeof body.resultText === 'string' ? body.resultText : null,
        resultFileUrl: typeof body.resultFileUrl === 'string' ? body.resultFileUrl : null,
        isAbnormal: typeof body.isAbnormal === 'boolean' ? body.isAbnormal : null,
        resultById: typeof body.resultById === 'string' ? body.resultById : null,
        resultDate: typeof body.resultDate === 'string' ? body.resultDate : null,
    });
    (0, response_1.sendSuccess)(res, order);
});
exports.listClsResults = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, cls_service_1.getClsResults)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getClsResultDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const resultId = readId(req.params.id, 'CLS result id is required.');
    const result = await (0, cls_service_1.getClsResultById)(resultId);
    (0, response_1.sendSuccess)(res, result);
});
