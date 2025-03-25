import { createClient } from '@supabase/supabase-js'

// Load secrets from environment (only available in backend/server context)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export async function updateUserRole() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'ead1cfcf-da3a-407a-b103-33f714994d97',
    {
      app_metadata: {
        role: 'admin',
      },
    }
  )

  if (error) {
    console.error('Error updating user metadata:', error)
  } else {
    console.log('User metadata updated:', data)
  }
}
