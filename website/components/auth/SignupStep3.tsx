'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { signupPasswordSchema } from '@/lib/validations';

interface SignupStep3Props {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SignupStep3({
  email,
  username,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onNext,
  onBack,
  isLoading,
}: SignupStep3Props) {
  const [error, setError] = useState('');

  const handleNext = () => {
    // Validate password
    const validation = signupPasswordSchema.safeParse({
      email,
      username,
      password,
      confirmPassword,
    });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create Your Account</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Step 3 of 4: Set your password
        </p>
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-2">
          At least 8 characters, one uppercase letter, and one number.
        </p>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          disabled={isLoading}
        />
      </FieldGroup>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isLoading}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Loading...' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
