'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ProjectStatusPanel } from '@/components/project/ProjectStatusPanel';
import { ArrowRight, LogIn, Newspaper, UserPlus } from 'lucide-react';

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
            Newsly Intelligence Platform
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            A full news workflow for scraping live sources, processing articles
            into neutral story records, summarizing visible articles, and serving
            the result through a personalized frontend.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">
                <Newspaper className="size-4" />
                View Latest News
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg">
                <UserPlus className="size-4" />
                Create Account
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" size="lg">
                <LogIn className="size-4" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <ProjectStatusPanel className="mt-16" />
      </main>
    </div>
  );
}
