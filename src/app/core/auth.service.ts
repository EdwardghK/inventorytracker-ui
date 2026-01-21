import { Injectable, signal } from '@angular/core';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  name: string;
  password: string;
  role: UserRole;
  approved: boolean;
};

type AuthState = {
  currentUser: AuthUser | null;
  users: AuthUser[];
  pending: AuthUser[];
};

const STORAGE_KEY = 'inventory-auth-state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private state = signal<AuthState>({
    currentUser: null,
    users: [],
    pending: [],
  });

  currentUser = this.state.asReadonly();

  constructor() {
    this.load();
    this.ensureAdminSeed();
  }

  get user(): AuthUser | null {
    return this.state().currentUser;
  }

  get pending(): AuthUser[] {
    return this.state().pending;
  }

  signIn(name: string, password: string): { ok: boolean; error?: string } {
    const user = this.state().users.find(
      (item) => item.name.toLowerCase() === name.toLowerCase() && item.password === password,
    );
    if (!user) {
      return { ok: false, error: 'Invalid credentials or account not approved.' };
    }
    this.updateState({ currentUser: user });
    return { ok: true };
  }

  signOut() {
    this.updateState({ currentUser: null });
  }

  signUp(request: { name: string; password: string; role: UserRole }): { ok: boolean; error?: string } {
    const name = request.name.trim();
    if (!name || !request.password) {
      return { ok: false, error: 'Name and password are required.' };
    }
    if (this.findUser(name)) {
      return { ok: false, error: 'Account already exists.' };
    }
    const pendingUser: AuthUser = {
      name,
      password: request.password,
      role: request.role,
      approved: false,
    };
    const pending = [...this.state().pending, pendingUser];
    this.updateState({ pending });
    return { ok: true };
  }

  approve(name: string) {
    const pendingUser = this.state().pending.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!pendingUser) return;
    const approved: AuthUser = { ...pendingUser, approved: true };
    const users = [...this.state().users, approved];
    const pending = this.state().pending.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
    this.updateState({ users, pending });
  }

  reject(name: string) {
    const pending = this.state().pending.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
    this.updateState({ pending });
  }

  isAdmin(): boolean {
    return this.state().currentUser?.role === 'admin';
  }

  isUser(): boolean {
    return this.state().currentUser?.role === 'user';
  }

  private findUser(name: string): AuthUser | undefined {
    return (
      this.state().users.find((item) => item.name.toLowerCase() === name.toLowerCase()) ||
      this.state().pending.find((item) => item.name.toLowerCase() === name.toLowerCase())
    );
  }

  private ensureAdminSeed() {
    const existingAdmin = this.state().users.find((item) => item.role === 'admin');
    if (existingAdmin) return;
    const seedAdmin: AuthUser = {
      name: 'admin',
      password: 'admin123',
      role: 'admin',
      approved: true,
    };
    const users = [...this.state().users, seedAdmin];
    this.updateState({ users });
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthState;
      this.state.set({
        currentUser: parsed.currentUser ?? null,
        users: parsed.users ?? [],
        pending: parsed.pending ?? [],
      });
    } catch {
      this.state.set({ currentUser: null, users: [], pending: [] });
    }
  }

  private updateState(partial: Partial<AuthState>) {
    const next = { ...this.state(), ...partial };
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
