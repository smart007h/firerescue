# 📖 Documentation & Fixes

## 🗂️ Project Structure
This folder contains important fixes and documentation for the Fire Rescue app.

## 📁 `/fixes/` Directory
Contains SQL migrations and scripts that were used to resolve critical issues:

### Database Schema Fixes:
- `fix_incident_columns.sql` - Added missing incident table columns
- `fix_incident_dispatcher_ids.sql` - Fixed dispatcher ID references
- `fix_incident_status_sync.sql` - Resolved status synchronization issues

### Migration Scripts:
- `add_location_address_column.sql` - Added location address column
- `add_location_address_migration.js` - Location data migration script

## 🧹 Cleanup Policy
Temporary diagnostic scripts are automatically ignored via `.gitignore`:
- `debug_*.js`, `check_*.js`, `test_*.js`, `verify_*.js`, `fix_*.js`

Only keep scripts that:
- ✅ Provide ongoing utility (like user creation scripts)
- ✅ Document important database migrations
- ✅ Are part of the core application functionality

## 📚 Main Documentation
See the root directory for primary documentation:
- `README.md` - Main project documentation
- `DATABASE_SETUP_GUIDE.md` - Database setup instructions
- `LOCATION_FEATURES.md` - Location service documentation
- `RESOLVED_INCIDENT_RESTRICTIONS.md` - Incident workflow documentation

---
Last updated: August 2025
