# Motopsy API - Testing Guide

## Testing with cURL

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Account Management

#### Register New User
```bash
curl -X POST http://localhost:5000/api/account/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "MyPassword123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "9876543210"
  }'
```

Response:
```json
{
  "message": "Registration successful. Please check your email to confirm your account.",
  "userId": 1,
  "emailConfirmationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Confirm Email
```bash
curl -X POST http://localhost:5000/api/account/email/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_EMAIL_CONFIRMATION_TOKEN"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/account/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "MyPassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "userName": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isAdmin": false
  }
}
```

Save the token for authenticated requests!

#### Forgot Password
```bash
curl -X POST http://localhost:5000/api/account/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

#### Reset Password
```bash
curl -X POST http://localhost:5000/api/account/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_RESET_TOKEN",
    "newPassword": "NewPassword123"
  }'
```

#### Contact Us
```bash
curl -X POST http://localhost:5000/api/account/contact-us \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "message": "I need help with my account"
  }'
```

### 3. User Management (Authenticated)

#### Get Logged In User Details
```bash
curl -X GET http://localhost:5000/api/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update User Password
```bash
curl -X POST http://localhost:5000/api/user/update-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "MyPassword123",
    "newPassword": "NewPassword456"
  }'
```

#### Update User Profile
```bash
curl -X PUT http://localhost:5000/api/user/update-user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "phoneNumber": "9999999999"
  }'
```

#### Get Users List
```bash
curl -X POST http://localhost:5000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "take": 10,
    "skip": 0
  }'
```

#### Get Total User Count
```bash
curl -X GET http://localhost:5000/api/user/total-user-count
```

### 4. Payment (Razorpay)

#### Create Payment Order
```bash
curl -X POST http://localhost:5000/api/payment/create-order \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 799,
    "currency": "INR"
  }'
```

Response:
```json
{
  "orderId": "order_NVxxxxxxxxxx",
  "amount": 79900,
  "currency": "INR",
  "receipt": "order_1733318400000",
  "status": "created",
  "createdAt": 1733318400
}
```

#### Verify Payment
```bash
curl -X POST http://localhost:5000/api/payment/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_NVxxxxxxxxxx",
    "razorpay_payment_id": "pay_NVxxxxxxxxxx",
    "razorpay_signature": "generated_signature_from_razorpay"
  }'
```

## Testing with Postman

### Setup

1. Import the following as environment variables:
   - `BASE_URL`: `http://localhost:5000`
   - `TOKEN`: (will be set after login)

2. Create a login request and add this to Tests tab:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("TOKEN", jsonData.token);
}
```

### Collection Structure

```
Motopsy API
├── Health Check (GET {{BASE_URL}}/health)
├── Account
│   ├── Register (POST {{BASE_URL}}/api/account/register)
│   ├── Confirm Email (POST {{BASE_URL}}/api/account/email/confirm)
│   ├── Login (POST {{BASE_URL}}/api/account/login)
│   ├── Forgot Password (POST {{BASE_URL}}/api/account/forgot-password)
│   ├── Reset Password (POST {{BASE_URL}}/api/account/reset-password)
│   └── Contact Us (POST {{BASE_URL}}/api/account/contact-us)
├── User
│   ├── Get Current User (GET {{BASE_URL}}/api/user)
│   │   Headers: Authorization: Bearer {{TOKEN}}
│   ├── Update Password (POST {{BASE_URL}}/api/user/update-password)
│   │   Headers: Authorization: Bearer {{TOKEN}}
│   ├── Update User (PUT {{BASE_URL}}/api/user/update-user)
│   │   Headers: Authorization: Bearer {{TOKEN}}
│   ├── Get Users (POST {{BASE_URL}}/api/user)
│   └── Get User Count (GET {{BASE_URL}}/api/user/total-user-count)
└── Payment
    ├── Create Order (POST {{BASE_URL}}/api/payment/create-order)
    │   Headers: Authorization: Bearer {{TOKEN}}
    └── Verify Payment (POST {{BASE_URL}}/api/payment/verify-payment)
```

## Testing Scenarios

### Scenario 1: Complete User Registration Flow

1. **Register** → Get `emailConfirmationToken`
2. **Confirm Email** using token
3. **Login** → Get JWT `token`
4. **Get User Details** with token
5. **Update Profile** with token

### Scenario 2: Password Reset Flow

1. **Forgot Password** → Get `resetToken`
2. **Reset Password** with token
3. **Login** with new password

### Scenario 3: Payment Flow

1. **Login** → Get JWT token
2. **Create Order** → Get Razorpay `orderId`
3. (Frontend: User pays via Razorpay)
4. **Verify Payment** with payment details

## Expected Response Formats

### Success Response (with data)
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John"
}
```

### Success Response (no data)
```
HTTP 204 No Content
(empty body)
```

### Error Response
```json
{
  "isSuccess": false,
  "error": "User with this email already exists"
}
```

### HTTP Status Codes

- `200 OK` - Success with data
- `204 No Content` - Success without data
- `400 Bad Request` - Validation error, invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Admin access required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Automated Testing

### Create Test Script

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"

echo "1. Testing Health Check..."
curl -s $BASE_URL/health | jq

echo "\n2. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/account/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "1234567890"
  }')
echo $REGISTER_RESPONSE | jq

EMAIL_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.emailConfirmationToken')

echo "\n3. Testing Email Confirmation..."
curl -s -X POST $BASE_URL/api/account/email/confirm \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$EMAIL_TOKEN\"}" | jq

echo "\n4. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/account/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123"
  }')
echo $LOGIN_RESPONSE | jq

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

echo "\n5. Testing Get User Details..."
curl -s -X GET $BASE_URL/api/user \
  -H "Authorization: Bearer $TOKEN" | jq

echo "\n✅ All tests completed!"
```

Save as `test-api.sh` and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Load Testing with Apache Bench

```bash
# Test health endpoint (1000 requests, 10 concurrent)
ab -n 1000 -c 10 http://localhost:5000/health

# Test login endpoint
ab -n 100 -c 5 -p login.json -T application/json \
  http://localhost:5000/api/account/login
```

## Debugging Tips

### Enable Debug Logging
```env
LOG_LEVEL=debug
```

### View Real-time Logs
```bash
# With PM2
pm2 logs motopsy-api --lines 50

# Direct
npm run dev

# Specific log file
tail -f logs/log-20251204.txt
```

### Common Issues

#### 401 Unauthorized
- Token expired (24 hours)
- Token malformed
- Missing `Bearer ` prefix
- Get new token via login

#### 400 Bad Request
- Check request body format
- Verify required fields
- Check data types

#### 500 Internal Server Error
- Check logs: `pm2 logs motopsy-api`
- Database connection issue
- Check .env configuration

## Integration with Frontend

### Axios Example
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email, password) => {
  const response = await API.post('/api/account/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};

// Get user
const getUser = async () => {
  const response = await API.get('/api/user');
  return response.data;
};
```

## Next Steps

- ✅ Test all account endpoints
- ✅ Test all user endpoints
- ✅ Test payment flow
- ⏳ Test vehicle endpoints (when implemented)
- ⏳ Test dashboard endpoints (when implemented)
- ⏳ Write automated tests
- ⏳ Performance testing
- ⏳ Security testing

---

**Happy Testing! 🚀**
