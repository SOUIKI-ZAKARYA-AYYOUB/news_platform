'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signin');
    }
  }, [isLoading, user, router]);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (!user) {
      setPasswordError('You need to sign in before changing your password.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to change password');
      }

      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordError(message);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">My Profile</CardTitle>
            <CardDescription>
              View your account details and keep your settings up to date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-semibold text-foreground mt-1">{user.username}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground mt-1 break-all">{user.email}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-foreground mt-1 break-all text-xs">{user.id}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You are not signed in yet. Sign in to view your profile details.
                </p>
                <Link href="/signin">
                  <Button>Sign In</Button>
                </Link>
              </div>
            )}

            <div className="pt-6">
              <Link href="/dashboard/preferences">
                <Button variant="outline">Manage Preferences</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {user && (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Use a strong password with at least 8 characters, one uppercase letter, and one number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={isSubmittingPassword}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      disabled={isSubmittingPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      disabled={isSubmittingPassword}
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}

                {passwordMessage && (
                  <p className="text-sm text-green-600">{passwordMessage}</p>
                )}

                <div className="pt-2">
                  <Button type="submit" disabled={isSubmittingPassword}>
                    {isSubmittingPassword ? 'Updating password...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}