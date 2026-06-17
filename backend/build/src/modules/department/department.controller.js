"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDepartments = void 0;
const async_handler_1 = require("../../shared/async-handler");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const department_service_1 = require("./department.service");
exports.listDepartments = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, department_service_1.getDepartments)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
