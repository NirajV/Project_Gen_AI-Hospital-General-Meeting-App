# 📅 Holiday Calendar System

## Overview

The **Holiday Calendar System** is a dynamic feature that prevents meeting scheduling on configured public holidays for different countries. This system validates meeting dates against a configurable JSON file and provides instant feedback to users when attempting to schedule meetings on holidays.

---

## 🎯 Key Features

- **Multi-Country Support**: Pre-configured holidays for USA, India, and UK
- **Enable/Disable Toggle**: Single configuration flag to turn enforcement on/off
- **Observed Dates**: Handles weekend holiday observances automatically
- **Real-time Validation**: Instant API validation during meeting creation
- **Frontend Integration**: User-friendly error messages with holiday names
- **Extensible**: Easy to add new countries and holidays

---

## 📂 System Architecture

### Core Files

```
/app/backend/
├── config/
│   └── holiday_calendar.json       # Main configuration file
└── utils/
    └── holiday_checker.py          # Core validation logic
```

### API Endpoints

```
POST /api/holidays/validate         # Validate a specific date
POST /api/meetings                  # Enforces holiday check during creation
GET /api/holidays/upcoming          # Get upcoming holidays (future)
```

---

## 🔧 Configuration File Structure

### Location
`/app/backend/config/holiday_calendar.json`

### Configuration Schema

```json
{
  "holiday_calendar_version": "1.0",
  "last_updated": "2026-04-09",
  "holiday_enforcement_enabled": true,
  "active_country": "USA",
  "countries": {
    "USA": {
      "country_name": "United States of America",
      "timezone": "America/New_York",
      "holidays": {
        "2026": [
          {
            "date": "2026-01-01",
            "name": "New Year's Day",
            "type": "public",
            "observed": "2026-01-01"
          }
        ]
      }
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `holiday_enforcement_enabled` | boolean | **Master toggle** to enable/disable holiday validation globally |
| `active_country` | string | Country code for current holiday calendar (e.g., "USA", "India", "UK") |
| `date` | string | Actual date of the holiday (YYYY-MM-DD format) |
| `name` | string | Display name of the holiday |
| `type` | string | Holiday type: "public", "optional", "regional" |
| `observed` | string | Date when holiday is observed (handles weekend shifts) |
| `note` | string | Optional explanation for date observance changes |

---

## ⚙️ Enable/Disable Holiday Enforcement

### To DISABLE Holiday Validation

**Step 1:** Open the configuration file:
```bash
nano /app/backend/config/holiday_calendar.json
```

**Step 2:** Change the enforcement flag:
```json
{
  "holiday_enforcement_enabled": false
}
```

**Step 3:** Save and restart the backend:
```bash
sudo supervisorctl restart backend
```

**Result:** All meeting dates will be accepted, regardless of holidays.

---

### To ENABLE Holiday Validation

**Step 1:** Open the configuration file:
```bash
nano /app/backend/config/holiday_calendar.json
```

**Step 2:** Change the enforcement flag:
```json
{
  "holiday_enforcement_enabled": true
}
```

**Step 3:** Save and restart the backend:
```bash
sudo supervisorctl restart backend
```

**Result:** Meetings on configured holidays will be blocked with user-friendly error messages.

---

## 🌍 Switching Active Country

To change which country's holidays are enforced:

1. Open `/app/backend/config/holiday_calendar.json`
2. Update the `active_country` field:

```json
{
  "active_country": "India"
}
```

3. Available options: `"USA"`, `"India"`, `"UK"`
4. Restart backend service

---

## ➕ Adding New Holidays

### To Add a Holiday to an Existing Country

1. Navigate to the country's year array in `holiday_calendar.json`
2. Add a new holiday object:

```json
{
  "date": "2027-02-14",
  "name": "Valentine's Day",
  "type": "optional",
  "observed": "2027-02-14"
}
```

3. Ensure proper date format: `YYYY-MM-DD`
4. Restart backend service

### Handling Weekend Observances

When a holiday falls on a weekend and is observed on a different day:

```json
{
  "date": "2026-07-04",
  "name": "Independence Day",
  "type": "public",
  "observed": "2026-07-03",
  "note": "Observed on July 3 (Friday) as July 4 is Saturday"
}
```

**Note**: The system blocks meetings on the `observed` date, not the actual date.

---

## 🌎 Adding a New Country

To add support for a new country:

1. Add a new country object under `"countries"`:

```json
"Canada": {
  "country_name": "Canada",
  "timezone": "America/Toronto",
  "holidays": {
    "2026": [
      {
        "date": "2026-07-01",
        "name": "Canada Day",
        "type": "public",
        "observed": "2026-07-01"
      }
    ]
  }
}
```

2. Update `active_country` to `"Canada"` if needed
3. Restart backend service

---

## 🔍 Validation Logic

### Backend Validation Flow

```python
# In server.py - POST /api/meetings
from utils.holiday_checker import validate_meeting_date

# Validate meeting date
validation = validate_meeting_date(meeting_date)

if not validation['valid']:
    raise HTTPException(
        status_code=400,
        detail={
            "error": "holiday_conflict",
            "message": validation['message'],
            "holiday_name": validation['holiday_name'],
            "country": validation['country']
        }
    )
```

### Frontend Error Handling

```javascript
// In MeetingWizardPage.js
if (error.response?.data?.detail?.error === 'holiday_conflict') {
  const holidayName = error.response.data.detail.holiday_name;
  const country = error.response.data.detail.country;
  
  toast.error(
    `Cannot schedule meeting on ${holidayName} (${country} Federal Holiday)`
  );
}
```

---

## 🧪 Testing the System

### Test with cURL (Backend)

**Check if a specific date is a holiday:**
```bash
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

curl -X POST "$API_URL/api/holidays/validate" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-12-25"}'
```

**Expected Response (Holiday):**
```json
{
  "valid": false,
  "is_holiday": true,
  "holiday_name": "Christmas Day",
  "message": "Cannot schedule meeting on Christmas Day",
  "country": "USA",
  "enforcement_enabled": true
}
```

**Expected Response (Regular Day):**
```json
{
  "valid": true,
  "is_holiday": false,
  "holiday_name": null,
  "message": "Meeting date is available",
  "country": "USA",
  "enforcement_enabled": true
}
```

### Test Meeting Creation

```bash
TOKEN="<your-auth-token>"

curl -X POST "$API_URL/api/meetings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Meeting",
    "date": "2026-12-25",
    "time": "10:00",
    "duration": 60
  }'
```

**Expected Error (Holiday Conflict):**
```json
{
  "detail": {
    "error": "holiday_conflict",
    "message": "Cannot schedule meeting on Christmas Day",
    "holiday_name": "Christmas Day",
    "country": "USA"
  }
}
```

---

## 🎨 Frontend User Experience

When a user attempts to schedule a meeting on a holiday:

1. **API Call**: Frontend sends POST request to `/api/meetings`
2. **Backend Validation**: `holiday_checker.py` validates the date
3. **Error Response**: API returns 400 with holiday details
4. **Toast Notification**: User sees friendly error message:
   - ❌ "Cannot schedule meeting on Christmas Day (USA Federal Holiday)"
5. **Date Picker**: User can select a different date

---

## 🛠️ Maintenance

### Updating Holiday Data Annually

**Best Practice**: Update holidays at the beginning of each year

1. Open `holiday_calendar.json`
2. Add new year entries for each country:

```json
"2028": [
  {
    "date": "2028-01-01",
    "name": "New Year's Day",
    "type": "public",
    "observed": "2028-01-01"
  }
]
```

3. Remove outdated years (optional, for file size management)
4. Update `last_updated` field
5. Restart backend

### Where to Find Official Holiday Calendars

- **USA**: [OPM Federal Holidays](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/)
- **India**: [Government of India Holidays](https://www.india.gov.in/)
- **UK**: [GOV.UK Bank Holidays](https://www.gov.uk/bank-holidays)

---

## 🚨 Troubleshooting

### Issue: Holidays Not Blocking Meetings

**Solution 1**: Check enforcement flag
```bash
grep "holiday_enforcement_enabled" /app/backend/config/holiday_calendar.json
```

**Solution 2**: Restart backend service
```bash
sudo supervisorctl restart backend
```

**Solution 3**: Verify active country
```bash
grep "active_country" /app/backend/config/holiday_calendar.json
```

---

### Issue: Wrong Country Holidays Showing

**Check active country setting:**
```bash
grep "active_country" /app/backend/config/holiday_calendar.json
```

**Update if needed:**
```json
{
  "active_country": "USA"
}
```

---

### Issue: Date Format Errors

**All dates MUST follow this format:**
```
YYYY-MM-DD
```

**Examples:**
- ✅ Correct: `"2026-01-01"`
- ❌ Wrong: `"01/01/2026"`
- ❌ Wrong: `"Jan 1, 2026"`

---

## 🔐 Security Considerations

1. **File Permissions**: Ensure `holiday_calendar.json` is readable by backend service
2. **Validation**: Backend performs all validation; frontend errors are for UX only
3. **Backup**: Keep a backup of `holiday_calendar.json` before making changes
4. **Version Control**: Track changes to holiday configuration in git

---

## 📊 Future Enhancements

Potential improvements to the Holiday Calendar system:

- [ ] Admin UI for managing holidays (no file editing needed)
- [ ] Automatic holiday data updates via external API
- [ ] Regional holiday support (state/province-specific)
- [ ] Custom organizational holidays (e.g., company shutdown days)
- [ ] Holiday calendar import/export functionality
- [ ] Multi-country holiday checking for global teams

---

## 📚 Related Documentation

- [API Reference](./API_REFERENCE.md) - Full API endpoint documentation
- [Features Guide](./FEATURES.md) - Complete feature overview
- [Holiday Enable/Disable Guide](./HOLIDAY_ENABLE_DISABLE_GUIDE.md) - Detailed toggle instructions
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment steps

---

## 💡 Quick Reference Card

| Task | File | Change |
|------|------|--------|
| Disable holidays | `holiday_calendar.json` | Set `holiday_enforcement_enabled: false` |
| Enable holidays | `holiday_calendar.json` | Set `holiday_enforcement_enabled: true` |
| Switch country | `holiday_calendar.json` | Update `active_country: "India"` |
| Add holiday | `holiday_calendar.json` | Add object to year array |
| Test validation | cURL | `POST /api/holidays/validate` |

---

## 🤝 Contributing

To contribute new holiday calendars or improvements:

1. Verify holiday dates from official government sources
2. Follow the JSON schema exactly
3. Include observance rules for weekend holidays
4. Test thoroughly before committing
5. Update `last_updated` field
6. Submit changes with documentation

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Maintained By**: Hospital Meeting App Development Team
