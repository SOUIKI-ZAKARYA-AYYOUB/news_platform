'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/context/I18nContext';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface SignupStep5Props {
  hiddenSources: string[];
  onSourcesChange: (sources: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const AVAILABLE_SOURCES = [
  "TSA", "APS", "Al Jazeera", "Ennahar", "El Hayat", "El Heddaf", "WinWin"
];

export function SignupStep5({
  hiddenSources,
  onSourcesChange,
  onNext,
  onBack,
  isLoading,
}: SignupStep5Props) {
  const { t } = useTranslation();

  const toggleSource = (source: string) => {
    onSourcesChange(
      hiddenSources.includes(source)
        ? hiddenSources.filter((s) => s !== source)
        : [...hiddenSources, source]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {t('preferences.trustedSources')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('preferences.selectSources')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
        {AVAILABLE_SOURCES.map((source) => (
          <div
            key={source}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
              !hiddenSources.includes(source)
                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
                : 'bg-card border-border/60 hover:border-border'
            }`}
            onClick={() => toggleSource(source)}
          >
            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                !hiddenSources.includes(source) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {source[0]}
              </div>
              <span className="text-sm font-medium">{source}</span>
            </div>
            <Checkbox
              id={`source-${source}`}
              checked={!hiddenSources.includes(source)}
              onCheckedChange={() => toggleSource(source)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 gap-2 border-border/60"
        >
          <ChevronLeft className="size-4" />
          {t('auth.back')}
        </Button>
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="flex-1 gap-2 bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {t('auth.finish')}
              <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
