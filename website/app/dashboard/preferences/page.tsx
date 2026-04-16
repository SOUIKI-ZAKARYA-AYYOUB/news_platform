'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { Category } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function PreferencesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories?usedOnly=1');
        const categoriesData = await categoriesResponse.json();
        const availableCategories = categoriesData.categories || [];
        setCategories(availableCategories);

        // Fetch user preferences
        const preferencesResponse = await fetch('/api/preferences');
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          const availableCategoryIds = new Set<number>(
            availableCategories.map((category: Category) => category.id)
          );

          const validPreferences = (preferencesData.preferences || []).filter((id: number) =>
            availableCategoryIds.has(id)
          );

          setSelectedCategories(validPreferences);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, router, authLoading]);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: selectedCategories,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save preferences');
      } else {
        setSuccess('Preferences saved successfully!');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            My Interests
          </h2>
          <p className="text-muted-foreground mb-6">
            Select the categories you&apos;re interested in to customize your news feed.
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}

          <FieldGroup>
            <FieldLabel>Select your interests:</FieldLabel>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">
                No active categories found in the current news dataset.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6 mt-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                      disabled={isSaving}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </FieldGroup>

          <div className="flex gap-3 mt-8">
            <Link href="/dashboard">
              <Button variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedCategories.length === 0 || categories.length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
