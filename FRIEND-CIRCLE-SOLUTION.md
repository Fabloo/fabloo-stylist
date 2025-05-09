# Friend Circle Permission Issue - Solution

## Problem

The friend circle feature was encountering a permission error when trying to access the database:

```
{code: "42501", message: "permission denied for table users"}
```

This occurred because the SQL scripts were trying to directly reference the `auth.users` table, which regular database roles don't have permission to access.

## Root Cause Analysis

1. In Supabase, the `auth.users` table is part of the authentication schema and has restricted access
2. The original policy for "Friends can view items shared with them" was trying to query `auth.users` directly
3. Regular database roles (like the one used by your application) don't have permission to access this table

## Solution

The solution involved modifying the Row Level Security (RLS) policies to avoid direct references to `auth.users`. Instead, we now use the JWT claims to access user information.

### Modified Files

1. `simplified-friend-circle-setup.sql` - The main setup script with the fixed policy
2. `setup-friend-circle-tables.sql` - The comprehensive setup script with the fixed policy
3. `supabase/migrations/20250421000000_add_friend_circle.sql` - The migration file with the fixed policy
4. `friend-circle-verification.sql` - A new script to verify the setup works correctly
5. `README-DB-SETUP.md` - Updated documentation

### Key Change

The problematic policy:

```sql
CREATE POLICY "Friends can view items shared with them"
  ON shared_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM friend_circles fc
    WHERE fc.id = shared_items.friend_circle_id
    AND fc.friend_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  ));
```

Was changed to:

```sql
CREATE POLICY "Friends can view items shared with them"
  ON shared_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM friend_circles fc
    WHERE fc.id = shared_items.friend_circle_id
    AND fc.friend_email = (current_setting('request.jwt.claims', true)::json->>'email')
  ));
```

## How to Apply

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the `simplified-friend-circle-setup.sql` script to create or replace the tables and policies
4. Verify the setup by running the `friend-circle-verification.sql` script
5. Refresh your application and test the friend circle feature

## Technical Explanation

Supabase uses PostgreSQL's Row Level Security (RLS) to control access to tables. The JWT token contains claims about the authenticated user, including their email, which can be accessed using `current_setting('request.jwt.claims')`. 

Using this approach avoids the need to directly query `auth.users`, making the policy work with regular database roles that don't have elevated permissions.

## Next Steps

1. Test that you can add friends to your circle
2. Ensure shared items are visible to the correct users
3. If you encounter any other permission issues, check for any remaining direct references to `auth.users` 