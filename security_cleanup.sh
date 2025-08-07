#!/bin/bash

# 🔒 SECURITY CLEANUP SCRIPT - RUN BEFORE GIT PUSH

echo "🔒 Starting security cleanup..."

# Remove files with SERVICE ROLE KEYS (CRITICAL)
echo "🚨 Removing files with service role keys..."
if [ -f "create_ama_osei_auth.js" ]; then
    echo "  - Removing create_ama_osei_auth.js"
    rm create_ama_osei_auth.js
fi

if [ -f "create_dispatcher_auth_users.js" ]; then
    echo "  - Removing create_dispatcher_auth_users.js"
    rm create_dispatcher_auth_users.js
fi

if [ -f "create_existing_dispatcher_auth.sql" ]; then
    echo "  - Removing create_existing_dispatcher_auth.sql"
    rm create_existing_dispatcher_auth.sql
fi

if [ -f "src/screens/migrate_dispatchers.js" ]; then
    echo "  - Removing src/screens/migrate_dispatchers.js"
    rm src/screens/migrate_dispatchers.js
fi

# Check for any remaining hardcoded credentials
echo "🔍 Checking for remaining hardcoded credentials..."
if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    echo "❌ WARNING: Found remaining hardcoded tokens!"
    echo "   Please review and fix before pushing to git"
else
    echo "✅ No hardcoded JWT tokens found"
fi

# Verify .env is in .gitignore
if grep -q "\.env" .gitignore; then
    echo "✅ .env is properly excluded in .gitignore"
else
    echo "❌ WARNING: .env not found in .gitignore"
fi

echo ""
echo "🔒 Security cleanup complete!"
echo ""
echo "✅ SAFE TO PUSH:"
echo "  - App source code with environment variables"
echo "  - Migration files without hardcoded credentials"
echo "  - Configuration files"
echo ""
echo "❌ NEVER PUSH:"
echo "  - .env files"
echo "  - Files with service role keys"
echo "  - Files with hardcoded API credentials"
echo ""
echo "🚀 Ready to push to git!"
