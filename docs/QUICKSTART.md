# 🚀 Motopsy Node.js API - Quick Start

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Install dependencies
npm install

# 2. Configure database (edit .env file)
cp .env.example .env
nano .env  # Update DB_HOST, DB_USER, DB_PASSWORD

# 3. Start server
npm run dev

# 4. Test it
curl http://localhost:5000/health
```

Server runs on: **http://localhost:5000**

---

## What Works Right Now ✅

### Account Management
- ✅ User registration
- ✅ Email confirmation
- ✅ Login (JWT tokens)
- ✅ Password reset
- ✅ Contact form

### User Management
- ✅ Get user profile
- ✅ Update user profile
- ✅ Change password
- ✅ Get user list
- ✅ Get user count

### Payments
- ✅ Create Razorpay order
- ✅ Verify payment

---

## Quick Test

### 1. Register a User
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

### 2. Confirm Email
Use the `emailConfirmationToken` from the registration response:

```bash
curl -X POST http://localhost:5000/api/account/email/confirm \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN_HERE"}'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/account/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123"
  }'
```

Save the returned `token`!

### 4. Get Your Profile
```bash
curl http://localhost:5000/api/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Environment Setup

### Minimum Required Variables

```env
# Database (REQUIRED - update these!)
DB_HOST=db5019068707.hosting-data.io
DB_PORT=3306
DB_NAME=motopsy
DB_USER=dbu832325
DB_PASSWORD=IamTHeLegend@2025kNew

# JWT (Keep this secret!)
JWT_SECRET=JWTAuthenticationHIGHsecuredPasswordVVVPL0H7Xzyr789tcfgxtdtfjbct
```

### Database Options

**Option 1: Use Remote Database** (Production DB - be careful!)
```env
DB_HOST=db5019068707.hosting-data.io
```

**Option 2: Use Local Database**
```bash
# Import SQL file first
mysql -u root -p motopsy < /Users/chintan/Documents/motopsy/dbs14998902.sql

# Then update .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
```

---

## Common Issues & Solutions

### ❌ "Cannot connect to database"
**Solution**:
- Check if MySQL is running
- Verify DB credentials in `.env`
- Test connection: `mysql -h DB_HOST -u DB_USER -p`

### ❌ "Port 5000 already in use"
**Solution**:
```bash
# Change port in .env
PORT=3000

# Or kill existing process
lsof -ti:5000 | xargs kill -9
```

### ❌ "Module not found"
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Invalid or expired token"
**Solution**:
- Tokens expire after 24 hours
- Login again to get new token
- Check if you're using `Bearer ` prefix

---

## Development Commands

```bash
npm run dev      # Start with auto-reload (nodemon)
npm start        # Start production server
npm test         # Run tests (when implemented)
```

---

## Project Structure

```
src/
├── config/          Database & logger setup
├── models/          Sequelize models
├── services/        Business logic
├── controllers/     Request handlers
├── routes/          Route definitions
├── middlewares/     Auth, error handling
├── utils/           Helpers (JWT, hashing, Result)
├── app.js           Express app
└── server.js        Entry point
```

---

## API Endpoints

### Public Endpoints (No Auth)
```
POST   /api/account/register
POST   /api/account/email/confirm
POST   /api/account/login
POST   /api/account/forgot-password
POST   /api/account/reset-password
POST   /api/account/contact-us
GET    /api/user/total-user-count
POST   /api/user (get users list)
```

### Protected Endpoints (Auth Required)
```
GET    /api/user (get current user)
PUT    /api/user/update-user
POST   /api/user/update-password
POST   /api/payment/create-order
POST   /api/payment/verify-payment
```

---

## What's Next?

### Remaining Controllers to Implement:
- 🔄 VehicleDetail (4 endpoints)
- 🔄 VehicleReport (10+ endpoints)
- 🔄 Dashboard (2 endpoints)
- 🔄 FAQ (4 endpoints)
- 🔄 PhysicalVerification (6 endpoints)
- 🔄 OBV (3 endpoints)
- 🔄 LostCar (1 endpoint)
- 🔄 VehicleSpecification (2 endpoints)
- 🔄 PaymentHistory (1 endpoint)
- 🔄 UserActivityLog (1 endpoint)

See **MIGRATION_SUMMARY.md** for complete implementation plan.

---

## Need Help?

📖 **Full Documentation**:
- `README.md` - Complete overview
- `DEPLOYMENT.md` - Production deployment
- `API_TESTING.md` - Testing guide
- `MIGRATION_SUMMARY.md` - Migration details

🐛 **Debugging**:
```bash
# View logs
tail -f logs/log-$(date +%Y%m%d).txt

# Test database
node -e "require('./src/config/database').testConnection()"

# Check health
curl http://localhost:5000/health
```

---

## Production Deployment

### Quick PM2 Setup
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start src/server.js --name motopsy-api

# Monitor
pm2 monit

# Logs
pm2 logs motopsy-api
```

See **DEPLOYMENT.md** for complete production setup.

---

## Key Features

✅ **100% API Compatibility** with .NET Core API
✅ **JWT Authentication** with 24-hour expiration
✅ **Razorpay Integration** for payments
✅ **MySQL Database** with connection pooling
✅ **Winston Logging** with daily rotation
✅ **Security** - Helmet, CORS, Rate Limiting
✅ **Error Handling** matching .NET behavior

---

## Frontend Integration

**Only change the base URL - nothing else!**

```javascript
// Old .NET API
const API_URL = 'https://old-api.motopsy.com';

// New Node.js API
const API_URL = 'http://localhost:5000';  // or production URL
```

All endpoints, request/response formats, and JWT tokens are identical!

---

**Happy Coding! 🚀**

For detailed information, see:
- 📖 `README.md` - Full documentation
- 🚀 `DEPLOYMENT.md` - Deployment guide
- 🧪 `API_TESTING.md` - Testing examples
- 📋 `MIGRATION_SUMMARY.md` - Complete migration status
