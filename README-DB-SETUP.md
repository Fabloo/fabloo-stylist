# Fabloo Stylist - Friend Circle Database Setup

## Quick Setup (Recommended)

To set up the Friend Circle feature, run the simplified SQL script in your Supabase project:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Open your project
3. Navigate to the SQL Editor
4. Create a new query
5. Copy and paste the entire contents of `simplified-friend-circle-setup.sql`
6. Run the query

If successful, you'll have the necessary tables created:
- `friend_circles` - Stores relationships between users and their friends
- `shared_items` - Tracks items shared with friends and their responses

## What's Fixed

The updated script fixes the permission error with `auth.users` by:

1. Avoiding direct references to the `auth.users` table
2. Using `current_setting('request.jwt.claims')` to access user email from JWT
3. Simplifying Row Level Security (RLS) policies to work with regular database roles

## Verification

To verify the setup worked correctly:

1. Run the `friend-circle-verification.sql` script in the SQL Editor
2. Check that all queries execute without errors
3. The script will confirm tables exist, RLS is enabled, and you can insert/query data

## Troubleshooting

### Permission Errors

If you encounter permission errors like:
```
{code: "42501", message: "permission denied for table users"}
```

This indicates that a SQL query is trying to directly access the `auth.users` table, which regular database roles don't have permission to do. The simplified script avoids this issue entirely.

### Missing Tables After Running Script

Make sure you run the entire script, not just part of it. After running:

1. Navigate to the "Table Editor" in your Supabase dashboard
2. You should see both `friend_circles` and `shared_items` tables listed
3. If not, check the SQL Editor output for any error messages

### Application Connection Issues

If you still see errors in your application:

1. Refresh the page
2. Check the browser console for any specific error messages
3. Make sure your application is properly connected to Supabase
4. Verify that the tables were created successfully in the Supabase dashboard

## Manual Testing in Application

After setting up the database:

1. Open the application
2. Navigate to your profile or the friend circle section
3. Try adding a new friend to your circle
4. Check the browser console for any errors
5. If errors persist, try clearing browser data and reloading

## Technical Details

The key issue was referencing the `auth.users` table directly in RLS policies, which regular database roles don't have permission to do. The fixed solution uses JWT claims to access user information, which is a more secure and permission-friendly approach.

## Manual Verification

You can verify the tables were created correctly by running the following queries in the SQL Editor:

```sql
-- Check if friend_circles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'friend_circles'
);

-- Check if shared_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'shared_items'
);
```

Both queries should return `true` if the tables were created successfully. 