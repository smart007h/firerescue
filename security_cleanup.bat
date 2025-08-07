@echo off
REM 🔒 SECURITY CLEANUP SCRIPT - Windows version

echo 🔒 Starting security cleanup...

REM Remove files with SERVICE ROLE KEYS (CRITICAL)
echo 🚨 Removing files with service role keys...

if exist "create_ama_osei_auth.js" (
    echo   - Removing create_ama_osei_auth.js
    del "create_ama_osei_auth.js"
)

if exist "create_dispatcher_auth_users.js" (
    echo   - Removing create_dispatcher_auth_users.js
    del "create_dispatcher_auth_users.js"
)

if exist "create_existing_dispatcher_auth.sql" (
    echo   - Removing create_existing_dispatcher_auth.sql
    del "create_existing_dispatcher_auth.sql"
)

if exist "src\screens\migrate_dispatchers.js" (
    echo   - Removing src\screens\migrate_dispatchers.js
    del "src\screens\migrate_dispatchers.js"
)

echo.
echo 🔒 Security cleanup complete!
echo.
echo ✅ SAFE TO PUSH:
echo   - App source code with environment variables
echo   - Migration files without hardcoded credentials
echo   - Configuration files
echo.
echo ❌ NEVER PUSH:
echo   - .env files
echo   - Files with service role keys
echo   - Files with hardcoded API credentials
echo.
echo 🚀 Ready to push to git!
pause
