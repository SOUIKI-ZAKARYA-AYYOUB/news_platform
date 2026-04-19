import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { user: null, authenticated: false },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.userId,
          email: session.email,
          username: session.username,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Session lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
