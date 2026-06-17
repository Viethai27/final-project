import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { sendSuccess } from '../../shared/response';
import { getInvoiceById, getInvoices, payInvoice } from './invoice.service';

const readId = (value: string | string[] | undefined, message: string) => {
  const id = typeof value === 'string' ? value : value?.[0];
  if (!id) {
    throw new AppError(message, 400);
  }
  return id;
};

export const listInvoicesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = typeof req.query.visitId === 'string' ? req.query.visitId : null;
  const invoices = await getInvoices({ visitId });
  sendSuccess(res, invoices);
});

export const getInvoiceHandler: RequestHandler = asyncHandler(async (req, res) => {
  const invoiceId = readId(req.params.id, 'Invoice id is required.');
  const invoice = await getInvoiceById(invoiceId);
  sendSuccess(res, invoice);
});

export const payInvoiceHandler: RequestHandler = asyncHandler(async (req, res) => {
  const invoiceId = readId(req.params.id, 'Invoice id is required.');
  const body = req.body as Record<string, unknown>;
  const invoice = await payInvoice(invoiceId, {
    paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : 'CASH',
    paidById: typeof body.paidById === 'string' ? body.paidById : null,
    note: typeof body.note === 'string' ? body.note : null,
  });
  sendSuccess(res, invoice);
});
