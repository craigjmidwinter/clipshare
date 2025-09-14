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
          redirectTo: `${window.location.origin}/auth/callback`,
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Branding */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 gradient-primary rounded-2xl mb-6 shadow-modern-xl animate-pulse-glow">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Clipshare
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Video collaboration made simple</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl shadow-modern-xl p-8 space-y-8 backdrop-blur-xl animate-fade-in-scale stagger-1">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-card-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4 backdrop-blur-sm" role="alert">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-destructive flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-destructive font-medium">{authError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {magicLinkSent && (
            <div className="rounded-2xl border-2 border-green-300/20 bg-green-50/50 dark:bg-green-900/20 p-4 backdrop-blur-sm" role="alert">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  Magic link sent! Check your email and click the link to sign in.
                </p>
              </div>
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center gap-3 hover-lift btn-hover-scale"
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
              className="w-full justify-center gap-3 hover-lift btn-hover-scale"
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
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-4 text-muted-foreground font-semibold">Or continue with</span>
            </div>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-6">
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
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />
            
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full hover-lift btn-hover-glow"
              loading={isLoading}
              disabled={isLoading}
            >
              Send magic link
            </Button>
          </form>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="#" className="underline hover:text-foreground transition-colors font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline hover:text-foreground transition-colors font-medium">
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



