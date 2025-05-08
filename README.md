# Direct Phone Authentication for Fabloo Stylist

This project uses Supabase for authentication, with a direct phone signup flow that doesn't require OTP verification to improve the user experience.

## Implementation Details

### Direct Phone Signup (No OTP Verification)

The app implements a streamlined authentication flow that:
1. Allows users to sign up with just their phone number
2. Creates a Supabase user with a randomly generated password
3. Bypasses the OTP verification step
4. Immediately logs the user in

### Configuration Required

To use this authentication flow, you must configure your Supabase project:

1. In Supabase dashboard, go to Authentication > Providers
2. Enable Phone Auth
3. Disable "Verify phone numbers" option

For detailed instructions, see the `src/lib/supabaseConfig.md` file.

### Security Considerations

This approach prioritizes user experience over security verification. Consider:
- Adding additional security measures like rate limiting
- Implementing a custom verification flow later in the user journey
- Adding CAPTCHA to prevent automated signups

## Benefits

- Faster onboarding with fewer steps
- Higher conversion rates from visitor to registered user
- Reduced friction in the signup process

## Authentication Components

- `Auth.tsx`: Main authentication component with direct signup and login options
- `useAuth.ts`: Hook to handle authentication state and redirection
- `useAuthStore.ts`: Zustand store for managing auth state across the app 