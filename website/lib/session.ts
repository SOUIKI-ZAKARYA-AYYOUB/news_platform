import { cookies } from 'next/headers';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

const SESSION_COOKIE_NAME = 'newsly_session';
const SESSION_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface SessionData extends JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a JWT token
 */
export async function createToken(data: SessionData): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    userId: data.userId,
    email: data.email,
    username: data.username
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 7 * 24 * 60 * 60) // 7 days
    .sign(secret);

  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const verified = await jwtVerify(token, secret);
    const { payload } = verified;

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.username !== 'string'
    ) {
      return null;
    }

    return {
      ...payload,
      userId: payload.userId,
      email: payload.email,
      username: payload.username
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = await createToken(data);
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRATION / 1000, // Convert ms to seconds
    path: '/',
  });
}

/**
 * Get session from cookie
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
