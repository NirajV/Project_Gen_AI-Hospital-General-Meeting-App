# Auth Testing Playbook for Hospital Meeting Scheduler

## Auth-Gated App Testing

### Step 1: Create Test User & Session (MySQL)
```bash
mysql -u root -p12345678 Hospital_General_Meeting_Scheduler_DB -e "
INSERT INTO users (id, email, name, role, is_active) 
VALUES (UUID(), 'test.user@example.com', 'Test User', 'doctor', TRUE);

SET @user_id = (SELECT id FROM users WHERE email = 'test.user@example.com');
SET @session_token = CONCAT('test_session_', UNIX_TIMESTAMP());

INSERT INTO user_sessions (id, user_id, session_token, expires_at)
VALUES (UUID(), @user_id, @session_token, DATE_ADD(NOW(), INTERVAL 7 DAY));

SELECT @session_token as session_token, @user_id as user_id;
"
```

### Step 2: Test Backend API
```bash
# Test auth endpoint
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "https://your-app.com/api/patients" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "https://your-app.com/api/patients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"first_name": "John", "last_name": "Doe", "primary_diagnosis": "Test"}'
```

### Step 3: Browser Testing
```javascript
// Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://your-app.com");
```

### Checklist
- [ ] User document has id field
- [ ] Session user_id matches user's id exactly
- [ ] Backend queries use id (not _id)
- [ ] API returns user data with id field (not 401/404)
- [ ] Browser loads dashboard (not login page)

### Success Indicators
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work

### Failure Indicators
❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page
