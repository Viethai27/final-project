"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDispatchDecisionHandler = exports.getDispatchDecisionDetail = exports.listDispatchDecisions = exports.getDispatchSuggestionDetail = exports.listDispatchSuggestions = void 0;
const async_handler_1 = require("../../shared/async-handler");
const http_error_1 = require("../../shared/http-error");
const list_query_1 = require("../../shared/list-query");
const response_1 = require("../../shared/response");
const dispatch_service_1 = require("./dispatch.service");
const readId = (value, message) => {
    const id = typeof value === 'string' ? value : value?.[0];
    if (!id) {
        throw new http_error_1.AppError(message, 400);
    }
    return id;
};
const readDecisionType = (value) => {
    if (value === 'SYSTEM_SUGGESTED' || value === 'MANUAL' || value === 'OVERRIDE') {
        return value;
    }
    if (value === undefined || value === null || value === '') {
        return 'SYSTEM_SUGGESTED';
    }
    throw new http_error_1.AppError('Invalid decision type.', 400);
};
exports.listDispatchSuggestions = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, dispatch_service_1.getDispatchSuggestions)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getDispatchSuggestionDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const visitId = readId(req.params.visitId, 'Visit id is required.');
    const suggestion = await (0, dispatch_service_1.getDispatchSuggestionByVisitId)(visitId);
    (0, response_1.sendSuccess)(res, suggestion);
});
exports.listDispatchDecisions = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = (0, list_query_1.parseListQuery)(req.query, {
        defaultLimit: 10,
        defaultSort: 'desc',
    });
    const { items, total } = await (0, dispatch_service_1.getDispatchDecisions)(query);
    (0, response_1.sendPaginatedSuccess)(res, items, (0, list_query_1.buildPagination)(total, query.page, query.limit));
});
exports.getDispatchDecisionDetail = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const decisionId = readId(req.params.id, 'Dispatch decision id is required.');
    const decision = await (0, dispatch_service_1.getDispatchDecisionById)(decisionId);
    (0, response_1.sendSuccess)(res, decision);
});
exports.createDispatchDecisionHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const visitId = readId(body.visitId, 'visitId is required.');
    const recommendations = Array.isArray(body.recommendations)
        ? body.recommendations
            .map(item => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const record = item;
            const roomId = typeof record.roomId === 'string' ? record.roomId : null;
            const rank = typeof record.rank === 'number' ? record.rank : Number.parseInt(String(record.rank ?? ''), 10);
            if (!roomId || !Number.isFinite(rank)) {
                return null;
            }
            return {
                rank,
                roomId,
                resourceScore: typeof record.resourceScore === 'number' ? record.resourceScore : null,
                queueLength: typeof record.queueLength === 'number' ? record.queueLength : null,
                utilizationRate: typeof record.utilizationRate === 'number' ? record.utilizationRate : null,
                estimatedWaitMinutes: typeof record.estimatedWaitMinutes === 'number' ? record.estimatedWaitMinutes : null,
                alertLevel: typeof record.alertLevel === 'string' ? record.alertLevel : null,
                reason: typeof record.reason === 'string' ? record.reason : null,
                wasSelected: typeof record.wasSelected === 'boolean' ? record.wasSelected : null,
            };
        })
            .filter((item) => Boolean(item))
        : undefined;
    const decision = await (0, dispatch_service_1.createDispatchDecision)({
        visitId,
        queueItemId: typeof body.queueItemId === 'string' ? body.queueItemId : null,
        decisionById: typeof body.decisionById === 'string' ? body.decisionById : null,
        decisionType: readDecisionType(body.decisionType),
        outcomeRoomId: typeof body.outcomeRoomId === 'string' ? body.outcomeRoomId : null,
        outcomeDoctorId: typeof body.outcomeDoctorId === 'string' ? body.outcomeDoctorId : null,
        serviceId: typeof body.serviceId === 'string' ? body.serviceId : null,
        note: typeof body.note === 'string' ? body.note : null,
        recommendations,
        outcome: body.outcome && typeof body.outcome === 'object'
            ? {
                serviceId: typeof body.outcome.serviceId === 'string'
                    ? body.outcome.serviceId
                    : null,
                followedRecommendation: typeof body.outcome.followedRecommendation === 'boolean'
                    ? body.outcome.followedRecommendation
                    : null,
                actualWaitMinutes: typeof body.outcome.actualWaitMinutes === 'number'
                    ? body.outcome.actualWaitMinutes
                    : null,
                recommendedWaitEstimate: typeof body.outcome.recommendedWaitEstimate === 'number'
                    ? body.outcome.recommendedWaitEstimate
                    : null,
                waitDifference: typeof body.outcome.waitDifference === 'number'
                    ? body.outcome.waitDifference
                    : null,
                deviationNote: typeof body.outcome.deviationNote === 'string'
                    ? body.outcome.deviationNote
                    : null,
                deviationReason: typeof body.outcome.deviationReason === 'string'
                    ? body.outcome.deviationReason
                    : null,
            }
            : undefined,
    });
    (0, response_1.sendSuccess)(res, decision, 201);
});
