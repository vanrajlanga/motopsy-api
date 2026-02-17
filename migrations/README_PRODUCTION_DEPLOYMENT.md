# Production Deployment Guide

## 📋 Overview
This guide explains how to deploy all database changes to your LIVE/PRODUCTION environment.

---

## 🔄 Migration Files Created

### 1. **PRODUCTION_service_plans_setup.sql** ⭐ **(RUN THIS ON LIVE)**
   - **Purpose:** Complete service plans setup
   - **Changes:**
     - Adds `service_package_name` column to `service_orders`
     - Creates Vehicle Intelligence + Service History combo plan
     - Creates Safety Pack service plan (dynamic pricing)
     - Creates Inspection Only service plan (dynamic pricing)
   - **Safe to run:** Yes (uses `IF NOT EXISTS` and checks)

### 2. **add_appointment_fields_to_service_orders.sql** ⭐ **(RUN THIS ON LIVE)**
   - **Purpose:** Appointment scheduling functionality
   - **Changes:**
     - Adds `appointment_date` column (DATE)
     - Adds `appointment_time_slot` column (VARCHAR(20))
     - Adds index on `appointment_date`
   - **Safe to run:** Yes (columns are nullable)

### 3. **setup_service_plans_and_packages.sql** *(DEV ONLY)*
   - Verbose version with verification queries
   - Use for local testing/debugging
   - **DO NOT run on production** (too verbose)

---

## 🚀 Production Deployment Steps

### **STEP 1: Backup Database**
```bash
# SSH into production server
ssh user@your-production-server

# Create backup
mysqldump -u root -p motopsy_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **STEP 2: Run Service Plans Migration**
```bash
# Upload the file
scp migrations/PRODUCTION_service_plans_setup.sql user@server:/tmp/

# On server, run migration
mysql -u root -p motopsy_db < /tmp/PRODUCTION_service_plans_setup.sql
```

**Expected Output:**
- ✅ service_package_name column added
- ✅ 3 new service plans created (or skipped if exist)

### **STEP 3: Run Appointment Fields Migration**
```bash
# Upload the file
scp migrations/add_appointment_fields_to_service_orders.sql user@server:/tmp/

# On server, run migration
mysql -u root -p motopsy_db < /tmp/add_appointment_fields_to_service_orders.sql
```

**Expected Output:**
- ✅ appointment_date column added
- ✅ appointment_time_slot column added
- ✅ Index created

### **STEP 4: Verify Changes**
```sql
-- Connect to database
mysql -u root -p motopsy_db

-- Check service_orders columns
DESCRIBE service_orders;

-- Should show:
-- - service_package_name (varchar(100), nullable)
-- - appointment_date (date, nullable)
-- - appointment_time_slot (varchar(20), nullable)

-- Check service plans
SELECT id, service_name, service_key, default_amount
FROM service_plans
WHERE service_key IN (
    'vehicle_intelligence_service_history',
    'safety_pack',
    'inspection_only'
);

-- Should show 3 plans with default_amount = 0
```

### **STEP 5: Restart Backend Server**
```bash
# Restart Node.js application
pm2 restart motopsy-api
# OR
systemctl restart motopsy-backend
# OR your deployment method
```

### **STEP 6: Deploy Frontend Changes**
```bash
# Build Angular app with production config
cd motopsy
ng build --configuration production

# Deploy to server (your method)
# Example: rsync, FTP, CI/CD pipeline, etc.
```

---

## ✅ Post-Deployment Checklist

- [ ] Database backup created
- [ ] Service plans migration executed successfully
- [ ] Appointment fields migration executed successfully
- [ ] Database columns verified
- [ ] Backend server restarted
- [ ] Frontend deployed
- [ ] Test new vehicle PDI booking with appointment
- [ ] Test used vehicle PDI booking with appointment
- [ ] Test service history report booking with appointment
- [ ] Test Safety Pack booking from homepage
- [ ] Test Inspection Only booking from homepage
- [ ] Verify appointment shows in admin panel
- [ ] Verify appointment info in confirmation emails

---

## 🔧 Troubleshooting

### Issue: "Column already exists"
**Solution:** Safe to ignore - migration uses `IF NOT EXISTS`

### Issue: "Service plan already exists"
**Solution:** Migration checks for existing plans before inserting

### Issue: "Frontend not showing new fields"
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Check browser console for errors

### Issue: "Appointment not saving to database"
**Solution:**
1. Verify columns exist: `DESCRIBE service_orders;`
2. Check backend logs for errors
3. Verify Sequelize model updated

---

## 📞 Support

If you encounter issues:
1. Check migration file syntax
2. Verify database credentials
3. Review backend error logs
4. Check frontend console errors

---

## 🔙 Rollback Instructions

### Rollback Service Plans:
```sql
DELETE FROM service_plan_options
WHERE service_plan_id IN (
    SELECT id FROM service_plans
    WHERE service_key IN ('safety_pack', 'inspection_only')
);

DELETE FROM service_plans
WHERE service_key IN (
    'vehicle_intelligence_service_history',
    'safety_pack',
    'inspection_only'
);

ALTER TABLE service_orders DROP COLUMN service_package_name;
```

### Rollback Appointment Fields:
```sql
ALTER TABLE service_orders
DROP INDEX idx_appointment_date,
DROP COLUMN appointment_time_slot,
DROP COLUMN appointment_date;
```

---

## 📅 Migration History

| Date | Version | Description |
|------|---------|-------------|
| 2026-02-17 | 1.0.0 | Initial service plans + appointment scheduling setup |

---

## ⚠️ Important Notes

1. **Always backup before running migrations**
2. **Test on staging environment first** (if available)
3. **Run during low-traffic hours** to minimize impact
4. **Monitor application logs** after deployment
5. **Keep backup for at least 7 days**

---

**Ready to deploy? Follow the steps above carefully! 🚀**
