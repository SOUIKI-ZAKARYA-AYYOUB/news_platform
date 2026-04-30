'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { emailSchema } from '@/lib/validations';

interface SignupStep1Props {
  email: string;
  onEmailChange: (email: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function SignupStep1({
  email,
  onEmailChange,
  onNext,
  isLoading,
}: SignupStep1Props) {
  const [error, setError] = useState('');

  const handleNext = () => {
    // Validate email
    const validation = emailSchema.safeParse(email);
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
          Step 1 of 4: Enter your email address
        </p>
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="email">Email Address</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={isLoading}
        />
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </FieldGroup>

      <Button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Loading...' : 'Next'}
      </Button>
    </div>
  );
}
