const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Invoice } = require('../models');

// Company Details
const COMPANY_INFO = {
  name: 'Motopsy Technologies Pvt. Ltd.',
  cin: 'U74999UP2022PTC171341',
  address: 'F-101, T-17, Lotus Boulevard, Sector-100, Noida-201301, UP',
  gstin: '09AAQCM2318G1ZB',
  email: 'Atul.b@motopsy.com',
  phone: '+91 9911515335',
  website: 'www.Motopsy.com',
  placeOfSupply: 'Uttar Pradesh (09)',
  bank: {
    name: 'IDFC First Bank',
    accountName: 'Motopsy Technologies Pvt. Ltd',
    accountNumber: '10106732317',
    ifsc: 'IDFB0020152'
  }
};

// SAC Code for Online Information Retrieval Services
const SAC_CODE = '998433';

// GST Rate (18% included in total amount)
const GST_RATE = 18;

// Blue color theme
const BLUE_COLOR = '#1976D2';

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
   */
  calculateGSTBreakdown(totalAmount) {
    const subtotal = totalAmount / (1 + GST_RATE / 100);
    const gstAmount = totalAmount - subtotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: totalAmount
    };
  }

  /**
   * Convert number to words (Indian format)
   */
  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const convertToIndian = (n) => {
      if (n === 0) return '';

      let result = '';

      // Crores (10,000,000)
      if (n >= 10000000) {
        result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
        n %= 10000000;
      }

      // Lakhs (100,000)
      if (n >= 100000) {
        result += convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh ';
        n %= 100000;
      }

      // Thousands
      if (n >= 1000) {
        result += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
        n %= 1000;
      }

      // Hundreds, Tens, Ones
      if (n > 0) {
        result += convertLessThanThousand(n);
      }

      return result.trim();
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = 'Rupees ' + convertToIndian(rupees);
    if (paise > 0) {
      result += ' and ' + convertToIndian(paise) + ' Paise';
    }
    result += ' Only.';

    return result;
  }

  /**
   * Generate invoice PDF with new design
   */
  async generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          bufferPages: true
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ============ PAGE 1 ============

        // Header line
        const headerY = 40;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BLUE_COLOR)
          .text('Motopsy Technologies Pvt. Ltd.', 50, headerY);
        doc.fontSize(10).font('Helvetica').fillColor(BLUE_COLOR)
          .text('Tax Invoice / Receipt', 400, headerY, { width: 145, align: 'right' });

        // Blue line under header
        doc.moveTo(50, headerY + 15).lineTo(545, headerY + 15).strokeColor(BLUE_COLOR).lineWidth(1).stroke();

        // Main Title
        doc.moveDown(2);
        doc.fontSize(28).font('Helvetica-Bold').fillColor(BLUE_COLOR)
          .text('TAX INVOICE / RECEIPT', 50, 80, { align: 'center' });

        // Company Name and CIN
        doc.fontSize(14).font('Helvetica-Bold').fillColor(BLUE_COLOR)
          .text(COMPANY_INFO.name, { align: 'center' });
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#333')
          .text(`(CIN: ${COMPANY_INFO.cin})`, { align: 'center' });

        doc.moveDown(1.5);

        // Company Details Section
        const detailsStartY = doc.y;
        const labelX = 50;
        const valueX = 160;

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
          .text('Registered Office:', labelX, detailsStartY);
        doc.font('Helvetica').text(COMPANY_INFO.address, valueX, detailsStartY);

        doc.font('Helvetica-Bold').text('GSTIN:', labelX, detailsStartY + 15);
        doc.font('Helvetica').text(COMPANY_INFO.gstin, valueX, detailsStartY + 15);

        doc.font('Helvetica-Bold').text('Email:', labelX, detailsStartY + 30);
        doc.font('Helvetica').text(COMPANY_INFO.email, valueX, detailsStartY + 30);

        doc.font('Helvetica-Bold').text('Phone:', labelX, detailsStartY + 45);
        doc.font('Helvetica').text(COMPANY_INFO.phone, valueX, detailsStartY + 45);

        doc.font('Helvetica-Bold').text('Website:', labelX, detailsStartY + 60);
        doc.font('Helvetica').text(COMPANY_INFO.website, valueX, detailsStartY + 60);

        doc.moveDown(4);

        // Invoice Details Row
        const invoiceRowY = detailsStartY + 90;

        // Left column
        doc.font('Helvetica-Bold').text('Invoice No:', labelX, invoiceRowY);
        doc.font('Helvetica').text(`#${invoiceData.invoiceNumber}`, valueX, invoiceRowY);

        doc.font('Helvetica-Bold').text('Place of Supply:', labelX, invoiceRowY + 15);
        doc.font('Helvetica').text(COMPANY_INFO.placeOfSupply, valueX, invoiceRowY + 15);

        // Right column
        const rightLabelX = 350;
        const rightValueX = 450;

        doc.font('Helvetica-Bold').text('Date of Issue:', rightLabelX, invoiceRowY);
        doc.font('Helvetica').text(invoiceData.invoiceDate, rightValueX, invoiceRowY);

        doc.font('Helvetica-Bold').text('Payment Status:', rightLabelX, invoiceRowY + 15);
        doc.font('Helvetica').text('Paid / Online', rightValueX, invoiceRowY + 15);

        // Bill To and Service Delivery Section
        const billToY = invoiceRowY + 45;

        // Blue background for section header
        doc.rect(50, billToY, 245, 18).fillColor('#E3F2FD').fill();
        doc.rect(300, billToY, 245, 18).fillColor('#E3F2FD').fill();

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
          .text('Bill To (Customer Details):', 55, billToY + 4);
        doc.text('Service Delivery:', 305, billToY + 4);

        // Bill To Details
        const billDetailsY = billToY + 25;
        doc.font('Helvetica-Bold').text('Name:', 55, billDetailsY);
        doc.font('Helvetica').text(invoiceData.customerName, 100, billDetailsY);

        doc.font('Helvetica-Bold').text('Email:', 55, billDetailsY + 15);
        doc.font('Helvetica').text(invoiceData.customerEmail, 100, billDetailsY + 15);

        doc.font('Helvetica-Bold').text('GSTIN (if B2B):', 55, billDetailsY + 30);
        doc.font('Helvetica').text(invoiceData.customerGstin || 'N/A', 140, billDetailsY + 30);

        // Service Delivery
        doc.font('Helvetica').text('Delivered Electronically via Online Portal', 305, billDetailsY);

        doc.moveDown(4);

        // Service Table
        const tableY = billDetailsY + 60;

        // Table Header with blue background
        doc.rect(50, tableY, 495, 20).fillColor('#E3F2FD').fill();

        const col1 = 55;   // Sr.
        const col2 = 80;   // Description
        const col3 = 280;  // SAC Code
        const col4 = 345;  // Qty
        const col5 = 385;  // Rate
        const col6 = 470;  // Taxable Value

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
        doc.text('Sr.', col1, tableY + 5);
        doc.text('Description of Service', col2, tableY + 5);
        doc.text('SAC Code', col3, tableY + 5);
        doc.text('Qty', col4, tableY + 5);
        doc.text('Rate (Rs.)', col5, tableY + 5);
        doc.text('Taxable Value (Rs.)', col6, tableY + 5);

        // Table Row
        const rowY = tableY + 25;
        doc.font('Helvetica');
        doc.text('1', col1, rowY);
        doc.text(invoiceData.description, col2, rowY);
        doc.text(SAC_CODE, col3, rowY);
        doc.text(String(invoiceData.quantity), col4, rowY);
        doc.text(this.formatCurrency(invoiceData.unitPrice), col5, rowY);
        doc.text(this.formatCurrency(invoiceData.subtotal), col6, rowY);

        // Line under row
        doc.moveTo(50, rowY + 18).lineTo(545, rowY + 18).strokeColor('#ccc').lineWidth(0.5).stroke();

        // Totals Section
        const totalsY = rowY + 30;
        const totalsLabelX = 350;
        const totalsValueX = 500;

        doc.font('Helvetica').text('Total Taxable Value (A)', totalsLabelX, totalsY);
        doc.text(this.formatCurrency(invoiceData.subtotal), totalsValueX, totalsY, { align: 'right', width: 45 });

        doc.text(`GST (@${GST_RATE}%)`, totalsLabelX, totalsY + 15);
        doc.text(this.formatCurrency(invoiceData.gstAmount), totalsValueX, totalsY + 15, { align: 'right', width: 45 });

        // Grand Total with background
        doc.rect(50, totalsY + 32, 495, 20).fillColor('#E3F2FD').fill();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
          .text('Grand Total', 55, totalsY + 37);
        doc.text(`Rs. ${this.formatCurrency(invoiceData.totalAmount)}`, totalsValueX, totalsY + 37, { align: 'right', width: 45 });

        // Amount in Words
        const amountWordsY = totalsY + 65;
        doc.fontSize(10).font('Helvetica-Bold').text('Amount in Words: ', 50, amountWordsY, { continued: true });
        doc.font('Helvetica').text(this.numberToWords(invoiceData.totalAmount));

        // Payment Details Box
        const paymentBoxY = amountWordsY + 30;
        doc.rect(50, paymentBoxY, 495, 35).strokeColor('#000').lineWidth(0.5).stroke();

        // Vertical line in middle
        doc.moveTo(297, paymentBoxY).lineTo(297, paymentBoxY + 35).stroke();

        doc.fontSize(9).font('Helvetica-Bold').text('Payment Mode: ', 55, paymentBoxY + 5, { continued: true });
        doc.font('Helvetica').text('Online / Gateway');
        doc.font('Helvetica-Bold').text('Account Name: ', 55, paymentBoxY + 18, { continued: true });
        doc.font('Helvetica').text(COMPANY_INFO.bank.accountName);

        doc.font('Helvetica-Bold').text('Bank: ', 305, paymentBoxY + 5, { continued: true });
        doc.font('Helvetica').text(COMPANY_INFO.bank.name);
        doc.font('Helvetica-Bold').text('IFSC: ', 305, paymentBoxY + 18, { continued: true });
        doc.font('Helvetica').text(COMPANY_INFO.bank.ifsc);

        // Terms and Conditions
        const termsY = paymentBoxY + 55;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
          .text('Terms and Conditions', 50, termsY);

        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        const terms = [
          { title: 'Nature of Service:', text: 'This invoice is for "Online Information Retrieval Services." The report is a digital product delivered instantly upon successful payment.' },
          { title: 'Delivery Timeline:', text: 'While we endeavor to provide reports on a real-time basis, occasional delays may occur due to downtime in government or private enterprise databases. In such cases where the report is not generated instantly, it will be assembled and shared via your registered email within a maximum of 24 hours.' },
          { title: 'Data Accuracy:', text: 'Reports are generated based on available data from government registries and third-party sources. Motopsy Technologies Pvt. Ltd. does not guarantee the absolute accuracy of external data.' },
          { title: 'Refund Policy:', text: 'Since the service is consumed immediately upon generation, payments for reports are non-refundable.' }
        ];

        let currentY = termsY + 25;
        terms.forEach((term, index) => {
          doc.font('Helvetica').text(`${index + 1}. `, 50, currentY, { continued: true });
          doc.font('Helvetica-Bold').text(term.title + ' ', { continued: true });
          doc.font('Helvetica').text(term.text, { width: 495 });
          currentY = doc.y + 5;
        });

        // Page number for page 1
        doc.fontSize(9).font('Helvetica').fillColor('#666')
          .text('Page 1', 50, 780, { align: 'right', width: 495 });

        // ============ PAGE 2 ============
        doc.addPage();

        // Header line (same as page 1)
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BLUE_COLOR)
          .text('Motopsy Technologies Pvt. Ltd.', 50, headerY);
        doc.fontSize(10).font('Helvetica').fillColor(BLUE_COLOR)
          .text('Tax Invoice / Receipt', 400, headerY, { width: 145, align: 'right' });
        doc.moveTo(50, headerY + 15).lineTo(545, headerY + 15).strokeColor(BLUE_COLOR).lineWidth(1).stroke();

        // Remaining Terms
        doc.moveDown(2);
        doc.fontSize(9).font('Helvetica').fillColor('#000');

        const remainingTerms = [
          { title: 'Compliance:', text: 'This invoice is generated in accordance with the Central Goods and Services Tax (CGST) Act, 2017.' },
          { title: 'Jurisdiction:', text: 'All disputes are subject to the exclusive jurisdiction of courts in Noida, Uttar Pradesh, India.' },
          { title: 'E & O.E:', text: 'Errors and Omissions Excepted.' }
        ];

        currentY = 70;
        remainingTerms.forEach((term, index) => {
          doc.font('Helvetica').text(`${index + 5}. `, 50, currentY, { continued: true });
          doc.font('Helvetica-Bold').text(term.title + ' ', { continued: true });
          doc.font('Helvetica').text(term.text, { width: 495 });
          currentY = doc.y + 5;
        });

        // Authorised Signatory Section
        const sigY = 250;
        doc.fontSize(10).font('Helvetica')
          .text(`For ${COMPANY_INFO.name}`, 300, sigY, { align: 'right', width: 245 });

        doc.moveDown(4);
        doc.font('Helvetica-Bold')
          .text('Authorised Signatory', 300, sigY + 60, { align: 'right', width: 245 });
        doc.font('Helvetica').fontSize(9)
          .text('(Digital Receipt - No Physical Signature Required)', 300, sigY + 75, { align: 'right', width: 245 });

        // Page number for page 2
        doc.fontSize(9).font('Helvetica').fillColor('#666')
          .text('Page 2', 50, 780, { align: 'right', width: 495 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Format number as currency (Indian format)
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
