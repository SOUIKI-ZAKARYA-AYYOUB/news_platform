import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import type { Category } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const usedOnly =
    request.nextUrl.searchParams.get('usedOnly') === 'true' ||
    request.nextUrl.searchParams.get('usedOnly') === '1';
  const includeCounts = request.nextUrl.searchParams.get('includeCounts') === 'true';

  try {
    if (usedOnly) {
      const { rows: countRows } = await pool.query<{ category_id: number; cnt: string }>(
        'SELECT category_id, COUNT(*) AS cnt FROM articles GROUP BY category_id',
      );

      const articleCounts: Record<number, number> = {};
      for (const r of countRows) articleCounts[r.category_id] = Number(r.cnt);

      const usedIds = Object.keys(articleCounts).map(Number);
      if (!usedIds.length) {
        return NextResponse.json({ categories: [], fallback: false, usedOnly }, { status: 200 });
      }

      const placeholders = usedIds.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query<Category>(
        `SELECT * FROM categories WHERE id IN (${placeholders}) ORDER BY name ASC`,
        usedIds,
      );

      return NextResponse.json(
        {
          categories: rows,
          fallback: false,
          usedOnly,
          articleCounts: includeCounts ? articleCounts : undefined,
        },
        { status: 200 },
      );
    }

    const { rows } = await pool.query<Category>('SELECT * FROM categories ORDER BY name ASC');

    return NextResponse.json({ categories: rows, fallback: false, usedOnly: false }, { status: 200 });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
