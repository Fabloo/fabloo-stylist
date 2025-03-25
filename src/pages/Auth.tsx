import React, { useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Props = {
  onSuccess: () => void;
};

export function Auth({ onSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });

      if (error) throw error;
      
      setShowOtpInput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms'
      });

      if (error) throw error;
      
      if (!user) {
        throw new Error('Verification failed. Please try again.');
      }

      // Create profile for new users
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: user.id }], { onConflict: 'id' });

      if (profileError) throw profileError;
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {showOtpInput ? 'Enter Verification Code' : 'Sign In with Phone'}
        </h2>
        <p className="text-gray-600 mt-2">
          {showOtpInput 
            ? 'We sent you a verification code via SMS'
            : 'Enter your phone number to receive a verification code'
          }
        </p>
      </div>

      <form onSubmit={showOtpInput ? handleVerifyOTP : handleSendOTP} className="space-y-6">
        {!showOtpInput ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg
                   hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Please wait...'
          ) : showOtpInput ? (
            <>
              Verify Code
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              Send Code
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {showOtpInput && (
          <button
            type="button"
            onClick={() => {
              setShowOtpInput(false);
              setOtp('');
              setError(null);
            }}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
          >
            Change Phone Number
          </button>
        )}
      </form>
    </div>
  );
}