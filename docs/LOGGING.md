# Production Logging Guide

## Overview

The Motopsy API includes comprehensive logging for production debugging and monitoring. All logs are written to date-wise files in the `logs/` directory.

## Log Files

The application creates **three types of log files** daily:

### 1. Application Logs
- **File**: `logs/app-YYYY-MM-DD.log`
- **Content**: All INFO level and above logs
- **Retention**: 30 days
- **Max Size**: 20MB per file

### 2. Error Logs
- **File**: `logs/error-YYYY-MM-DD.log`
- **Content**: Only ERROR level logs
- **Retention**: 90 days (longer retention for debugging)
- **Max Size**: 20MB per file

### 3. Combined Logs
- **File**: `logs/combined-YYYY-MM-DD.log`
- **Content**: ALL logs (debug, info, warn, error)
- **Retention**: 14 days
- **Max Size**: 50MB per file

## Log Format

All logs are in JSON format for easy parsing and analysis:

```json
{
  "application": "Motopsy",
  "environment": "production",
  "level": "error",
  "message": "API Error occurred",
  "timestamp": "2025-12-05 13:24:35",
  "statusCode": 500,
  "request": {
    "method": "POST",
    "url": "/api/account/login",
    "path": "/api/account/login",
    "query": {},
    "body": {
      "email": "user@example.com",
      "password": "[REDACTED]"
    },
    "headers": {
      "user-agent": "Mozilla/5.0...",
      "content-type": "application/json"
    },
    "ip": "192.168.1.100",
    "userId": "anonymous"
  },
  "error": {
    "name": "Error",
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ..."
  }
}
```

## What Gets Logged

### 1. All Incoming Requests
```json
{
  "level": "info",
  "message": "Incoming: POST /api/account/login",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "userId": "anonymous"
}
```

### 2. All Response Completions
```json
{
  "level": "info",
  "message": "Completed: POST /api/account/login",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.100",
  "userId": "47"
}
```

### 3. All Errors
Errors include:
- Full error message and stack trace
- HTTP status code
- Request details (method, URL, query, body)
- Request headers
- User ID (if authenticated)
- IP address
- Timestamp

### 4. Database Operations
- Connection status
- Query execution
- Database errors

### 5. External API Calls
- Surepass API calls
- Droom API calls
- Razorpay operations
- Email sending

## Security Features

### Password Redaction
All passwords are automatically redacted in logs:
```json
{
  "body": {
    "email": "user@example.com",
    "password": "[REDACTED]"
  }
}
```

### Console Logging in Production
By default, console logging is disabled in production. To enable:
```env
CONSOLE_LOGS=true
```

## Viewing Logs

### View Today's Application Logs
```bash
cat logs/app-$(date +%Y-%m-%d).log
```

### View Today's Error Logs
```bash
cat logs/error-$(date +%Y-%m-%d).log
```

### View Last 50 Errors
```bash
cat logs/error-$(date +%Y-%m-%d).log | tail -50
```

### Search for Specific Error
```bash
grep "Database connection failed" logs/error-*.log
```

### View Logs in Real-time
```bash
tail -f logs/combined-$(date +%Y-%m-%d).log
```

### Pretty Print JSON Logs
```bash
cat logs/app-$(date +%Y-%m-%d).log | jq '.'
```

## Log Analysis Examples

### Find All 500 Errors Today
```bash
cat logs/error-$(date +%Y-%m-%d).log | jq 'select(.statusCode == 500)'
```

### Find All Errors for Specific User
```bash
cat logs/error-*.log | jq 'select(.request.userId == "47")'
```

### Count Errors by Status Code
```bash
cat logs/error-$(date +%Y-%m-%d).log | jq '.statusCode' | sort | uniq -c
```

### Find Slow Requests (>1000ms)
```bash
cat logs/app-$(date +%Y-%m-%d).log | jq 'select(.duration | tonumber > 1000)'
```

### Get All Errors from Specific Endpoint
```bash
cat logs/error-*.log | jq 'select(.request.url == "/api/account/login")'
```

## Environment Variables

Configure logging behavior with these environment variables:

```env
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable console logs in production
CONSOLE_LOGS=false

# Node environment
NODE_ENV=production
```

## Log Rotation

Logs are automatically rotated:
- **Daily**: New log file created each day
- **Size-based**: New file created if current file exceeds max size
- **Automatic cleanup**: Old logs deleted based on retention period

## Monitoring Integration

The JSON log format makes it easy to integrate with monitoring tools:

### 1. ELK Stack (Elasticsearch, Logstash, Kibana)
```bash
# Filebeat configuration
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /path/to/motopsy/logs/*.log
    json.keys_under_root: true
```

### 2. CloudWatch Logs
```bash
# AWS CloudWatch agent configuration
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/path/to/motopsy/logs/*.log",
            "log_group_name": "/motopsy/api"
          }
        ]
      }
    }
  }
}
```

### 3. Datadog
```bash
# Datadog agent configuration
logs:
  - type: file
    path: /path/to/motopsy/logs/*.log
    service: motopsy-api
    source: nodejs
```

## Best Practices

1. **Check error logs daily** in production
2. **Set up alerts** for critical errors (500 errors, database failures)
3. **Monitor log file sizes** to ensure rotation is working
4. **Archive old logs** to external storage if needed
5. **Use log analysis tools** for better insights
6. **Never commit logs to git** (.gitignore already configured)

## Troubleshooting

### No logs being created?
- Check `logs/` directory exists and is writable
- Check `NODE_ENV` and `LOG_LEVEL` environment variables
- Verify Winston and winston-daily-rotate-file packages are installed

### Log files too large?
- Reduce `maxSize` in `src/config/logger.js`
- Reduce retention period
- Implement external log shipping

### Can't find specific error?
- Check the timestamp
- Search across multiple log files
- Use `grep -r "error message" logs/`

## Support

For issues with logging, check:
1. `src/config/logger.js` - Logger configuration
2. `src/middlewares/error-handler.middleware.js` - Error logging
3. `app.js` - Request/response logging

