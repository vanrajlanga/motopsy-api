# Motopsy Node.js API - Deployment Guide

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- MySQL database access
- Access to external API credentials (Razorpay, Surepass, Droom)

## Quick Start (Development)

```bash
# 1. Clone/navigate to project
cd motopsy-nodejs-api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
nano .env  # Edit with your credentials

# 4. Start development server
npm run dev
```

Server will run on `http://localhost:5000`

## Environment Configuration

### Required Variables

Edit `.env` file with your configuration:

```env
# Server
NODE_ENV=development
PORT=5000

# Database (IMPORTANT: Use your actual database credentials)
DB_HOST=your-database-host
DB_PORT=3306
DB_NAME=motopsy
DB_USER=your-db-username
DB_PASSWORD=your-db-password

# JWT (Keep the same secret for token compatibility)
JWT_SECRET=JWTAuthenticationHIGHsecuredPasswordVVVPL0H7Xzyr789tcfgxtdtfjbct

# Razorpay
RAZORPAY_KEY_ID=rzp_test_Nh1jpCh5Gszr7i
RAZORPAY_KEY_SECRET=CmejXUQa3wpMgaxOpjKeTn1f

# Email (SMTP) - REQUIRED FOR PRODUCTION
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_USER=info@motopsy.com
SMTP_PASSWORD=Testinfo@123
CONTACT_EMAIL=info@motopsy.com

# ... (see .env.example for all variables)
```

### SMTP Configuration (Critical for Production)

**IMPORTANT**: Email functionality requires valid SMTP credentials. Without proper SMTP configuration:
- User registration emails will not be sent
- Password reset emails will not work
- Contact form emails will fail
- Vehicle report emails will not be delivered

The application will log warnings when SMTP is not configured but will continue to function. However, all email-dependent features will be disabled.

**Required SMTP variables:**
```env
SMTP_HOST=smtpout.secureserver.net    # Your SMTP server
SMTP_PORT=465                          # 465 for SSL/TLS, 587 for STARTTLS
SMTP_USER=info@motopsy.com            # SMTP authentication username
SMTP_PASSWORD=your_actual_password    # SMTP authentication password
SMTP_USER_FROM=info@motopsy.com       # "From" email address (defaults to SMTP_USER if not set)
CONTACT_EMAIL=info@motopsy.com        # Email to receive contact form submissions
```

**Note**: `SMTP_USER` is used for authentication, while `SMTP_USER_FROM` is used as the "from" address in emails. They can be different if your SMTP server allows sending emails from different addresses than the authentication user.

**To verify SMTP configuration after deployment:**
```bash
# Check if email service initialized successfully
cat logs/app-$(date +%Y-%m-%d).log | grep "Email service"

# Expected output if configured correctly:
# {"level":"info","message":"Email service configured successfully","host":"smtpout.secureserver.net","port":465,"user":"info@motopsy.com"}

# If SMTP is NOT configured, you'll see:
# {"level":"error","message":"SMTP credentials not configured. Email functionality will be disabled."}
```

## Database Setup

### Option 1: Using Existing Database

If you're connecting to the production database:

```env
DB_HOST=db5019068707.hosting-data.io
DB_PORT=3306
DB_NAME=motopsy
DB_USER=dbu832325
DB_PASSWORD=IamTHeLegend@2025kNew
```

### Option 2: Import Database Locally

If you want to run a local database:

```bash
# 1. Create database
mysql -u root -p
CREATE DATABASE motopsy;
exit;

# 2. Import SQL file
mysql -u root -p motopsy < /path/to/dbs14998902.sql

# 3. Update .env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=motopsy
DB_USER=root
DB_PASSWORD=your-mysql-password
```

## Testing the API

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "uptime": 123.45
}
```

### 2. Test User Registration
```bash
curl -X POST http://localhost:5000/api/account/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "1234567890"
  }'
```

### 3. Test Login
```bash
curl -X POST http://localhost:5000/api/account/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123"
  }'
```

This returns a JWT token. Use it for authenticated requests:

```bash
curl -X GET http://localhost:5000/api/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Production Deployment

### Method 1: PM2 (Recommended for Linux servers)

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Set environment to production
export NODE_ENV=production

# 3. Start with PM2
pm2 start src/server.js --name motopsy-api -i max

# 4. Save PM2 configuration
pm2 save

# 5. Setup PM2 to start on boot
pm2 startup

# 6. Monitor
pm2 monit

# 7. View logs
pm2 logs motopsy-api
```

### Method 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

Build and run:

```bash
# Build image
docker build -t motopsy-api .

# Run container
docker run -d \
  --name motopsy-api \
  -p 5000:5000 \
  --env-file .env \
  motopsy-api

# View logs
docker logs -f motopsy-api
```

### Method 3: Systemd Service (Linux)

Create `/etc/systemd/system/motopsy-api.service`:

```ini
[Unit]
Description=Motopsy Node.js API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/motopsy-api
ExecStart=/usr/bin/node /var/www/motopsy-api/src/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable motopsy-api
sudo systemctl start motopsy-api
sudo systemctl status motopsy-api
```

## Nginx Reverse Proxy

Configure Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name api.motopsy.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable HTTPS with Let's Encrypt:

```bash
sudo certbot --nginx -d api.motopsy.com
```

## Performance Optimization

### 1. Enable Production Mode
```env
NODE_ENV=production
```

### 2. Use PM2 Cluster Mode
```bash
pm2 start src/server.js -i max  # Use all CPU cores
```

### 3. Database Connection Pooling
Already configured in `src/config/database.js`:
```javascript
pool: {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000
}
```

### 4. Rate Limiting
Already configured in `src/app.js` (1000 requests per 15 minutes per IP)

## Monitoring

### PM2 Monitoring
```bash
pm2 monit                 # Real-time monitoring
pm2 logs motopsy-api      # View logs
pm2 status                # Check status
pm2 restart motopsy-api   # Restart app
```

### Log Files
- Location: `logs/log-YYYYMMDD.txt`
- Rotation: Daily
- Retention: 30 days

### Health Endpoint
Monitor: `GET /health`

```bash
# Add to cron for uptime monitoring
*/5 * * * * curl -f http://localhost:5000/health || systemctl restart motopsy-api
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connectivity
mysql -h DB_HOST -P DB_PORT -u DB_USER -p DB_NAME
```

If connection fails:
- Check firewall rules
- Verify database credentials
- Ensure database server allows remote connections
- Check if database host is accessible from your server

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 PID

# Or change PORT in .env
PORT=3000
```

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### JWT Token Issues

- Ensure JWT_SECRET matches between .NET and Node.js
- Check token expiration time
- Verify issuer and audience match

### Email Functionality Not Working

**Error: "Missing credentials for 'PLAIN'"**

This error means SMTP credentials are not configured in your `.env` file.

**Solution:**

1. Check if SMTP environment variables are set:
   ```bash
   grep SMTP .env
   ```

2. Verify email service initialization:
   ```bash
   cat logs/app-$(date +%Y-%m-%d).log | grep "Email service"
   ```

3. Look for email-related errors:
   ```bash
   cat logs/error-$(date +%Y-%m-%d).log | grep -i "email\|smtp"
   ```

4. Common issues:
   - Missing `SMTP_USER` or `SMTP_PASSWORD` in .env
   - Invalid SMTP credentials
   - SMTP port blocked by firewall (check port 465 or 587)
   - Wrong SMTP host or port
   - Firewall blocking outbound SMTP connections

5. Fix the configuration:
   ```bash
   # Edit .env file
   nano .env

   # Add or update SMTP credentials:
   SMTP_HOST=smtpout.secureserver.net
   SMTP_PORT=465
   SMTP_USER=info@motopsy.com
   SMTP_PASSWORD=your_actual_password
   SMTP_USER_FROM=info@motopsy.com
   CONTACT_EMAIL=info@motopsy.com

   # Restart application
   pm2 restart motopsy-api

   # Verify configuration
   cat logs/app-$(date +%Y-%m-%d).log | tail -10 | grep "Email service"
   ```

6. Test email functionality:
   ```bash
   # Try registering a new user and check if email is sent
   curl -X POST http://localhost:5000/api/account/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123",
       "firstName": "Test",
       "lastName": "User",
       "phoneNumber": "1234567890"
     }'

   # Check logs for email send confirmation
   cat logs/app-$(date +%Y-%m-%d).log | grep "Email confirmation sent"
   ```

**Note**: The application will continue to work even if email is not configured, but email-dependent features will be disabled. Users can still register and login, but they won't receive confirmation emails.

## Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Use HTTPS in production
- [ ] Enable firewall (only ports 80, 443, 22)
- [ ] Set NODE_ENV=production
- [ ] Configure rate limiting
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Restrict database access (whitelist IPs)
- [ ] Use strong JWT secret (minimum 64 characters)
- [ ] Enable CORS only for trusted origins in production
- [ ] Configure helmet security headers
- [ ] Regular backups of database

## Frontend Integration

### Update API Base URL

In your frontend application, update the base URL:

```javascript
// Old .NET API
const API_BASE_URL = 'https://old-api.motopsy.com';

// New Node.js API
const API_BASE_URL = 'https://new-api.motopsy.com';  // Update this only
```

**No other changes required!** All endpoints, request/response formats, and authentication remain identical.

## Rollback Plan

If issues occur, you can quickly rollback to the .NET API:

1. Update frontend base URL back to .NET API
2. Keep Node.js API running for testing
3. Fix issues in Node.js API
4. Switch back when ready

## Support & Maintenance

### Regular Tasks

```bash
# Update dependencies (monthly)
npm update
npm audit fix

# View logs
pm2 logs motopsy-api --lines 100

# Restart after updates
pm2 restart motopsy-api

# Check memory usage
pm2 status
```

### Backup Strategy

```bash
# Backup database daily
mysqldump -h DB_HOST -u DB_USER -p DB_NAME > backup-$(date +%Y%m%d).sql

# Backup logs weekly
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Next Steps

1. ✅ Complete remaining controllers (Vehicle, FAQ, Dashboard, etc.)
2. ✅ Implement email service with Nodemailer
3. ✅ Add Surepass and Droom API integrations
4. ✅ Write unit and integration tests
5. ✅ Setup CI/CD pipeline
6. ✅ Add API documentation (Swagger)
7. ✅ Performance testing and optimization

## Getting Help

- Check logs: `pm2 logs motopsy-api`
- View this guide: `cat DEPLOYMENT.md`
- Test health: `curl http://localhost:5000/health`

---

**Important**: Always test in development/staging before deploying to production!
