import { createClient } from '@supabase/supabase-js'

// Load secrets from environment (only available in backend/server context)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export async function updateUserRole(userId: string, newRole: string) {
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        role: newRole,
      },
    }
  )
  console.log("data", data);
  console.log("error", error);

  if (error) {
    console.error('Error updating user metadata:', error)
  } else {
    console.log('User metadata updated:', data)
  }
}
