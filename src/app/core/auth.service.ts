import { Injectable, signal } from '@angular/core';
import { getSupabaseClient } from './supabase.client';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  email: string;
  accountName: string;
  role: UserRole;
  approved: boolean;
};

export type PendingUser = {
  id: string;
  accountName: string;
  role: UserRole;
};

export type AppUser = {
  id: string;
  accountName: string;
  role: UserRole;
  approved: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<AuthUser | null>(null);
  pending = signal<PendingUser[]>([]);
  users = signal<AppUser[]>([]);
  loading = signal(false);
  private client = getSupabaseClient();

  constructor() {
    if (!this.client) return;
    this.refreshSession();
    this.client.auth.onAuthStateChange(() => {
      this.refreshSession();
    });
  }

  async signIn(accountName: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.client) {
      return { ok: false, error: 'Supabase is not configured.' };
    }
    this.loading.set(true);
    const { data, error } = await this.client.auth.signInWithPassword({
      email: accountName.trim(),
      password,
    });
    if (error || !data.user) {
      this.loading.set(false);
      return { ok: false, error: error?.message || 'Sign in failed.' };
    }
    const profile = await this.fetchProfile(data.user.id);
    this.loading.set(false);
    if (!profile) {
      await this.client.auth.signOut();
      return { ok: false, error: 'Profile not found. Contact admin.' };
    }
    if (!profile.approved) {
      await this.client.auth.signOut();
      return { ok: false, error: 'Account pending approval.' };
    }
    return { ok: true };
  }

  async signUp(payload: { name: string; password: string; role: UserRole }): Promise<{ ok: boolean; error?: string }> {
    if (!this.client) {
      return { ok: false, error: 'Supabase is not configured.' };
    }
    const email = payload.name.trim();
    if (!email || !payload.password) {
      return { ok: false, error: 'Account name and password are required.' };
    }
    const { data, error } = await this.client.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: { account_name: email },
      },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    if (data.session && data.user) {
      await this.insertProfile(data.user.id, email);
      await this.client.auth.signOut();
    }
    return { ok: true };
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
    this.user.set(null);
    this.pending.set([]);
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin' && this.user()?.approved === true;
  }

  isUser(): boolean {
    return this.user()?.role === 'user' && this.user()?.approved === true;
  }

  async approve(accountName: string) {
    if (!this.client) return;
    if (!this.isAdmin()) return;
    await this.client.from('app_users').update({ approved: true }).eq('account_name', accountName);
    await this.refreshPending();
    await this.refreshUsers();
  }

  async approveWithRole(accountName: string, role: UserRole) {
    if (!this.client) return;
    if (!this.isAdmin()) return;
    await this.client
      .from('app_users')
      .update({ approved: true, role })
      .eq('account_name', accountName);
    await this.refreshPending();
    await this.refreshUsers();
  }

  async reject(accountName: string) {
    if (!this.client) return;
    if (!this.isAdmin()) return;
    await this.client.from('app_users').delete().eq('account_name', accountName);
    await this.refreshPending();
    await this.refreshUsers();
  }

  async refreshPending() {
    if (!this.client) return;
    if (!this.isAdmin()) {
      this.pending.set([]);
      return;
    }
    const { data, error } = await this.client
      .from('app_users')
      .select('id, account_name, role')
      .eq('approved', false);
    if (error) {
      this.pending.set([]);
      return;
    }
    this.pending.set(
      (data ?? []).map((row) => ({
        id: row.id,
        accountName: row.account_name,
        role: row.role as UserRole,
      })),
    );
  }

  async refreshUsers() {
    if (!this.client) return;
    if (!this.isAdmin()) {
      this.users.set([]);
      return;
    }
    const { data, error } = await this.client
      .from('app_users')
      .select('id, account_name, role, approved')
      .order('account_name');
    if (error) {
      this.users.set([]);
      return;
    }
    this.users.set(
      (data ?? []).map((row) => ({
        id: row.id,
        accountName: row.account_name,
        role: row.role as UserRole,
        approved: row.approved,
      })),
    );
  }

  async updateRole(accountName: string, role: UserRole) {
    if (!this.client) return;
    if (!this.isAdmin()) return;
    await this.client.from('app_users').update({ role }).eq('account_name', accountName);
    await this.refreshUsers();
  }

  private async refreshSession() {
    if (!this.client) return;
    const { data } = await this.client.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      this.user.set(null);
      this.pending.set([]);
      this.users.set([]);
      return;
    }
    const profile = await this.fetchProfile(session.user.id);
    if (!profile) {
      this.user.set(null);
      return;
    }
    this.user.set(profile);
    await this.refreshPending();
    await this.refreshUsers();
  }

  private async fetchProfile(userId: string): Promise<AuthUser | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('app_users')
      .select('id, account_name, role, approved')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return {
      id: data.id,
      email: data.account_name,
      accountName: data.account_name,
      role: data.role as UserRole,
      approved: data.approved,
    };
  }

  private async insertProfile(userId: string, accountName: string) {
    if (!this.client) return;
    await this.client.from('app_users').insert({
      id: userId,
      account_name: accountName,
      role: 'user',
      approved: false,
    });
  }
}
