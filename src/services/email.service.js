const nodemailer = require("nodemailer");
const logger = require("../config/logger");

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
     * Send payment success notification to admin
     * Includes link to view the pending vehicle report requests
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
            const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'https://admin.motopsy.com';
            // Link to vehicle report list page - admin can search for the specific request
            const reportLink = `${adminPanelUrl}/#/admin/vehicleReport`;

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
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
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

                <p>Click the button below to view pending vehicle report requests:</p>
                <a href="${reportLink}" class="button">View Report Requests</a>

                <p style="font-size: 12px; color: #666;">Or copy this link: ${reportLink}</p>
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
}

module.exports = new EmailService();
