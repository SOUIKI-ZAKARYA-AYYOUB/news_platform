import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import bcryptjs from 'bcryptjs';
import { isSupabaseConfigured, supabase, User } from './supabase';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

type UserWithPassword = User & {
  password_hash?: string | null;
};

type LocalPreference = {
  user_id: string;
  category_id: number;
  created_at: string;
};

type LocalAuthStore = {
  users: UserWithPassword[];
  preferences: LocalPreference[];
};

const DEFAULT_LOCAL_AUTH_STORE: LocalAuthStore = {
  users: [],
  preferences: []
};

function getLocalAuthStorePath(): string {
  return path.resolve(process.cwd(), '.data/local-auth.json');
}

async function readLocalAuthStore(): Promise<LocalAuthStore> {
  const filePath = getLocalAuthStorePath();

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as LocalAuthStore;

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : []
    };
  } catch {
    return { ...DEFAULT_LOCAL_AUTH_STORE };
  }
}

async function writeLocalAuthStore(store: LocalAuthStore): Promise<void> {
  const filePath = getLocalAuthStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

function sanitizeUser(user: UserWithPassword): User {
  const { password_hash: _ignored, ...safeUser } = user;
  return safeUser;
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(plainPassword, hashedPassword);
}

/**
 * Create a new user in the database
 */
export async function createUser(
  email: string,
  username: string,
  password: string
): Promise<User | null> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();

      const alreadyExists = store.users.some(
        (user) =>
          user.email.toLowerCase() === normalizedEmail ||
          user.username.toLowerCase() === normalizedUsername
      );

      if (alreadyExists) {
        return null;
      }

      const now = new Date().toISOString();
      const hashedPassword = await hashPassword(password);

      const newUser: UserWithPassword = {
        id: randomUUID(),
        email,
        username,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now
      };

      store.users.push(newUser);
      await writeLocalAuthStore(store);
      return sanitizeUser(newUser);
    } catch (error) {
      console.error('Error creating local user:', error);
      return null;
    }
  }

  try {
    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        username,
        password_hash: hashedPassword,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in createUser:', error);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const user = store.users.find(
        (entry) => entry.email.toLowerCase() === email.trim().toLowerCase()
      );

      return user ? sanitizeUser(user) : null;
    } catch (error) {
      console.error('Error in local getUserByEmail:', error);
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const user = store.users.find(
        (entry) => entry.username.toLowerCase() === username.trim().toLowerCase()
      );

      return user ? sanitizeUser(user) : null;
    } catch (error) {
      console.error('Error in local getUserByUsername:', error);
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('username', username)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const user = store.users.find((entry) => entry.id === userId);
      return user ? sanitizeUser(user) : null;
    } catch (error) {
      console.error('Error in local getUserById:', error);
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

/**
 * Verify user credentials
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const user = store.users.find(
        (entry) => entry.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!user || !user.password_hash) {
        return null;
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }

      return sanitizeUser(user);
    } catch (error) {
      console.error('Error in local verifyCredentials:', error);
      return null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    const user = data as UserWithPassword;

    const isPasswordValid = await comparePassword(password, user.password_hash ?? '');
    if (!isPasswordValid) {
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('Error in verifyCredentials:', error);
    return null;
  }
}

export type ChangePasswordResult = {
  success: boolean;
  error?: string;
};

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  if (currentPassword === newPassword) {
    return { success: false, error: 'New password must be different from current password' };
  }

  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const userIndex = store.users.findIndex((entry) => entry.id === userId);

      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      const existingUser = store.users[userIndex];

      if (!existingUser.password_hash) {
        return { success: false, error: 'Password record is missing for this account' };
      }

      const isCurrentPasswordValid = await comparePassword(currentPassword, existingUser.password_hash);

      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      const updatedPasswordHash = await hashPassword(newPassword);

      store.users[userIndex] = {
        ...existingUser,
        password_hash: updatedPasswordHash,
        updated_at: new Date().toISOString()
      };

      await writeLocalAuthStore(store);
      return { success: true };
    } catch (error) {
      console.error('Error in local changeUserPassword:', error);
      return { success: false, error: 'Failed to update password' };
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { success: false, error: 'User not found' };
    }

    const currentHash = (data as UserWithPassword).password_hash;

    if (!currentHash) {
      return { success: false, error: 'Password record is missing for this account' };
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, currentHash);

    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const updatedPasswordHash = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: updatedPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: 'Failed to update password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in changeUserPassword:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

/**
 * Update user preferences (categories)
 */
export async function updateUserPreferences(
  userId: string,
  categoryIds: number[]
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      const now = new Date().toISOString();
      const uniqueCategoryIds = [...new Set(categoryIds)];

      store.preferences = store.preferences.filter((pref) => pref.user_id !== userId);

      if (uniqueCategoryIds.length > 0) {
        const nextPrefs: LocalPreference[] = uniqueCategoryIds.map((categoryId) => ({
          user_id: userId,
          category_id: categoryId,
          created_at: now
        }));

        store.preferences.push(...nextPrefs);
      }

      await writeLocalAuthStore(store);
      return true;
    } catch (error) {
      console.error('Error in local updateUserPreferences:', error);
      return false;
    }
  }

  try {
    // First, delete existing preferences
    await supabase.from('user_preferences').delete().eq('user_id', userId);

    // Then insert new preferences
    if (categoryIds.length > 0) {
      const preferencesToInsert = categoryIds.map((categoryId) => ({
        user_id: userId,
        category_id: categoryId,
      }));

      const { error } = await supabase
        .from('user_preferences')
        .insert(preferencesToInsert);

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    return false;
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<number[]> {
  if (!isSupabaseConfigured) {
    try {
      const store = await readLocalAuthStore();
      return store.preferences
        .filter((pref) => pref.user_id === userId)
        .map((pref) => pref.category_id);
    } catch (error) {
      console.error('Error in local getUserPreferences:', error);
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('category_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching preferences:', error);
      return [];
    }

    return data.map((pref) => pref.category_id);
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return [];
  }
}
