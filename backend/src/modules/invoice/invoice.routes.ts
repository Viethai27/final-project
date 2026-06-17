import { Router } from 'express';
import { getInvoiceHandler, listInvoicesHandler, payInvoiceHandler } from './invoice.controller';

export const invoiceRouter = Router();

invoiceRouter.get('/', listInvoicesHandler);
invoiceRouter.get('/:id', getInvoiceHandler);
invoiceRouter.patch('/:id/pay', payInvoiceHandler);
