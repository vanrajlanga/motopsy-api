const BaseController = require('./base.controller');
const invoiceService = require('../services/invoice.service');
const Result = require('../utils/result');

class InvoiceController extends BaseController {
  /**
   * POST /api/invoice/list - Get invoice list with pagination and filtering (admin)
   */
  async getInvoiceList(req, res, next) {
    try {
      const { page = 1, limit = 10, search = '', userId = null } = req.body;
      const result = await invoiceService.getInvoices({ page, limit, search, userId });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/invoice/:id - Get invoice by ID (admin)
   */
  async getInvoiceById(req, res, next) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(parseInt(id));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      return res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/invoice/stats - Get invoice statistics (admin)
   */
  async getInvoiceStats(req, res, next) {
    try {
      const stats = await invoiceService.getInvoiceStats();
      return res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/invoice/:id/download - Download invoice PDF (admin)
   */
  async downloadInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const { buffer, fileName } = await invoiceService.getInvoicePDFBuffer(parseInt(id));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);
    } catch (error) {
      if (error.message === 'Invoice not found' || error.message === 'Invoice file not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  /**
   * GET /api/invoice/payment/:paymentHistoryId - Get invoice by payment history ID
   */
  async getInvoiceByPaymentHistoryId(req, res, next) {
    try {
      const { paymentHistoryId } = req.params;
      const invoice = await invoiceService.getInvoiceByPaymentHistoryId(parseInt(paymentHistoryId));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found for this payment' });
      }
      return res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvoiceController();
