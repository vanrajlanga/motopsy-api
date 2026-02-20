const nodemailer = require("nodemailer");
const logger = require("../config/logger");
const { generateEmailLoginToken } = require("../utils/jwt.helper");

class EmailService {
    constructor() {
        // Validate SMTP credentials
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            logger.error(
                "SMTP credentials not configured. Email functionality will be disabled.",
                {
                    SMTP_HOST: process.env.SMTP_HOST || "not set",
                    SMTP_PORT: process.env.SMTP_PORT || "not set",
                    SMTP_USER: process.env.SMTP_USER ? "set" : "NOT SET",
                    SMTP_PASSWORD: process.env.SMTP_PASSWORD
                        ? "set"
                        : "NOT SET",
                }
            );
            this.transporter = null;
            this.isConfigured = false;
            return;
        }

        try {
            const smtpPort = parseInt(process.env.SMTP_PORT || "587");
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: smtpPort,
                secure: smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });

            // Store the "from" email address (defaults to SMTP_USER if not set)
            this.fromEmail =
                process.env.SMTP_USER_FROM || process.env.SMTP_USER;
            this.isConfigured = true;

            logger.info("Email service configured successfully", {
                host: process.env.SMTP_HOST,
                port: smtpPort,
                authUser: process.env.SMTP_USER,
                fromEmail: this.fromEmail,
            });
        } catch (error) {
            logger.error("Failed to initialize email service:", error);
            this.transporter = null;
            this.isConfigured = false;
        }
    }

    async sendEmailConfirmationAsync(email, userId, code) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping email confirmation send.",
                { email }
            );
            return false;
        }

        try {
            const confirmationUrl = `${
                process.env.FRONTEND_URL
            }/#/account/confirm-email?userId=${userId}&code=${encodeURIComponent(
                code
            )}`;

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: "Confirm Your Email - Motopsy",
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Motopsy!</h1>
              </div>
              <div class="content">
                <h2>Confirm Your Email Address</h2>
                <p>Thank you for registering with Motopsy. To complete your registration, please confirm your email address by clicking the button below:</p>
                <a href="${confirmationUrl}" class="button">Confirm Email</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">${confirmationUrl}</p>
                <p>This link will expire in 6 hours.</p>
                <p>If you didn't create an account with Motopsy, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Email confirmation sent to: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send email confirmation error:", error);
            return false;
        }
    }

    async sendPasswordResetAsync(email, userId, code) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping password reset email send.",
                { email }
            );
            return false;
        }

        try {
            const resetUrl = `${process.env.FRONTEND_URL}/#/account/reset-password?userId=${userId}&code=${encodeURIComponent(code)}`;

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: "Reset Your Password - Motopsy",
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password for your Motopsy account. Click the button below to reset it:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">${resetUrl}</p>
                <p>This link will expire in 6 hours.</p>
                <p><strong>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Password reset email sent to: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send password reset email error:", error);
            return false;
        }
    }

    async sendContactUsEmailAsync(name, email, phoneNumber, registrationNumber, message) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping contact form email send.",
                { email }
            );
            return false;
        }

        try {
            const mailOptions = {
                from: `"Motopsy Contact Form" <${this.fromEmail}>`,
                to: process.env.CONTACT_EMAIL || this.fromEmail,
                subject: `New Contact Form Submission from ${name}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              table { width: 100%; cellpadding: 6; cellspacing: 0; }
              table tr { padding: 6px 0; }
              table td { padding: 6px; }
              table td:first-child { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Contact Form Submission</h1>
              </div>
              <div class="content">
                <p>Hi Admin,</p>
                <p>A new contact request has been submitted by the user with the following details:</p>
                <table>
                  <tr>
                    <td><strong>Name:</strong></td>
                    <td>${name}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>${email}</td>
                  </tr>
                  <tr>
                    <td><strong>Phone:</strong></td>
                    <td>${phoneNumber || 'Not provided'}</td>
                  </tr>
                  ${registrationNumber ? `
                  <tr>
                    <td><strong>Registration Number:</strong></td>
                    <td>${registrationNumber}</td>
                  </tr>` : ''}
                  ${message ? `
                  <tr>
                    <td><strong>Message:</strong></td>
                    <td>${message}</td>
                  </tr>` : ''}
                </table>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Contact form email sent from: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send contact form email error:", error);
            return false;
        }
    }

    async sendPasswordResetSuccessAsync(email, userName) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping password reset success email.",
                { email }
            );
            return false;
        }

        try {
            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: "Password Reset Successful - Motopsy",
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Successful</h1>
              </div>
              <div class="content">
                <p>Dear ${userName},</p>
                <p>We are pleased to inform you that your password has been successfully reset. You can now log in to your account using your new password.</p>
                <p>Best regards,</p>
                <p>Motopsy</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Password reset success email sent to: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send password reset success email error:", error);
            return false;
        }
    }

    async sendVehicleReportEmailAsync(email, registrationNumber, reportUrl) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping vehicle report email send.",
                { email, registrationNumber }
            );
            return false;
        }

        try {
            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: `Your Vehicle Report is Ready - ${registrationNumber}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .vehicle-number { font-size: 24px; font-weight: bold; color: #007bff; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Your Vehicle Report is Ready!</h1>
              </div>
              <div class="content">
                <p>Your vehicle history report for <span class="vehicle-number">${registrationNumber}</span> has been generated successfully.</p>
                <p>Click the button below to view your report:</p>
                <a href="${reportUrl}" class="button">View Report</a>
                <p>Your report will remain available for 90 days from the date of purchase.</p>
                <p>Thank you for choosing Motopsy!</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(
                `Vehicle report email sent to: ${email} for ${registrationNumber}`
            );
            return true;
        } catch (error) {
            logger.error("Send vehicle report email error:", error);
            return false;
        }
    }

    /**
     * Send payment success notification to admin (no button)
     */
    async sendPaymentNotificationToAdminAsync(userEmail, userName, registrationNumber, amount, paymentMethod, vehicleDetailRequestId, userId) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping payment notification email.",
                { userEmail, registrationNumber }
            );
            return false;
        }

        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.CONTACT_EMAIL || this.fromEmail;

            const paymentMethodNames = {
                0: 'Card',
                1: 'Net Banking',
                2: 'Wallet',
                3: 'Pay Later',
                4: 'UPI'
            };
            const paymentMethodName = paymentMethodNames[paymentMethod] || 'Unknown';

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: adminEmail,
                subject: `New Payment Received - ${registrationNumber}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              table td { padding: 10px; border-bottom: 1px solid #ddd; }
              table td:first-child { font-weight: bold; width: 40%; color: #666; }
              .amount { font-size: 24px; font-weight: bold; color: #28a745; }
              .reg-number { font-size: 20px; font-weight: bold; color: #007bff; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Payment Received!</h1>
              </div>
              <div class="content">
                <p>Hi Admin,</p>
                <p>A new payment has been successfully processed. Here are the details:</p>

                <table>
                  <tr>
                    <td>Customer Email:</td>
                    <td>${userEmail}</td>
                  </tr>
                  <tr>
                    <td>Customer Name:</td>
                    <td>${userName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Registration Number:</td>
                    <td class="reg-number">${registrationNumber}</td>
                  </tr>
                  <tr>
                    <td>Amount Paid:</td>
                    <td class="amount">₹${amount}</td>
                  </tr>
                  <tr>
                    <td>Payment Method:</td>
                    <td>${paymentMethodName}</td>
                  </tr>
                  <tr>
                    <td>Request ID:</td>
                    <td>#${vehicleDetailRequestId}</td>
                  </tr>
                  <tr>
                    <td>User ID:</td>
                    <td>#${userId}</td>
                  </tr>
                  <tr>
                    <td>Date & Time:</td>
                    <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  </tr>
                </table>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Payment notification email sent to admin for: ${registrationNumber}`);
            return true;
        } catch (error) {
            logger.error("Send payment notification email error:", error);
            return false;
        }
    }

    /**
     * Send payment success email to user with View Report button (auto-login)
     * @param {string} userEmail - User's email address
     * @param {string} userName - User's name
     * @param {string} registrationNumber - Vehicle registration number
     * @param {number} amount - Payment amount
     * @param {number} vehicleDetailRequestId - Vehicle detail request ID
     * @param {number} userId - User ID
     * @param {object} invoiceAttachment - Optional invoice attachment { buffer: Buffer, fileName: string }
     */
    async sendPaymentSuccessToUserAsync(userEmail, userName, registrationNumber, amount, vehicleDetailRequestId, userId, invoiceAttachment = null) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping payment success email to user.",
                { userEmail, registrationNumber }
            );
            return false;
        }

        try {
            const frontendUrl = process.env.FRONTEND_URL || 'https://motopsy.com';

            // Generate auto-login token for magic link
            const loginToken = generateEmailLoginToken(userId, '/my-profile');

            // Link to auto-login page with token - frontend will handle the auto-login
            const reportLink = `${frontendUrl}/#/auto-login?token=${encodeURIComponent(loginToken)}`;

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: userEmail,
                subject: `Payment Successful - Vehicle Report for ${registrationNumber}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 14px 28px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; }
              .button:hover { background-color: #0056b3; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              table td { padding: 10px; border-bottom: 1px solid #ddd; }
              table td:first-child { font-weight: bold; width: 40%; color: #666; }
              .amount { font-size: 20px; font-weight: bold; color: #28a745; }
              .reg-number { font-size: 18px; font-weight: bold; color: #007bff; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✓</div>
                <h1>Payment Successful!</h1>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <p>Thank you for your payment! Your vehicle history report request has been received and is being processed.</p>
                ${invoiceAttachment ? '<p><strong>Your invoice is attached to this email.</strong></p>' : ''}

                <table>
                  <tr>
                    <td>Registration Number:</td>
                    <td class="reg-number">${registrationNumber}</td>
                  </tr>
                  <tr>
                    <td>Amount Paid:</td>
                    <td class="amount">₹${amount}</td>
                  </tr>
                  <tr>
                    <td>Request ID:</td>
                    <td>#${vehicleDetailRequestId}</td>
                  </tr>
                  <tr>
                    <td>Date & Time:</td>
                    <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  </tr>
                </table>

                <p>Your report will be generated shortly. Click the button below to view your report once it's ready:</p>

                <div style="text-align: center;">
                  <a href="${reportLink}" class="button">View Report</a>
                </div>

                <p style="font-size: 12px; color: #666; margin-top: 20px;">Or copy this link: ${reportLink}</p>

                <p style="margin-top: 20px;">If you have any questions, please don't hesitate to contact our support team.</p>

                <p>Thank you for choosing Motopsy!</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            // Add invoice attachment if provided
            if (invoiceAttachment && invoiceAttachment.buffer && invoiceAttachment.fileName) {
                mailOptions.attachments = [{
                    filename: invoiceAttachment.fileName,
                    content: invoiceAttachment.buffer,
                    contentType: 'application/pdf'
                }];
            }

            await this.transporter.sendMail(mailOptions);
            logger.info(`Payment success email sent to user: ${userEmail} for ${registrationNumber}${invoiceAttachment ? ' with invoice attached' : ''}`);
            return true;
        } catch (error) {
            logger.error("Send payment success email to user error:", error);
            return false;
        }
    }

    /**
     * Send email with file attachment
     * Matches .NET: SendEmail with attachment
     */
    async sendEmailWithAttachmentAsync(email, subject, htmlContent, fileBytes, filename) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping email with attachment send.",
                { email, subject }
            );
            return false;
        }

        try {
            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: subject,
                html: htmlContent,
                attachments: [
                    {
                        filename: filename,
                        content: Buffer.from(fileBytes)
                    }
                ]
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Email with attachment sent to: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send email with attachment error:", error);
            return false;
        }
    }

    /**
     * Send service order confirmation email to user
     */
    async sendServiceOrderConfirmationToUserAsync(orderDetails) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping service order confirmation email.",
                { email: orderDetails.email }
            );
            return false;
        }

        try {
            const {
                email,
                name,
                serviceName,
                tierName,
                servicePackageName,
                amount,
                orderId,
                mobileNumber,
                address,
                city,
                state,
                postcode,
                appointmentDate,
                appointmentTimeSlot
            } = orderDetails;

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: email,
                subject: `Payment Successful - ${serviceName}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, hsl(217, 71%, 25%) 0%, hsl(195, 100%, 35%) 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px 20px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              table td { padding: 12px; border-bottom: 1px solid #e8e8e8; }
              table td:first-child { font-weight: bold; width: 40%; color: #666; }
              .success-icon { font-size: 60px; margin-bottom: 10px; }
              .amount { font-size: 28px; font-weight: bold; color: hsl(195, 100%, 42%); }
              .order-id { background: #e7f1ff; padding: 12px 20px; border-radius: 6px; display: inline-block; font-weight: bold; color: hsl(195, 100%, 42%); margin: 15px 0; font-size: 18px; }
              .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid hsl(195, 100%, 42%); }
              .info-box h3 { margin-top: 0; color: hsl(195, 100%, 42%); }
              .payment-success-badge { background: hsl(195, 100%, 42%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
              .service-highlight { background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid hsl(195, 100%, 42%); }
              .service-highlight h3 { margin: 0 0 5px 0; color: hsl(195, 100%, 42%); font-size: 18px; }
              .service-highlight p { margin: 5px 0; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✓</div>
                <h1>Payment Successful!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Your order has been confirmed</p>
              </div>
              <div class="content">
                <p>Dear ${name},</p>

                <div class="payment-success-badge">✓ Payment Completed</div>

                <p>Thank you for your payment! Your order for <strong>${serviceName}</strong> has been successfully confirmed.</p>

                <div class="service-highlight">
                  <h3>📋 Service Purchased</h3>
                  <p><strong>${serviceName}</strong></p>
                  ${servicePackageName ? `<p style="font-size: 16px; color: hsl(195, 100%, 42%); font-weight: 700; margin-top: 5px;">Package: ${servicePackageName}</p>` : ''}
                  <p style="font-size: 14px; color: #666; font-weight: 600;">${tierName}</p>
                </div>

                <div class="order-id">Order ID: #${orderId}</div>

                <h3 style="color: hsl(195, 100%, 42%); margin-top: 25px;">💳 Payment Summary</h3>
                <table>
                  <tr>
                    <td>Service Type:</td>
                    <td><strong>${serviceName}</strong></td>
                  </tr>
                  <tr>
                    <td>Selected Tier:</td>
                    <td><strong>${tierName}</strong></td>
                  </tr>
                  <tr style="background: #f0f4ff;">
                    <td style="color: hsl(195, 100%, 42%); font-size: 16px;">Amount Paid:</td>
                    <td class="amount">₹${amount}</td>
                  </tr>
                  <tr>
                    <td>Payment Status:</td>
                    <td><strong style="color: hsl(195, 100%, 42%);">✓ Successful</strong></td>
                  </tr>
                  <tr>
                    <td>Payment Date:</td>
                    <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  </tr>
                </table>

                <h3 style="color: hsl(195, 100%, 42%); margin-top: 25px;">📍 Service Details</h3>
                <table>
                  <tr>
                    <td>Contact Number:</td>
                    <td>${mobileNumber}</td>
                  </tr>
                  ${address ? `
                  <tr>
                    <td>Service Location:</td>
                    <td>${address}, ${city || ''} ${state}, ${postcode}</td>
                  </tr>` : ''}
                </table>

                ${appointmentDate ? `
                <div style="background: linear-gradient(135deg, #e8f5ff 0%, #f0f9ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1c3b54; font-size: 16px; font-weight: 600;">
                    📅 Scheduled Appointment
                  </h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 14px;">
                        <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-IN', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </td>
                    </tr>
                    ${appointmentTimeSlot ? `
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 14px;">
                        <strong>Time:</strong> ${appointmentTimeSlot}
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}

                <div class="info-box">
                  <h3>🎯 What Happens Next?</h3>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Our team will review your order and service details</li>
                    <li style="margin-bottom: 8px;">${appointmentDate
                      ? `Our technician will visit your location on <strong>${new Date(appointmentDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}</strong> during the <strong>${appointmentTimeSlot}</strong> time slot`
                      : `We'll contact you within <strong>24 hours</strong> on <strong>${mobileNumber}</strong> to schedule the inspection`}</li>
                    <li style="margin-bottom: 8px;">The PDI inspection will be conducted at your provided address</li>
                    <li style="margin-bottom: 8px;">You'll receive a detailed <strong>${serviceName}</strong> via email after completion</li>
                  </ul>
                </div>

                <p style="margin-top: 25px;">If you have any questions or need to make changes to your order, please contact our support team.</p>
                <p><strong>Thank you for choosing Motopsy!</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
                <p>For support, contact us at ${process.env.CONTACT_EMAIL || 'support@motopsy.com'}</p>
                <p style="margin-top: 10px; font-size: 11px; color: #999;">This is an automated payment confirmation email for your service order.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Service order confirmation email sent to: ${email}`);
            return true;
        } catch (error) {
            logger.error("Send service order confirmation email error:", error);
            return false;
        }
    }

    /**
     * Send service order notification to admin with complete form details
     */
    async sendServiceOrderNotificationToAdminAsync(orderDetails) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn(
                "Email service not configured. Skipping service order admin notification.",
                { orderId: orderDetails.orderId }
            );
            return false;
        }

        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.CONTACT_EMAIL || this.fromEmail;

            const {
                email,
                name,
                mobileNumber,
                serviceName,
                tierName,
                servicePackageName,
                amount,
                orderId,
                carCompany,
                carModel,
                carModelYear,
                chassisNumber,
                registrationNumber,
                address,
                city,
                state,
                postcode,
                orderNotes,
                userId,
                appointmentDate,
                appointmentTimeSlot
            } = orderDetails;

            const mailOptions = {
                from: `"Motopsy Service Orders" <${this.fromEmail}>`,
                to: adminEmail,
                subject: `New Service Order #${orderId} - ${serviceName}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 700px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 25px 20px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none; }
              .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
              .section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid hsl(195, 100%, 42%); }
              .section-title { font-size: 16px; font-weight: bold; color: hsl(195, 100%, 42%); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
              table { width: 100%; border-collapse: collapse; }
              table td { padding: 10px 8px; border-bottom: 1px solid #e0e0e0; }
              table td:first-child { font-weight: bold; width: 35%; color: #666; }
              .amount { font-size: 22px; font-weight: bold; color: #28a745; }
              .order-id { font-size: 28px; font-weight: bold; color: hsl(195, 100%, 42%); margin: 10px 0; }
              .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
              .badge-primary { background: #e7f1ff; color: #0056b3; }
              .notes-box { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚗 New Service Order Received</h1>
                <div class="order-id">#${orderId}</div>
              </div>
              <div class="content">
                <p><strong>Hi Admin,</strong></p>
                <p>A new service order has been placed and payment has been successfully processed. Please find the complete details below:</p>

                <div class="section">
                  <div class="section-title">📋 Order Summary</div>
                  <table>
                    <tr>
                      <td>Service Type:</td>
                      <td><strong>${serviceName}</strong></td>
                    </tr>
                    ${servicePackageName ? `<tr>
                      <td>Service Package:</td>
                      <td><strong style="color: hsl(195, 100%, 42%); font-size: 16px;">${servicePackageName}</strong></td>
                    </tr>` : ''}
                    <tr>
                      <td>Selected Tier:</td>
                      <td><span class="badge badge-primary">${tierName}</span></td>
                    </tr>
                    <tr>
                      <td>Amount Paid:</td>
                      <td class="amount">₹${amount}</td>
                    </tr>
                    <tr>
                      <td>Order Date:</td>
                      <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    </tr>
                    <tr>
                      <td>User ID:</td>
                      <td>#${userId}</td>
                    </tr>
                  </table>
                </div>

                <div class="section">
                  <div class="section-title">👤 Customer Details</div>
                  <table>
                    <tr>
                      <td>Name:</td>
                      <td><strong>${name}</strong></td>
                    </tr>
                    <tr>
                      <td>Email:</td>
                      <td>${email}</td>
                    </tr>
                    <tr>
                      <td>Mobile Number:</td>
                      <td><strong>${mobileNumber}</strong></td>
                    </tr>
                  </table>
                </div>

                <div class="section">
                  <div class="section-title">🚙 Vehicle Details</div>
                  <table>
                    ${carCompany ? `
                    <tr>
                      <td>Car Company:</td>
                      <td>${carCompany}</td>
                    </tr>` : ''}
                    ${carModel ? `
                    <tr>
                      <td>Car Model:</td>
                      <td>${carModel}</td>
                    </tr>` : ''}
                    ${carModelYear ? `
                    <tr>
                      <td>Model Year:</td>
                      <td>${carModelYear}</td>
                    </tr>` : ''}
                    ${registrationNumber ? `
                    <tr>
                      <td>Registration Number:</td>
                      <td><strong>${registrationNumber}</strong></td>
                    </tr>` : ''}
                    ${chassisNumber ? `
                    <tr>
                      <td>Chassis Number:</td>
                      <td>${chassisNumber}</td>
                    </tr>` : ''}
                    ${!carCompany && !carModel && !carModelYear && !registrationNumber && !chassisNumber ? `
                    <tr>
                      <td colspan="2"><em>No vehicle details provided</em></td>
                    </tr>` : ''}
                  </table>
                </div>

                ${address ? `
                <div class="section">
                  <div class="section-title">📍 Service Location</div>
                  <table>
                    <tr>
                      <td>Address:</td>
                      <td>${address}</td>
                    </tr>
                    ${city ? `
                    <tr>
                      <td>City:</td>
                      <td>${city}</td>
                    </tr>` : ''}
                    <tr>
                      <td>State:</td>
                      <td>${state}</td>
                    </tr>
                    <tr>
                      <td>Postcode:</td>
                      <td>${postcode}</td>
                    </tr>
                    <tr>
                      <td>Complete Address:</td>
                      <td><strong>${address}, ${city ? city + ', ' : ''}${state} - ${postcode}</strong></td>
                    </tr>
                  </table>
                </div>` : ''}

                ${appointmentDate ? `
                <div style="background: linear-gradient(135deg, #e8f5ff 0%, #f0f9ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00a8e8;">
                  <h3 style="margin: 0 0 15px 0; color: #1c3b54; font-size: 16px; font-weight: 600;">
                    📅 Scheduled Appointment
                  </h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #333; font-size: 14px;">
                        <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-IN', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </td>
                    </tr>
                    ${appointmentTimeSlot ? `
                    <tr>
                      <td style="padding: 8px 0; color: #333; font-size: 14px;">
                        <strong>Time Slot:</strong> ${appointmentTimeSlot}
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}

                ${orderNotes ? `
                <div class="notes-box">
                  <strong>📝 Additional Notes from Customer:</strong>
                  <p style="margin: 10px 0 0 0;">${orderNotes}</p>
                </div>
                ` : ''}

                <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 25px; border: 1px solid #b3d9ff;">
                  <h3 style="margin-top: 0; color: #0056b3;">⚡ Action Required</h3>
                  <ul style="margin: 10px 0;">
                    <li>Review the order details above</li>
                    <li>Contact the customer at <strong>${mobileNumber}</strong> to schedule the inspection</li>
                    <li>Confirm the service location and timing</li>
                    <li>Assign an inspector for the PDI service</li>
                  </ul>
                </div>

              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
                <p>This is an automated notification from Motopsy Service Orders</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Service order admin notification sent for order #${orderId}`);
            return true;
        } catch (error) {
            logger.error("Send service order admin notification error:", error);
            return false;
        }
    }

    /**
     * Send assignment notification email to mechanic
     * Called when a service order is assigned (auto or manually) to a mechanic
     */
    async sendMechanicAssignmentEmailAsync(mechanic, order) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn('Email service not configured. Skipping mechanic assignment email.', { mechanicId: mechanic?.id });
            return false;
        }

        try {
            const mechanicEmail = mechanic.email;
            const mechanicName = [mechanic.first_name, mechanic.last_name].filter(Boolean).join(' ') || mechanicEmail;

            const appointmentDate = order.appointment_date
                ? new Date(order.appointment_date).toLocaleDateString('en-IN', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })
                : null;

            const mailOptions = {
                from: `"Motopsy" <${this.fromEmail}>`,
                to: mechanicEmail,
                subject: `New Service Order Assigned to You - #${order.id}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px 20px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              table td { padding: 10px; border-bottom: 1px solid #e8e8e8; }
              table td:first-child { font-weight: bold; width: 40%; color: #666; }
              .order-id { background: #e0fdf4; padding: 10px 18px; border-radius: 6px; display: inline-block; font-weight: bold; color: #0f766e; margin: 10px 0; font-size: 20px; }
              .appt-box { background: linear-gradient(135deg, #e8f5ff 0%, #f0f9ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
              .appt-box h3 { margin: 0 0 10px 0; color: #1c3b54; font-size: 15px; }
              .info-box { background: #f0fdf4; padding: 18px; border-radius: 8px; border-left: 4px solid #0f766e; margin: 20px 0; }
              .info-box h3 { margin: 0 0 10px 0; color: #0f766e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔧 New Order Assigned!</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">A service order has been assigned to you</p>
              </div>
              <div class="content">
                <p>Dear <strong>${mechanicName}</strong>,</p>
                <p>A new service order has been assigned to you. Please review the details below and be prepared for the appointment.</p>

                <div style="text-align: center;">
                  <div class="order-id">Order #${order.id}</div>
                </div>

                <h3 style="color: #0f766e;">📋 Customer & Vehicle Details</h3>
                <table>
                  <tr>
                    <td>Customer Name:</td>
                    <td><strong>${order.name || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td>Contact Number:</td>
                    <td><strong>${order.mobile_number || 'N/A'}</strong></td>
                  </tr>
                  ${order.registration_number ? `
                  <tr>
                    <td>Registration No:</td>
                    <td><strong>${order.registration_number}</strong></td>
                  </tr>` : ''}
                  ${order.car_company || order.car_model ? `
                  <tr>
                    <td>Vehicle:</td>
                    <td>${[order.car_company, order.car_model, order.car_model_year].filter(Boolean).join(' ')}</td>
                  </tr>` : ''}
                </table>

                ${order.address ? `
                <h3 style="color: #0f766e;">📍 Service Location</h3>
                <table>
                  <tr>
                    <td>Address:</td>
                    <td>${[order.address, order.city, order.state, order.postcode].filter(Boolean).join(', ')}</td>
                  </tr>
                </table>` : ''}

                ${appointmentDate ? `
                <div class="appt-box">
                  <h3>📅 Appointment Details</h3>
                  <p><strong>Date:</strong> ${appointmentDate}</p>
                  ${order.appointment_time_slot ? `<p><strong>Time Slot:</strong> ${order.appointment_time_slot}</p>` : ''}
                </div>` : ''}

                <div class="info-box">
                  <h3>✅ Next Steps</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Log in to your Motopsy mechanic portal</li>
                    <li>Review the order details and service location</li>
                    <li>Contact the customer if you need to confirm anything</li>
                    <li>Complete the inspection and submit your report</li>
                  </ul>
                </div>

                <p>If you have any questions, please contact the admin team.</p>
                <p><strong>Thank you for your service!</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Motopsy. All rights reserved.</p>
                <p>For support, contact us at ${process.env.CONTACT_EMAIL || 'support@motopsy.com'}</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Mechanic assignment email sent to: ${mechanicEmail} for order #${order.id}`);
            return true;
        } catch (error) {
            logger.error('Send mechanic assignment email error:', error);
            return false;
        }
    }

    /**
     * Send error notification email to admin/developer
     * Called when an API error occurs
     */
    async sendErrorNotificationAsync(errorDetails) {
        if (!this.isConfigured || !this.transporter) {
            logger.warn("Email service not configured. Skipping error notification email.");
            return false;
        }

        try {
            const errorEmail = process.env.ERROR_NOTIFICATION_EMAIL || 'chintan.eclipso@gmail.com';

            const {
                message,
                stack,
                statusCode,
                timestamp,
                request,
                error
            } = errorDetails;

            const mailOptions = {
                from: `"Motopsy Error Alert" <${this.fromEmail}>`,
                to: errorEmail,
                subject: `🚨 API Error [${statusCode}] - ${message?.substring(0, 50) || 'Unknown Error'}`,
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Courier New', monospace; line-height: 1.6; color: #333; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; }
              .section { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #dc3545; }
              .section-title { font-weight: bold; color: #dc3545; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
              .code { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-wrap: break-word; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              table td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
              table td:first-child { font-weight: bold; width: 30%; color: #666; }
              .footer { text-align: center; padding: 15px; color: #666; font-size: 11px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
              .status-code { font-size: 36px; font-weight: bold; }
              .timestamp { font-size: 12px; opacity: 0.8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="status-code">${statusCode || 500}</div>
                <h2 style="margin: 10px 0 5px 0;">API Error Occurred</h2>
                <div class="timestamp">${timestamp || new Date().toISOString()}</div>
              </div>
              <div class="content">

                <div class="section">
                  <div class="section-title">Error Message</div>
                  <div style="color: #dc3545; font-weight: bold; font-size: 16px;">${message || 'Unknown Error'}</div>
                </div>

                <div class="section">
                  <div class="section-title">Request Details</div>
                  <table>
                    <tr>
                      <td>Method:</td>
                      <td><strong>${request?.method || 'N/A'}</strong></td>
                    </tr>
                    <tr>
                      <td>URL:</td>
                      <td>${request?.url || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Path:</td>
                      <td>${request?.path || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>IP Address:</td>
                      <td>${request?.ip || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>User ID:</td>
                      <td>${request?.userId || 'anonymous'}</td>
                    </tr>
                    <tr>
                      <td>User Agent:</td>
                      <td style="font-size: 11px;">${request?.headers?.['user-agent'] || 'N/A'}</td>
                    </tr>
                  </table>
                </div>

                ${request?.query && Object.keys(request.query).length > 0 ? `
                <div class="section">
                  <div class="section-title">Query Parameters</div>
                  <div class="code">${JSON.stringify(request.query, null, 2)}</div>
                </div>
                ` : ''}

                ${request?.body && Object.keys(request.body).length > 0 ? `
                <div class="section">
                  <div class="section-title">Request Body</div>
                  <div class="code">${JSON.stringify(request.body, null, 2)}</div>
                </div>
                ` : ''}

                ${error ? `
                <div class="section">
                  <div class="section-title">Error Details</div>
                  <table>
                    <tr>
                      <td>Error Name:</td>
                      <td>${error.name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Error Code:</td>
                      <td>${error.code || 'N/A'}</td>
                    </tr>
                    ${error.sql ? `
                    <tr>
                      <td>SQL Query:</td>
                      <td style="font-size: 11px;">${error.sql}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}

                ${stack ? `
                <div class="section">
                  <div class="section-title">Stack Trace</div>
                  <div class="code">${stack}</div>
                </div>
                ` : ''}

              </div>
              <div class="footer">
                <p>Motopsy API Error Notification | Environment: ${process.env.NODE_ENV || 'development'}</p>
                <p>Server: ${process.env.SERVER_NAME || 'localhost'}</p>
              </div>
            </div>
          </body>
          </html>
        `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Error notification email sent to: ${errorEmail}`);
            return true;
        } catch (emailError) {
            // Don't throw - just log if email fails
            logger.error("Failed to send error notification email:", emailError.message);
            return false;
        }
    }
}

module.exports = new EmailService();
