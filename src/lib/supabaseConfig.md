# Supabase Configuration for Direct Phone Authentication

## Configuration Steps

To allow users to sign up directly with a phone number without requiring OTP verification, follow these steps in your Supabase project dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Scroll down to **Phone Auth** section and enable it
4. Disable **Verify phone numbers** option 
   - This setting allows users to sign up without requiring phone verification
   
## Additional Configuration Notes

- If you want to enable phone authentication but bypass the OTP verification process, the `signUp` method with phone and password will create the user directly when "Verify phone numbers" is turned off.
- Make sure your application has appropriate security measures to prevent spam or abuse.
- Consider implementing your own validation logic if you still want to verify phone numbers at a later point.

## Security Considerations

- Skipping phone verification reduces security but improves user experience.
- You can implement custom verification later in your user flow if needed.
- Consider adding rate limiting or CAPTCHA to prevent abuse of your signup endpoint. 