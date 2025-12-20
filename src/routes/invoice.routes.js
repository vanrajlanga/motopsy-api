const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// All routes under /api/invoice (admin only)

// POST /api/invoice/list - Get invoice list with pagination and filtering
router.post('/list', authenticate, requireAdmin, invoiceController.getInvoiceList.bind(invoiceController));

// GET /api/invoice/stats - Get invoice statistics
router.get('/stats', authenticate, requireAdmin, invoiceController.getInvoiceStats.bind(invoiceController));

// GET /api/invoice/:id - Get invoice by ID
router.get('/:id', authenticate, requireAdmin, invoiceController.getInvoiceById.bind(invoiceController));

// GET /api/invoice/:id/download - Download invoice PDF
router.get('/:id/download', authenticate, requireAdmin, invoiceController.downloadInvoice.bind(invoiceController));

// GET /api/invoice/payment/:paymentHistoryId - Get invoice by payment history ID
router.get('/payment/:paymentHistoryId', authenticate, requireAdmin, invoiceController.getInvoiceByPaymentHistoryId.bind(invoiceController));

module.exports = router;
