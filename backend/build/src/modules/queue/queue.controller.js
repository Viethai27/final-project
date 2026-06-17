"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueDetail = exports.listQueue = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const queue_service_1 = require("./queue.service");
exports.listQueue = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'asc',
    });
    const { items, total } = await (0, queue_service_1.getQueueItems)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getQueueDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const queueItemId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!queueItemId) {
        throw new http_error_1.AppError('Queue item id is required.', 400);
    }
    const queueItem = await (0, queue_service_1.getQueueItemById)(queueItemId);
    (0, response_1.sendSuccess)(res, queueItem);
});
