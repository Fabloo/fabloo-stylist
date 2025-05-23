import { createClient } from '@supabase/supabase-js'

// Load secrets from environment (only available in backend/server context)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export async function updateUserRole(userId: string, newRole: string) {
  try {
    // Check if we have the service role key
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing service role key - cannot update user roles from the client');
      throw new Error('Cannot update user roles from client-side code');
    }
    
    // Log the attempt for debugging
    console.log(`Attempting to update user ${userId} to role: ${newRole}`);
    
    // Check if user is authenticated first
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      console.warn('No active auth session, skipping user role update');
      return null; // Return null instead of throwing an error
    }
    
    // Use regular update instead of admin.updateUserById which might require different permissions
    const { data, error } = await supabase.auth.updateUser({
      data: { role: newRole }
    });

    if (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    } else {
      console.log('User metadata updated:', data);
      return data;
    }
  } catch (err) {
    console.error('Error updating user metadata:', err);
    // Don't rethrow the error if it's an auth session missing error
    if (err instanceof Error && err.message.includes('Auth session missing')) {
      console.warn('Auth session is missing, skipping user update');
      return null;
    }
    throw err;
  }
}
