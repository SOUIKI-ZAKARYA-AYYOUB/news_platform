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
import { apiFetch } from '@/lib/api';
import { useTranslation } from '@/context/I18nContext';

const AVAILABLE_SOURCES = [
  "TSA", "APS", "Al Jazeera", "Ennahar", "El Hayat", "El Heddaf", "WinWin"
];

export default function PreferencesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [hiddenSources, setHiddenSources] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/signin');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await apiFetch('/api/categories?usedOnly=1');
        const categoriesData = await categoriesResponse.json();
        const availableCategories = categoriesData.categories || [];
        setCategories(availableCategories);

        // Fetch user preferences
        const preferencesResponse = await apiFetch('/api/preferences');
        if (preferencesResponse.status === 401) {
          setError(t('preferences.expired') || 'Your session expired. Please sign in again.');
          router.replace('/signin');
          return;
        }

        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          
          // Categories
          const availableCategoryIds = new Set<number>(
            availableCategories.map((category: Category) => category.id)
          );
          const validPreferences = (preferencesData.preferences || []).filter((id: number) =>
            availableCategoryIds.has(id)
          );
          setSelectedCategories(validPreferences);
          
          // Hidden Sources
          setHiddenSources(preferencesData.hiddenSources || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError(t('preferences.failedLoad') || 'Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, router, authLoading, t]);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSource = (source: string) => {
    setHiddenSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      setError(t('preferences.selectAtLeastOne') || 'Please select at least one category');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categoryIds: selectedCategories,
          hiddenSources: hiddenSources,
        }),
      });

      if (response.status === 401) {
        setError(t('preferences.expired') || 'Your session expired. Please sign in again.');
        router.replace('/signin');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || t('preferences.failedSave') || 'Failed to save preferences');
      } else {
        setSuccess(t('preferences.success'));
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError(t('common.error') || 'An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('preferences.myInterests')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('preferences.selectInterests')}
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded mb-6 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-10">
            {/* Categories */}
            <FieldGroup>
              <FieldLabel>{t('preferences.selectInterests')}</FieldLabel>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">
                  No active categories found.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-3 rtl:space-x-reverse">
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

            {/* Sources */}
            <FieldGroup>
              <FieldLabel>{t('preferences.trustedSources')}</FieldLabel>
              <p className="text-xs text-muted-foreground mb-4">
                {t('preferences.selectSources')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {AVAILABLE_SOURCES.map((source) => (
                  <div key={source} className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Checkbox
                      id={`source-${source}`}
                      checked={!hiddenSources.includes(source)}
                      onCheckedChange={() => toggleSource(source)}
                      disabled={isSaving}
                    />
                    <label
                      htmlFor={`source-${source}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {source}
                    </label>
                  </div>
                ))}
              </div>
            </FieldGroup>
          </div>

          <div className="flex gap-3 mt-10">
            <Link href="/dashboard">
              <Button variant="outline" disabled={isSaving}>
                {t('common.cancel')}
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90"
              disabled={isSaving || selectedCategories.length === 0}
            >
              {isSaving ? t('preferences.saving') : t('preferences.savePreferences')}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
