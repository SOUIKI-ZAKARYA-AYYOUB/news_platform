'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Brain,
  Globe2,
  Layers3,
  Lightbulb,
  Newspaper,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe2,
    title: '7+ Live Sources',
    description: 'Scraping APS, TSA, Al Jazeera, Ennahar, Elheddaf, WinWin, Elhayat and any generic RSS site.',
  },
  {
    icon: Layers3,
    title: 'Smart Clustering',
    description: 'TF-IDF embeddings with cosine similarity group same-event articles from different sources automatically.',
  },
  {
    icon: Shield,
    title: 'Bias Reduction',
    description: 'Charged language, clickbait, and emotional exaggeration are stripped from every headline and summary.',
  },
  {
    icon: Brain,
    title: 'AI Summaries',
    description: 'Each cluster gets one clean, neutral summary powered by extractive NLP with optional Groq LLM boost.',
  },
  {
    icon: Sparkles,
    title: 'Neutral Headlines',
    description: 'Original sensational headlines are rewritten to be informative, factual, and click-bait free.',
  },
  {
    icon: Lightbulb,
    title: 'Why It Matters',
    description: 'AI explains the real-world implications of each story — who is affected and what could happen next.',
  },
  {
    icon: Zap,
    title: 'Daily Briefing',
    description: 'Instead of reading 50 articles, receive curated meta-stories with neutral headlines and clear summaries.',
  },
];

const PIPELINE_STEPS = [
  { step: '01', label: 'Scrape', detail: 'Collect articles from 7+ sources' },
  { step: '02', label: 'Normalize', detail: 'Standardize categories across languages' },
  { step: '03', label: 'Embed', detail: 'Convert articles to TF-IDF vectors' },
  { step: '04', label: 'Cluster', detail: 'Group same-event articles together' },
  { step: '05', label: 'Summarize', detail: 'Generate one neutral summary per event' },
  { step: '06', label: 'Explain', detail: 'Add "Why It Matters" context to each story' },
  { step: '07', label: 'Deliver', detail: 'Produce a clean daily briefing' },
];

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen gradient-bg">
      {/* ─── Header ─── */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Newspaper className="size-4.5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text">Newsly</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Browse News
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                Get Started
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Background decorative orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 size-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-60 -left-40 size-[400px] rounded-full bg-chart-5/5 blur-3xl" />
          <div className="absolute bottom-20 right-20 size-[300px] rounded-full bg-chart-2/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/15">
              AI-Powered News Intelligence
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              <span className="gradient-text">Your AI newsroom</span>
              <br />
              <span className="text-foreground">daily briefing</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              We scrape 7+ live sources, remove duplicates, rewrite clickbait headlines,
              summarize clearly, and explain why each story matters — transforming chaotic news into a concise daily digest.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-base px-8 h-12">
                  <Newspaper className="size-4 mr-2" />
                  Read Today&apos;s Briefing
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" size="lg" className="text-base px-8 h-12 border-border/80 hover:bg-accent">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>

          {/* ─── Stats strip ─── */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '7+', label: 'News Sources' },
              { value: '259+', label: 'Stories Processed' },
              { value: '8', label: 'Categories' },
              { value: '100%', label: 'Bias-Free Summaries' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-2xl border border-border/40 p-5 text-center hover:border-primary/30 transition-colors"
              >
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pipeline Steps ─── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How the pipeline works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Every article passes through six processing stages before reaching your feed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PIPELINE_STEPS.map((item) => (
              <div
                key={item.step}
                className="glass rounded-2xl border border-border/40 p-5 text-center hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 group"
              >
                <span className="text-xs font-bold text-primary/50 group-hover:text-primary transition-colors">
                  STEP {item.step}
                </span>
                <p className="text-lg font-semibold text-foreground mt-2">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for <span className="gradient-text">intelligent news consumption</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Every feature is designed to give you faster, cleaner, more trustworthy news.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl border border-border/40 p-6 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Footer ─── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to read smarter?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create an account to personalize your feed, or browse the latest stories right now.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 px-8 h-12">
                <Sparkles className="size-4 mr-2" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="px-8 h-12 border-border/80">
                Browse Without Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4 text-primary" />
            <span className="font-medium text-foreground">Newsly</span>
          </div>
          <p>© {new Date().getFullYear()} Newsly Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
}
