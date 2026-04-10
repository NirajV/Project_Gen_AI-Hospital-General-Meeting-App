# 🎚️ Holiday Calendar Enable/Disable Guide

> Simple guide to enable or disable the Holiday Calendar enforcement feature

**Last Updated:** April 10, 2026  
**Feature Version:** 1.0

---

## 🎯 Quick Overview

The Holiday Calendar feature can be **completely disabled** with just **ONE configuration change**. When disabled, users can schedule meetings on any date, including holidays.

---

## 📋 Two Ways to Enable/Disable

### Method 1: Configuration File (Recommended) ⭐

**File:** `/app/backend/config/holiday_calendar.json`

**Location:** Line 4

**Current Status:**
```json
{
  "holiday_calendar_version": "1.0",
  "last_updated": "2026-04-09",
  "holiday_enforcement_enabled": true,    ← THIS LINE
  "active_country": "USA",
  ...
}
```

---

### 🟢 To DISABLE Holiday Enforcement

**Step 1:** Edit the config file
```bash
nano /app/backend/config/holiday_calendar.json
```

**Step 2:** Change line 4:
```json
"holiday_enforcement_enabled": false,
```

**Step 3:** Restart backend
```bash
sudo supervisorctl restart backend
```

**Step 4:** ✅ Done! Users can now schedule meetings on holidays.

---

### 🔴 To ENABLE Holiday Enforcement

**Step 1:** Edit the config file
```bash
nano /app/backend/config/holiday_calendar.json
```

**Step 2:** Change line 4:
```json
"holiday_enforcement_enabled": true,
```

**Step 3:** Restart backend
```bash
sudo supervisorctl restart backend
```

**Step 4:** ✅ Done! Holiday restrictions are now active.

---

## Method 2: API Endpoint (Organizer/Admin Only)

### Check Current Status

```bash
curl http://localhost:8001/api/holidays/status
```

**Response:**
```json
{
  "enforcement_enabled": true,
  "active_country": "USA",
  "message": "Holiday enforcement is currently enabled"
}
```

---

### Disable Holiday Enforcement

```bash
curl -X PUT http://localhost:8001/api/holidays/toggle-enforcement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Response:**
```json
{
  "message": "Holiday enforcement has been disabled",
  "enforcement_enabled": false,
  "changed_by": "admin@hospital.com"
}
```

---

### Enable Holiday Enforcement

```bash
curl -X PUT http://localhost:8001/api/holidays/toggle-enforcement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

**Response:**
```json
{
  "message": "Holiday enforcement has been enabled",
  "enforcement_enabled": true,
  "changed_by": "admin@hospital.com"
}
```

---

## 📊 Behavior Comparison

### When ENABLED (`"holiday_enforcement_enabled": true`)

**Scenario:** User tries to schedule meeting on July 4, 2026 (Independence Day)

```
User selects: July 4, 2026
           ↓
Backend checks: Holiday Calendar
           ↓
Found: Independence Day
           ↓
Result: ❌ BLOCKED
           ↓
Error: "USA Federal Holiday - No Meeting Schedule.
        Independence Day falls on this date.
        Please choose a different date."
```

**Behavior:**
- ❌ Cannot schedule meetings on holidays
- ⚠️ Error message shows holiday name
- ✅ Must choose different date

---

### When DISABLED (`"holiday_enforcement_enabled": false`)

**Scenario:** User tries to schedule meeting on July 4, 2026 (Independence Day)

```
User selects: July 4, 2026
           ↓
Backend checks: Enforcement disabled
           ↓
Result: ✅ ALLOWED
           ↓
Success: Meeting created successfully
```

**Behavior:**
- ✅ Can schedule meetings on ANY date
- ✅ No holiday validation
- ✅ No restrictions
- 📅 Holidays are ignored

---

## 🎯 Use Cases

### When to DISABLE Holiday Enforcement

**Scenario 1: Emergency Operations**
```
Hospital operates 24/7 including holidays
Emergency meetings may be necessary on any day
→ Set: "holiday_enforcement_enabled": false
```

**Scenario 2: Different Holiday Schedule**
```
Hospital follows different holiday calendar
Configured holidays don't match hospital's schedule
→ Set: "holiday_enforcement_enabled": false
```

**Scenario 3: Flexible Scheduling**
```
Management prefers no restrictions
Doctors can schedule meetings when available
→ Set: "holiday_enforcement_enabled": false
```

---

### When to ENABLE Holiday Enforcement

**Scenario 1: Standard Operations**
```
Hospital follows federal holiday schedule
No meetings should be scheduled on holidays
→ Set: "holiday_enforcement_enabled": true
```

**Scenario 2: Staff Availability**
```
Most staff are off on holidays
Meeting attendance would be low
→ Set: "holiday_enforcement_enabled": true
```

**Scenario 3: Policy Compliance**
```
Hospital policy prohibits non-emergency meetings on holidays
→ Set: "holiday_enforcement_enabled": true
```

---

## 🔧 Technical Details

### Configuration Structure

```json
{
  "holiday_enforcement_enabled": true,  ← Master switch (ONLY THIS LINE MATTERS)
  "active_country": "USA",              ← Which holidays to check (only if enabled)
  "countries": {
    "USA": { ... },
    "India": { ... }
  }
}
```

**Important:**
- `holiday_enforcement_enabled` = Master switch
- When `false`, ALL other settings are ignored
- When `true`, uses `active_country` and holiday list

---

### Backend Validation Logic

```python
def validate_meeting_date(meeting_date):
    # FIRST: Check if enforcement is enabled
    if not self.enforcement_enabled:
        return {
            'valid': True,
            'message': 'Holiday enforcement disabled'
        }
    
    # ONLY if enabled: Check holidays
    if is_holiday(meeting_date):
        return {
            'valid': False,
            'message': 'Holiday detected'
        }
    
    return {'valid': True}
```

---

## 📝 Quick Reference

### Configuration File Location
```
/app/backend/config/holiday_calendar.json
```

### Setting to Change
```json
Line 4: "holiday_enforcement_enabled": true/false
```

### Restart Command
```bash
sudo supervisorctl restart backend
```

### Check Status (API)
```bash
curl http://localhost:8001/api/holidays/status
```

---

## 🎨 Visual Guide

### Current Configuration View

**File:** `/app/backend/config/holiday_calendar.json`

```json
{
  "holiday_calendar_version": "1.0",
  "last_updated": "2026-04-09",
  "holiday_enforcement_enabled": true,    ← CHANGE THIS
  "active_country": "USA",
  "countries": {
    "USA": {
      "country_name": "United States of America",
      "holidays": {
        "2026": [
          { "date": "2026-01-01", "name": "New Year's Day" },
          { "date": "2026-07-04", "name": "Independence Day" },
          ...
        ]
      }
    }
  }
}
```

**To Disable:** Change `true` to `false`  
**To Enable:** Change `false` to `true`

---

## ⚡ One-Command Toggle

### Disable with One Command

```bash
# Edit config file
sed -i 's/"holiday_enforcement_enabled": true/"holiday_enforcement_enabled": false/' /app/backend/config/holiday_calendar.json

# Restart backend
sudo supervisorctl restart backend

echo "✅ Holiday enforcement DISABLED"
```

### Enable with One Command

```bash
# Edit config file
sed -i 's/"holiday_enforcement_enabled": false/"holiday_enforcement_enabled": true/' /app/backend/config/holiday_calendar.json

# Restart backend
sudo supervisorctl restart backend

echo "✅ Holiday enforcement ENABLED"
```

---

## 🧪 Testing

### Test When ENABLED

1. **Set:** `"holiday_enforcement_enabled": true`
2. **Restart backend**
3. **Try to create meeting on July 4, 2026**
4. **Expected:** ❌ Error message about holiday

---

### Test When DISABLED

1. **Set:** `"holiday_enforcement_enabled": false`
2. **Restart backend**
3. **Try to create meeting on July 4, 2026**
4. **Expected:** ✅ Meeting created successfully

---

## 🔄 No Need to Change Anything Else

**When you disable enforcement, you DON'T need to:**
- ❌ Delete holiday entries
- ❌ Clear the calendar
- ❌ Change active country
- ❌ Modify any other settings

**Just change ONE line:**
```json
"holiday_enforcement_enabled": false
```

**Everything else stays the same!**

---

## 📊 Status Summary

### Check Current Status

```bash
# Option 1: View config file
cat /app/backend/config/holiday_calendar.json | grep "holiday_enforcement_enabled"

# Option 2: Call API
curl http://localhost:8001/api/holidays/status

# Option 3: Check backend logs
tail -f /var/log/supervisor/backend.err.log | grep "holiday"
```

---

## ✅ Summary

**To Disable Holiday Calendar:**
```
1. Open: /app/backend/config/holiday_calendar.json
2. Change line 4: "holiday_enforcement_enabled": false
3. Restart: sudo supervisorctl restart backend
4. Done! ✅
```

**To Enable Holiday Calendar:**
```
1. Open: /app/backend/config/holiday_calendar.json
2. Change line 4: "holiday_enforcement_enabled": true
3. Restart: sudo supervisorctl restart backend
4. Done! ✅
```

**That's it! Just ONE line to control the entire feature.** 🎊

---

## 🆘 Troubleshooting

**Issue: Changed config but still seeing old behavior**

**Solution:**
```bash
# Make sure backend restarted
sudo supervisorctl restart backend

# Check status
curl http://localhost:8001/api/holidays/status
```

**Issue: API says enabled but config says disabled**

**Solution:**
```bash
# Reload the config
sudo supervisorctl restart backend

# Wait 5 seconds, then check again
curl http://localhost:8001/api/holidays/status
```

---

**Version:** 1.0  
**Last Updated:** April 10, 2026  
**Feature Status:** ✅ Fully Implemented
