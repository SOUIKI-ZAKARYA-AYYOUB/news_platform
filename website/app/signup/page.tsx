'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignupStep1 } from '@/components/auth/SignupStep1';
import { SignupStep2 } from '@/components/auth/SignupStep2';
import { SignupStep3 } from '@/components/auth/SignupStep3';
import { SignupStep4 } from '@/components/auth/SignupStep4';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Create user account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          confirmPassword,
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        setError(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      const userData = await signupResponse.json();
      const userId = userData.user.id;

      // Step 2: Sign in the user first (so session is available for preferences)
      const signinResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!signinResponse.ok) {
        setError('Failed to sign in');
        setIsLoading(false);
        return;
      }

      const signinData = await signinResponse.json();
      setUser(signinData.user);

      // Step 3: Save user preferences (now with session)
      const preferencesResponse = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: selectedCategories,
        }),
      });

      if (!preferencesResponse.ok) {
        setError('Failed to save preferences');
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Newsly</h1>
            <p className="text-sm text-muted-foreground">
              Your personalized news feed
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
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
              onNext={handleSignup}
              onBack={() => setCurrentStep(3)}
              isLoading={isLoading}
            />
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/signin"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
