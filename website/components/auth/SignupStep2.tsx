'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { usernameSchema } from '@/lib/validations';

interface SignupStep2Props {
  username: string;
  onUsernameChange: (username: string) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SignupStep2({
  username,
  onUsernameChange,
  onNext,
  onBack,
  isLoading,
}: SignupStep2Props) {
  const [error, setError] = useState('');

  const handleNext = () => {
    // Validate username
    const validation = usernameSchema.safeParse(username);
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
          Step 2 of 4: Choose a username
        </p>
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input
          id="username"
          type="text"
          placeholder="your_username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          disabled={isLoading}
        />
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          Can contain letters, numbers, underscores, and hyphens. At least 3 characters.
        </p>
      </FieldGroup>

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
          disabled={isLoading || !username}
          className="flex-1"
        >
          {isLoading ? 'Loading...' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
