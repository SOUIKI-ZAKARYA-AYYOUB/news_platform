'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { Category } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface SignupStep4Props {
  selectedCategories: number[];
  onCategoriesChange: (categoryIds: number[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SignupStep4({
  selectedCategories,
  onCategoriesChange,
  onNext,
  onBack,
  isLoading,
}: SignupStep4Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiFetch('/api/categories?usedOnly=1');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to fetch categories');
        }

        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          setError('');
        } else {
          setError('No categories available. Please try again shortly.');
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to load categories');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleNext = () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }
    setError('');
    onNext();
  };

  const toggleCategory = (categoryId: number) => {
    const nextSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];

    onCategoriesChange(nextSelection);
  };

  if (fetchLoading) {
    return (
      <div className="w-full text-center">
        <p className="text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create Your Account</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Step 4 of 4: Select your interests
        </p>
      </div>

      <FieldGroup>
        <FieldLabel>Select the categories you&apos;re interested in:</FieldLabel>
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                  disabled={isLoading}
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
        ) : (
          <p className="text-sm text-muted-foreground">No categories loaded yet.</p>
        )}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
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
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Creating Account...' : 'Complete Signup'}
        </Button>
      </div>
    </div>
  );
}
