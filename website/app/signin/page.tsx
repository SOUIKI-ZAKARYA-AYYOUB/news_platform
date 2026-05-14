'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { ArrowRight, Lock, Mail, Newspaper } from 'lucide-react';

export default function SigninPage() {
  const router = useRouter();
  const { setUser, isSignedIn, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [authLoading, isSignedIn, router]);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to sign in');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setUser(data.user);
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Signin error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 -left-40 size-[400px] rounded-full bg-chart-5/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
        <div className="p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Newspaper className="size-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">Newsly</span>
            </Link>
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to access your personalized feed
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignin} className="space-y-4">
            <FieldGroup>
              <FieldLabel htmlFor="email" className="text-sm font-medium">Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-10 h-11 border-border/50 focus:border-primary"
                />
              </div>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="password" className="text-sm font-medium">Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-10 h-11 border-border/50 focus:border-primary"
                />
              </div>
            </FieldGroup>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 text-base"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="size-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
