const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Invoice } = require('../models');

// Company Details (from the reference PDF)
const COMPANY_INFO = {
  name: 'Motopsy Technologies Pvt. Ltd.',
  address: 'F-101, T-17, Lotus Boulevard, Sector-100, Noida-201301',
  gstin: '09AAQCM2318G1ZB',
  cin: 'U74999UP2022PTC171341',
  email: 'Atul.b@motopsy.com',
  phone: '+91 9911515335',
  website: 'www.Motopsy.com',
  bank: {
    name: 'IDFC First Bank',
    accountName: 'Motopsy Technologies Pvt. Ltd',
    accountNumber: '10106732317',
    ifsc: 'IDFB0020152'
  }
};

// GST Rate (18% included in total amount)
const GST_RATE = 18;

class InvoiceService {
  /**
   * Generate unique invoice number in format: INV-YYYY-NNNN
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Find the latest invoice number for this year
    const latestInvoice = await Invoice.findOne({
      where: {
        invoice_number: {
          [require('sequelize').Op.like]: `${prefix}%`
        }
      },
      order: [['id', 'DESC']]
    });

    let nextNumber = 1;
    if (latestInvoice) {
      const lastNumber = parseInt(latestInvoice.invoice_number.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Calculate GST breakdown from total amount (GST is included)
   * @param {number} totalAmount - Total amount including GST
   * @returns {object} { subtotal, gstAmount, totalAmount }
   */
  calculateGSTBreakdown(totalAmount) {
    // GST is included in total, so we need to extract it
    // Total = Subtotal + GST
    // Total = Subtotal + (Subtotal * GST_RATE / 100)
    // Total = Subtotal * (1 + GST_RATE / 100)
    // Subtotal = Total / (1 + GST_RATE / 100)

    const subtotal = totalAmount / (1 + GST_RATE / 100);
    const gstAmount = totalAmount - subtotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: totalAmount
    };
  }

  /**
   * Generate invoice PDF and save to file
   * @param {object} invoiceData - Invoice details
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header - INVOICE title
        doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'left' });
        doc.moveDown(0.5);

        // Company Info
        doc.fontSize(12).font('Helvetica-Bold').text(COMPANY_INFO.name);
        doc.fontSize(10).font('Helvetica')
          .text(COMPANY_INFO.address)
          .text(`GSTIN: ${COMPANY_INFO.gstin}`)
          .text(`CIN: ${COMPANY_INFO.cin}`)
          .moveDown(0.3)
          .text(`Email: ${COMPANY_INFO.email}`)
          .text(`Phone: ${COMPANY_INFO.phone}`)
          .text(`Website: ${COMPANY_INFO.website}`);

        doc.moveDown(0.5);

        // Horizontal line
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        // Invoice Details
        doc.fontSize(11).font('Helvetica-Bold')
          .text(`Invoice Number: `, { continued: true })
          .font('Helvetica').text(`# ${invoiceData.invoiceNumber}`);

        doc.font('Helvetica-Bold')
          .text(`Invoice Date: `, { continued: true })
          .font('Helvetica').text(invoiceData.invoiceDate);

        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica')
          .text(invoiceData.customerName);

        if (invoiceData.customerGstin) {
          doc.text(invoiceData.customerGstin);
        }

        doc.text(invoiceData.customerEmail);

        if (invoiceData.customerPhone) {
          doc.text(invoiceData.customerPhone);
        }

        doc.moveDown(0.5);

        // Horizontal line
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        // Description of Services
        doc.fontSize(11).font('Helvetica-Bold').text('Description of Services:');
        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        const col1 = 50;   // Sr. No.
        const col2 = 90;   // Description
        const col3 = 320;  // Quantity
        const col4 = 380;  // Unit Price
        const col5 = 470;  // Total Amount

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Sr. No.', col1, tableTop);
        doc.text('Description', col2, tableTop);
        doc.text('Quantity', col3, tableTop);
        doc.text('Unit Price (INR)', col4, tableTop);
        doc.text('Total (INR)', col5, tableTop);

        // Table Row
        const rowY = tableTop + 20;
        doc.font('Helvetica');
        doc.text('1', col1, rowY);
        doc.text(invoiceData.description, col2, rowY);
        doc.text(String(invoiceData.quantity), col3, rowY);
        doc.text(this.formatCurrency(invoiceData.unitPrice), col4, rowY);
        doc.text(this.formatCurrency(invoiceData.subtotal), col5, rowY);

        doc.moveDown(2);

        // Horizontal line
        const lineY = rowY + 30;
        doc.moveTo(50, lineY).lineTo(545, lineY).stroke();

        // Totals section - using right-aligned layout
        const totalsY = lineY + 15;
        const labelX = 320;  // Left position for labels
        const valueX = 480;  // Left position for values
        doc.fontSize(10);

        doc.font('Helvetica-Bold').text('Subtotal:', labelX, totalsY, { width: 150, align: 'right' });
        doc.font('Helvetica').text(`INR ${this.formatCurrency(invoiceData.subtotal)}`, valueX, totalsY);

        doc.font('Helvetica-Bold').text(`GST (@ ${GST_RATE}%):`, labelX, totalsY + 18, { width: 150, align: 'right' });
        doc.font('Helvetica').text(`INR ${this.formatCurrency(invoiceData.gstAmount)}`, valueX, totalsY + 18);

        doc.font('Helvetica-Bold').text('Total Amount Payable:', labelX, totalsY + 36, { width: 150, align: 'right' });
        doc.font('Helvetica-Bold').text(`INR ${this.formatCurrency(invoiceData.totalAmount)}`, valueX, totalsY + 36);

        doc.moveDown(4);

        // Payment Details
        const paymentY = totalsY + 70;
        doc.fontSize(11).font('Helvetica-Bold').text('Payment Details:', 50, paymentY);
        doc.fontSize(10).font('Helvetica')
          .text(`Bank Name: ${COMPANY_INFO.bank.name}`, 50, paymentY + 18)
          .text(`Account Name: ${COMPANY_INFO.bank.accountName}`, 50, paymentY + 33)
          .text(`Account Number: ${COMPANY_INFO.bank.accountNumber}`, 50, paymentY + 48)
          .text(`IFSC Code: ${COMPANY_INFO.bank.ifsc}`, 50, paymentY + 63);

        // Horizontal line before signature
        doc.moveTo(50, paymentY + 90).lineTo(545, paymentY + 90).stroke();

        // Authorized Signatory section
        const signY = paymentY + 110;
        doc.fontSize(10).font('Helvetica-Bold').text('Authorized Signatory', 50, signY);

        // Footer with company stamp info
        const footerY = signY + 60;
        doc.fontSize(12).font('Helvetica-Bold').text('MOTOPSY Technologies Pvt. Ltd.', 50, footerY, { align: 'center' });
        doc.fontSize(9).font('Helvetica')
          .text('F-101, T-17', { align: 'center' })
          .text('Lotus Boulevard, Sector-100', { align: 'center' })
          .text('Noida-201301, UP', { align: 'center' })
          .text(`Ph- ${COMPANY_INFO.phone}, ${COMPANY_INFO.website}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Format number as currency
   */
  formatCurrency(amount) {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format date as DD/MM/YYYY
   */
  formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Generate and save invoice
   * @param {object} params - Invoice parameters
   * @returns {Promise<object>} Invoice record and PDF buffer
   */
  async createInvoice({
    paymentHistoryId,
    userId,
    customerName,
    customerEmail,
    customerGstin = null,
    customerPhone = null,
    registrationNumber,
    description = 'Vehicle History Report',
    quantity = 1,
    totalAmount
  }) {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate GST breakdown (GST is included in total)
      const { subtotal, gstAmount } = this.calculateGSTBreakdown(totalAmount);
      const unitPrice = subtotal / quantity;

      // Prepare invoice data for PDF
      const invoiceData = {
        invoiceNumber,
        invoiceDate: this.formatDate(new Date()),
        customerName,
        customerEmail,
        customerGstin,
        customerPhone,
        description,
        quantity,
        unitPrice,
        subtotal,
        gstAmount,
        totalAmount
      };

      // Generate PDF
      const pdfBuffer = await this.generateInvoicePDF(invoiceData);

      // Create file name and path
      const fileName = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${registrationNumber}.pdf`;
      const uploadsDir = path.join(__dirname, '../../uploads/invoices');
      const filePath = path.join(uploadsDir, fileName);
      const relativeFilePath = `uploads/invoices/${fileName}`;

      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save PDF to file
      fs.writeFileSync(filePath, pdfBuffer);

      // Save to database
      const invoice = await Invoice.create({
        invoice_number: invoiceNumber,
        payment_history_id: paymentHistoryId,
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_gstin: customerGstin,
        customer_phone: customerPhone,
        registration_number: registrationNumber,
        description,
        quantity,
        unit_price: unitPrice,
        subtotal,
        gst_rate: GST_RATE,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        file_path: relativeFilePath,
        file_name: fileName
      });

      console.log(`Invoice generated: ${invoiceNumber} for ${registrationNumber}`);

      return {
        invoice,
        pdfBuffer,
        fileName,
        filePath: relativeFilePath
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id) {
    return await Invoice.findByPk(id, {
      include: [
        { association: 'User', attributes: ['id', 'email', 'user_name', 'first_name', 'last_name'] },
        { association: 'PaymentHistory', attributes: ['id', 'amount', 'status', 'transaction_id'] }
      ]
    });
  }

  /**
   * Get invoice by payment history ID
   */
  async getInvoiceByPaymentHistoryId(paymentHistoryId) {
    return await Invoice.findOne({
      where: { payment_history_id: paymentHistoryId },
      include: [
        { association: 'User', attributes: ['id', 'email', 'user_name', 'first_name', 'last_name'] },
        { association: 'PaymentHistory', attributes: ['id', 'amount', 'status', 'transaction_id'] }
      ]
    });
  }

  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices({ page = 1, limit = 10, search = '', userId = null }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
        { registration_number: { [Op.like]: `%${search}%` } }
      ];
    }

    if (userId) {
      where.user_id = userId;
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { association: 'User', attributes: ['id', 'email', 'user_name', 'first_name', 'last_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      invoices: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Get invoice PDF buffer by ID
   */
  async getInvoicePDFBuffer(id) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const filePath = path.join(__dirname, '../../', invoice.file_path);
    if (!fs.existsSync(filePath)) {
      throw new Error('Invoice file not found');
    }

    return {
      buffer: fs.readFileSync(filePath),
      fileName: invoice.file_name
    };
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats() {
    const { Op } = require('sequelize');
    const { sequelize } = require('../models');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [totalCount, monthCount, yearCount, totalRevenue] = await Promise.all([
      Invoice.count(),
      Invoice.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
      Invoice.count({ where: { created_at: { [Op.gte]: startOfYear } } }),
      Invoice.sum('total_amount')
    ]);

    return {
      totalInvoices: totalCount || 0,
      monthlyInvoices: monthCount || 0,
      yearlyInvoices: yearCount || 0,
      totalRevenue: totalRevenue || 0
    };
  }
}

module.exports = new InvoiceService();
