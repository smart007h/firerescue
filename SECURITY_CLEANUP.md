# 🔒 SECURITY CLEANUP REQUIRED

## ❌ CRITICAL: Files with hardcoded credentials that MUST be removed or secured:

### Files containing SERVICE ROLE KEYS (EXTREMELY SENSITIVE):
1. `src/screens/migrate_dispatchers.js`
2. `create_existing_dispatcher_auth.sql`
3. `create_ama_osei_auth.js`
4. `create_dispatcher_auth_users.js`

### Files containing ANON KEYS or URLs:
5. `fix_incident_history_issues.js`
6. `add_location_address_migration.js`
7. `check_incidents.js`

## 🛠️ IMMEDIATE ACTIONS REQUIRED:

### Option 1: Delete sensitive files (RECOMMENDED)
```bash
# These files contain service role keys and should NOT be in git
rm src/screens/migrate_dispatchers.js
rm create_existing_dispatcher_auth.sql
rm create_ama_osei_auth.js
rm create_dispatcher_auth_users.js
```

### Option 2: Move to private/secure location
Move these files to a private location outside of git repository.

### Option 3: Environment variable fix
If these files are needed, update them to use environment variables.

## ✅ COMPLETED FIXES:
- ✅ FirefighterHomeScreen.js - Fixed hardcoded credentials
- ✅ test_incident_creation.js - Fixed hardcoded credentials
- ✅ FirefighterIncidentScreen.js - Fixed hardcoded credentials

## 🔍 VERIFICATION STEPS:
1. Run: `git status` to see what files are staged
2. Review each file before committing
3. NEVER commit files with real API keys or service role keys
4. Test app still works with environment variables

## 🚨 REMEMBER:
- Service role keys have ADMIN access to your database
- If exposed, attackers can read/write/delete ALL data
- Anon keys are less sensitive but should still be in environment variables
- Always use environment variables for any API keys
