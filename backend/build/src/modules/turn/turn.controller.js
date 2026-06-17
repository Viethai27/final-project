"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeTurnHandler = exports.startTurnHandler = exports.getVisitTurns = exports.getTurnDetail = exports.listTurns = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const turn_service_1 = require("./turn.service");
const readId = (value, message) => {
    const id = typeof value === 'string' ? value : value?.[0];
    if (!id) {
        throw new http_error_1.AppError(message, 400);
    }
    return id;
};
exports.listTurns = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, turn_service_1.getTurns)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getTurnDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const turnId = readId(req.params.id, 'Turn id is required.');
    const turn = await (0, turn_service_1.getTurnById)(turnId);
    (0, response_1.sendSuccess)(res, turn);
});
exports.getVisitTurns = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = readId(req.params.visitId, 'Visit id is required.');
    const turns = await (0, turn_service_1.getTurnsByVisitId)(visitId);
    (0, response_1.sendSuccess)(res, turns);
});
exports.startTurnHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const turnId = readId(req.params.id, 'Turn id is required.');
    const body = req.body;
    const turn = await (0, turn_service_1.startTurn)(turnId, {
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    (0, response_1.sendSuccess)(res, turn);
});
exports.completeTurnHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const turnId = readId(req.params.id, 'Turn id is required.');
    const body = req.body;
    const turn = await (0, turn_service_1.completeTurn)(turnId, {
        updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    (0, response_1.sendSuccess)(res, turn);
});
