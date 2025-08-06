# 🚒 Fire Rescue Database Setup Guide

## Overview
This guide will help you set up the complete database structure for the Fire Rescue application with all the new features we've implemented.

## Prerequisites
- Supabase project created
- Node.js installed (for dispatcher user creation script)
- Database migration tool or direct SQL access

## Setup Steps

### 1. Run Database Migrations

Execute the migration files in order:

```bash
# Core structure
20250806_add_missing_incident_columns.sql
20250806_create_chat_messages_table.sql
20250806_create_dispatchers_table.sql
20250806_create_firefighters_table.sql
20250806_update_profiles_for_dispatchers.sql
20250806_final_setup_and_data.sql
```

### 2. Create Dispatcher Authentication Users

#### Option A: Using the Node.js Script

1. **Install Supabase JS client:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Update the script with your credentials:**
   Edit `create-dispatcher-users.js` and replace:
   - `YOUR_SUPABASE_URL_HERE` with your Supabase project URL
   - `YOUR_SERVICE_ROLE_KEY_HERE` with your service role key

3. **Run the script:**
   ```bash
   node create-dispatcher-users.js
   ```

#### Option B: Manual Creation via Supabase Dashboard

1. Go to Authentication > Users in your Supabase dashboard
2. Create users manually with these credentials:

| Email | Password | Full Name | Role |
|-------|----------|-----------|------|
| john.dispatcher@firerescue.com | FireRescue2024! | John Dispatcher | dispatcher |
| sarah.commander@firerescue.com | FireRescue2024! | Sarah Commander | dispatcher |
| mike.controller@firerescue.com | FireRescue2024! | Mike Controller | dispatcher |

3. After creating each user, update the `dispatchers` table:
   ```sql
   UPDATE dispatchers 
   SET user_id = 'USER_ID_FROM_SUPABASE'
   WHERE id = 'FS001'; -- Repeat for FS002, FS003
   ```

### 3. Verify Setup

Run this query to verify everything is working:

```sql
-- Check all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('incidents', 'chat_messages', 'dispatchers', 'firefighters', 'dispatcher_locations', 'profiles');

-- Check dispatcher setup
SELECT 
  d.id,
  d.name,
  d.email,
  d.user_id,
  p.role,
  p.full_name
FROM dispatchers d
LEFT JOIN profiles p ON p.id = d.user_id
ORDER BY d.id;

-- Check sample incident data
SELECT * FROM incident_summary LIMIT 5;
```

## Database Structure

### New Tables Created:

1. **`incidents`** - Enhanced with new columns:
   - `dispatcher_id` - Assigned dispatcher
   - `station_id` - Assigned fire station
   - `latitude/longitude` - Precise coordinates
   - `location_address` - Human-readable address

2. **`chat_messages`** - Real-time messaging:
   - Links incidents with users
   - Proper foreign key constraints
   - RLS policies for security

3. **`dispatchers`** - Dispatcher management:
   - Custom IDs (FS001, FS002, etc.)
   - Station assignments
   - User authentication links

4. **`firefighters`** - Station information:
   - Complete station details
   - Firefighter roster
   - Regional organization

5. **`dispatcher_locations`** - Real-time tracking:
   - GPS coordinates for dispatchers
   - Updated in real-time during incidents

### Key Features Enabled:

✅ **Role-based authentication** (User, Firefighter, Dispatcher)
✅ **Real-time chat** between incident reporters and dispatchers
✅ **GPS tracking** for dispatchers and incidents
✅ **Station assignment** and information display
✅ **Location formatting** from coordinates to addresses
✅ **Civilian-specific screens** with simplified navigation
✅ **Enhanced incident management** with proper relationships

## Security Features

- **Row Level Security (RLS)** on all tables
- **Role-based access policies**
- **Secure foreign key relationships**
- **Proper authentication checks**

## Testing the Setup

### Test Dispatcher Login:
- Email: `john.dispatcher@firerescue.com`
- Password: `FireRescue2024!`

### Test Features:
1. Create a new incident as a civilian user
2. Assign dispatcher via admin interface
3. Test chat functionality
4. Verify GPS tracking
5. Check station information display

## Troubleshooting

### Common Issues:

1. **Migration Errors:**
   - Check if tables already exist
   - Verify foreign key relationships
   - Ensure proper permissions

2. **Authentication Issues:**
   - Verify service role key is correct
   - Check user creation in Supabase dashboard
   - Ensure profile records are created

3. **RLS Policy Issues:**
   - Test with different user roles
   - Check policy conditions
   - Verify table permissions

### Helpful Queries:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check foreign key constraints
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

## Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify all migration files ran successfully
3. Test with a fresh Supabase project if needed
4. Review the RLS policies for proper access control

Your Fire Rescue application database is now ready for production! 🚒🔥
