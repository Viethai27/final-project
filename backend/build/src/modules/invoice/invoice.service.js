"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payInvoice = exports.getInvoiceById = exports.getInvoices = void 0;
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const invoiceSelect = {
    id: true,
    visitId: true,
    totalAmount: true,
    paidAmount: true,
    status: true,
    paymentMethod: true,
    createdAt: true,
    paidAt: true,
    visit: {
        select: {
            id: true,
            queueNumber: true,
            progress: {
                select: {
                    currentState: true,
                },
            },
            patient: {
                select: {
                    id: true,
                    patientCode: true,
                    fullName: true,
                    phone: true,
                },
            },
        },
    },
    items: {
        orderBy: [{ createdAt: 'asc' }],
        select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            service: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    serviceType: true,
                    price: true,
                },
            },
        },
    },
};
const mapMoney = (value) => value === null || value === undefined ? 0 : Number(value);
const mapInvoice = (invoice) => ({
    invoiceId: invoice.id,
    visitId: invoice.visitId,
    totalAmount: mapMoney(invoice.totalAmount),
    paidAmount: mapMoney(invoice.paidAmount),
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt,
    visit: {
        visitId: invoice.visit.id,
        queueNumber: invoice.visit.queueNumber,
        currentState: invoice.visit.progress?.currentState ?? null,
        patient: invoice.visit.patient,
    },
    items: (invoice.items ?? []).map((item) => ({
        invoiceItemId: item.id,
        description: item.description ?? item.service?.name ?? 'Dịch vụ',
        quantity: item.quantity,
        unitPrice: mapMoney(item.unitPrice),
        totalPrice: mapMoney(item.totalPrice),
        service: item.service
            ? {
                id: item.service.id,
                name: item.service.name,
                code: item.service.code,
                serviceType: item.service.serviceType,
                price: mapMoney(item.service.price),
            }
            : null,
    })),
});
const getInvoices = async (query) => {
    const invoices = await prisma_1.prisma.invoice.findMany({
        where: query.visitId ? { visitId: query.visitId } : undefined,
        orderBy: [{ createdAt: 'desc' }],
        select: invoiceSelect,
    });
    return invoices.map(mapInvoice);
};
exports.getInvoices = getInvoices;
const getInvoiceById = async (id) => {
    const invoice = await prisma_1.prisma.invoice.findUnique({
        where: { id },
        select: invoiceSelect,
    });
    if (!invoice) {
        throw new http_error_1.AppError('Invoice not found.', 404);
    }
    return mapInvoice(invoice);
};
exports.getInvoiceById = getInvoiceById;
const payInvoice = async (id, payload) => {
    const invoice = await prisma_1.prisma.invoice.findUnique({
        where: { id },
        select: {
            id: true,
            visitId: true,
            totalAmount: true,
            status: true,
            visit: {
                select: {
                    progress: {
                        select: {
                            currentState: true,
                        },
                    },
                },
            },
        },
    });
    if (!invoice) {
        throw new http_error_1.AppError('Invoice not found.', 404);
    }
    if (invoice.status === 'PAID') {
        throw new http_error_1.AppError('Invoice is already paid.', 409);
    }
    if (invoice.visit.progress?.currentState !== 'WAITING_PAYMENT') {
        throw new http_error_1.AppError('Visit must be WAITING_PAYMENT before payment.', 409);
    }
    const now = new Date();
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.invoice.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAmount: invoice.totalAmount,
                paymentMethod: payload.paymentMethod ?? 'CASH',
                paidAt: now,
            },
        });
        await tx.visitProgress.update({
            where: { visitId: invoice.visitId },
            data: {
                currentState: 'COMPLETED',
                updatedById: payload.paidById ?? null,
            },
        });
        await tx.visitStateHistory.create({
            data: {
                visitId: invoice.visitId,
                fromState: 'WAITING_PAYMENT',
                toState: 'COMPLETED',
                triggerEvent: 'PAYMENT_DONE',
                triggeredById: payload.paidById ?? null,
                transitionedAt: now,
                note: payload.note ?? `Paid by ${payload.paymentMethod ?? 'CASH'}`,
            },
        });
        await tx.visitClinical.upsert({
            where: { visitId: invoice.visitId },
            create: {
                visitId: invoice.visitId,
                completedAt: now,
            },
            update: {
                completedAt: now,
            },
        });
    });
    return (0, exports.getInvoiceById)(id);
};
exports.payInvoice = payInvoice;
