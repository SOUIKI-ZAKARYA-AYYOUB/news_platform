import bcryptjs from 'bcryptjs';
import pool from '@/lib/db';
import type { User } from '@/lib/supabase';

const SALT_ROUNDS = 10;

type UserRow = User & { password_hash: string };

function toUser(row: UserRow): User {
  const { password_hash: _ignored, ...user } = row;
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcryptjs.compare(plain, hashed);
}

export async function createUser(
  email: string,
  username: string,
  password: string,
): Promise<User | null> {
  const client = await pool.connect();
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await client.query<UserRow>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email.trim().toLowerCase(), username.trim(), passwordHash],
    );
    return rows[0] ? toUser(rows[0]) : null;
  } catch (error: unknown) {
    // unique_violation (23505) means email or username already taken
    if ((error as { code?: string }).code === '23505') return null;
    console.error('createUser error:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.trim().toLowerCase()],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
    [username.trim()],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.trim().toLowerCase()],
  );
  const row = rows[0];
  if (!row) return null;
  const valid = await comparePassword(password, row.password_hash);
  return valid ? toUser(row) : null;
}

export type ChangePasswordResult = { success: boolean; error?: string };

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  if (currentPassword === newPassword) {
    return { success: false, error: 'New password must be different from current password' };
  }

  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );
  const row = rows[0];
  if (!row) return { success: false, error: 'User not found' };

  const valid = await comparePassword(currentPassword, row.password_hash);
  if (!valid) return { success: false, error: 'Current password is incorrect' };

  const newHash = await hashPassword(newPassword);
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId],
  );
  return { success: true };
}

export async function updateUserPreferences(
  userId: string,
  categoryIds: number[],
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    const unique = [...new Set(categoryIds)];
    for (const categoryId of unique) {
      await client.query(
        'INSERT INTO user_preferences (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, categoryId],
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateUserPreferences error:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function getUserPreferences(userId: string): Promise<number[]> {
  const { rows } = await pool.query<{ category_id: number }>(
    'SELECT category_id FROM user_preferences WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => r.category_id);
}

export async function updateUserHiddenSources(
  userId: string,
  sources: string[],
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_hidden_sources WHERE user_id = $1', [userId]);
    const unique = [...new Set(sources)];
    for (const source of unique) {
      await client.query(
        'INSERT INTO user_hidden_sources (user_id, source_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, source],
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateUserHiddenSources error:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function getUserHiddenSources(userId: string): Promise<string[]> {
  const { rows } = await pool.query<{ source_name: string }>(
    'SELECT source_name FROM user_hidden_sources WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => r.source_name);
}
