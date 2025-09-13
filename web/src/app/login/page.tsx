'use client';

import { useState } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleIcon, FacebookIcon } from '@/components/icons/SocialIcons';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = getSupabaseBrowserClient();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError && validateEmail(value)) {
      setEmailError('');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setAuthError('');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        setAuthError(`Failed to sign in with ${provider}. Please try again.`);
      }
    } catch (error) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setAuthError('');
    setEmailError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        setAuthError('Failed to send magic link. Please try again.');
      } else {
        setMagicLinkSent(true);
      }
    } catch (error) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <svg
              className="w-8 h-8 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Clipshare</h1>
          <p className="text-muted-foreground">Video collaboration made simple</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-xl border shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-card-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3" role="alert">
              <p className="text-sm text-destructive">{authError}</p>
            </div>
          )}

          {/* Success Message */}
          {magicLinkSent && (
            <div className="rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 p-3" role="alert">
              <p className="text-sm text-green-800 dark:text-green-200">
                Magic link sent! Check your email and click the link to sign in.
              </p>
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center gap-3"
              onClick={() => handleSocialLogin('google')}
              loading={isLoading}
              disabled={isLoading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center gap-3"
              onClick={() => handleSocialLogin('facebook')}
              loading={isLoading}
              disabled={isLoading}
            >
              <FacebookIcon />
              Continue with Facebook
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <Input
              type="email"
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              required
              disabled={isLoading}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              Send magic link
            </Button>
          </form>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <Link href="#" className="underline hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Accessibility Features */}
        <div className="sr-only">
          <h3>Keyboard Navigation</h3>
          <ul>
            <li>Tab to navigate between form elements</li>
            <li>Enter or Space to activate buttons</li>
            <li>Escape to close any open dialogs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}



