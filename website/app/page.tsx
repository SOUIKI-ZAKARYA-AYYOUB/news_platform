'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b border-border bg-background/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Newsly</h1>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button variant="secondary">View News</Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Your Personalized News Feed
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Stay informed with news tailored to your interests. Select your
            preferred categories and receive the latest updates delivered to your
            personalized feed.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">
                View Latest News
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg">Create Account</Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Personalized
            </h3>
            <p className="text-muted-foreground">
              Choose from 10+ categories and get news tailored to your interests.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Real-time Updates
            </h3>
            <p className="text-muted-foreground">
              Articles are refreshed every 2 hours, keeping your feed always up to
              date.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Easy to Manage
            </h3>
            <p className="text-muted-foreground">
              Update your preferences anytime to change what news you see.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
