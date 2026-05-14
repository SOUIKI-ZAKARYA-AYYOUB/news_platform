'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu, Newspaper, Settings, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/context/I18nContext';

interface HeaderProps {
  newsCount?: number;
}

export function Header({ newsCount }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
    router.refresh();
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Newspaper className="size-4.5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">{t('common.appName')}</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {typeof newsCount === 'number' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 text-sm">
              <span className="text-muted-foreground">Stories:</span>
              <span className="font-semibold text-primary">{newsCount}</span>
            </div>
          )}

          {user ? (
            <>
              <span className="hidden md:block text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{user.username}</span>
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border/60 hover:bg-accent"
                  >
                    <Menu className="size-4" />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/preferences" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      {t('common.preferences')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex items-center gap-2">
                      <User className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive-foreground focus:text-destructive-foreground"
                  >
                    <LogOut className="size-4" />
                    {t('common.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" size="sm">{t('common.signIn')}</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20">
                  {t('common.signUp')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
