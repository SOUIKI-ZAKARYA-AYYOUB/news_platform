'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignupStep1 } from '@/components/auth/SignupStep1';
import { SignupStep2 } from '@/components/auth/SignupStep2';
import { SignupStep3 } from '@/components/auth/SignupStep3';
import { SignupStep4 } from '@/components/auth/SignupStep4';
import { SignupStep5 } from '@/components/auth/SignupStep5';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { Newspaper } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setUser, isSignedIn, isLoading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [hiddenSources, setHiddenSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isSigningUp = useRef(false);

  useEffect(() => {
    if (!authLoading && isSignedIn && !isSigningUp.current) {
      router.replace('/dashboard');
    }
  }, [authLoading, isSignedIn, router]);

  const handleSignup = async () => {
    isSigningUp.current = true;
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Create user account with preferences
      const signupResponse = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          username,
          password,
          confirmPassword,
          categoryIds: selectedCategories,
          hiddenSources: hiddenSources,
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json().catch(() => ({}));
        setError(data.error || t('auth.createFailed') || 'Failed to create account');
        setIsLoading(false);
        isSigningUp.current = false;
        return;
      }

      // Step 2: Sign in the user
      const signinResponse = await apiFetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!signinResponse.ok) {
        setError(t('auth.signInFailed') || 'Failed to sign in');
        setIsLoading(false);
        isSigningUp.current = false;
        return;
      }

      const signinData = await signinResponse.json();
      setUser(signinData.user);

      // Redirect to dashboard
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Signup error:', error);
      setError(t('common.error') || 'An error occurred. Please try again.');
      isSigningUp.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden bg-background text-foreground">
      {/* Background decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 -right-40 size-[400px] rounded-full bg-chart-2/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
        <div className="p-8">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Newspaper className="size-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">{t('common.appName')}</span>
            </Link>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-primary'
                    : step < currentStep
                    ? 'w-4 bg-primary/40'
                    : 'w-4 bg-border'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <SignupStep1
              email={email}
              onEmailChange={setEmail}
              onNext={() => setCurrentStep(2)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && (
            <SignupStep2
              username={username}
              onUsernameChange={setUsername}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 3 && (
            <SignupStep3
              email={email}
              username={username}
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 4 && (
            <SignupStep4
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              onNext={() => setCurrentStep(5)}
              onBack={() => setCurrentStep(3)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 5 && (
            <SignupStep5
              hiddenSources={hiddenSources}
              onSourcesChange={setHiddenSources}
              onNext={handleSignup}
              onBack={() => setCurrentStep(4)}
              isLoading={isLoading}
            />
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                href="/signin"
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {t('common.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
