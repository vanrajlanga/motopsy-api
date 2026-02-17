const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./src/config/logger');
const errorHandler = require('./src/middlewares/error-handler.middleware');

// Import routes
const accountRoutes = require('./src/routes/account.routes');
const userRoutes = require('./src/routes/user.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const faqRoutes = require('./src/routes/faq.routes');
const lostCarRoutes = require('./src/routes/lost-car.routes');
const vehicleSpecificationRoutes = require('./src/routes/vehicle-specification.routes');
const paymentHistoryRoutes = require('./src/routes/payment-history.routes');
const vehicleDetailRoutes = require('./src/routes/vehicle-detail.routes');
const vehicleReportRoutes = require('./src/routes/vehicle-report.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const physicalVerificationRoutes = require('./src/routes/physical-verification.routes');
const obvRoutes = require('./src/routes/obv.routes');
const userActivityLogRoutes = require('./src/routes/user-activity-log.routes');
const couponRoutes = require('./src/routes/coupon.routes');
const orderRoutes = require('./src/routes/order.routes');
const pricingRoutes = require('./src/routes/pricing.routes');
const invoiceRoutes = require('./src/routes/invoice.routes');
const customVehicleEntryRoutes = require('./src/routes/custom-vehicle-entry.routes');
const discrepancyRoutes = require('./src/routes/discrepancy.routes');
const roleRoutes = require('./src/routes/role.routes');
const serviceHistoryRoutes = require('./src/routes/service-history.routes');
const servicePlanRoutes = require('./src/routes/service-plan.routes');
const serviceOrderRoutes = require('./src/routes/service-order.routes');
const appointmentSlotRoutes = require('./src/routes/appointment-slot.routes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins (matching .NET "AllOrigin" policy)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (matching .NET UseDefaultFiles and UseStaticFiles)
app.use(express.static('public'));

// Request logging middleware - Enhanced for production debugging
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info(`Incoming: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId || 'anonymous'
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger[logLevel](`Completed: ${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId || 'anonymous'
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes (matching .NET route structure)
app.use('/api/account', accountRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/lostCar', lostCarRoutes);
app.use('/api/vehicleSpecification', vehicleSpecificationRoutes);
app.use('/api/paymentHistory', paymentHistoryRoutes);
app.use('/api/vehicle-detail', vehicleDetailRoutes);
app.use('/api/vehicleReport', vehicleReportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/physicalVerification', physicalVerificationRoutes);
app.use('/api/obv', obvRoutes);
app.use('/api/UserActivityLog', userActivityLogRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/custom-vehicles', customVehicleEntryRoutes);
app.use('/api/discrepancy', discrepancyRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/service-history', serviceHistoryRoutes);
app.use('/api', servicePlanRoutes);
app.use('/api', serviceOrderRoutes);
app.use('/api', appointmentSlotRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    isSuccess: false,
    error: 'Not Found'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
