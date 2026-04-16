import { NextRequest, NextResponse } from 'next/server';

import { changeUserPassword } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { changePasswordSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;
    const result = await changeUserPassword(session.userId, currentPassword, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update password' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Password changed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}