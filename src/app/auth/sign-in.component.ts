import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth">
      <header class="auth__head">
        <h1>Sign in</h1>
        <p>Access inventory actions with your role.</p>
      </header>

      <div class="auth__grid">
        <div class="panel">
          <h2>Sign in</h2>
          <label>
            <span>Account name</span>
            <input [(ngModel)]="loginName" placeholder="Account name" />
          </label>
          <label>
            <span>Password</span>
            <input [(ngModel)]="loginPassword" placeholder="Password" type="password" />
          </label>
          <button class="primary" type="button" (click)="handleSignIn()">Sign in</button>
          <p class="error" *ngIf="loginError()">{{ loginError() }}</p>
          <p class="muted" *ngIf="auth.user">
            Signed in as <strong>{{ auth.user.name }}</strong> ({{ auth.user.role }}).
          </p>
          <button class="ghost" type="button" (click)="handleSignOut()" *ngIf="auth.user">Sign out</button>
          <button class="ghost" type="button" (click)="showCreate.set(true)">Create account</button>
        </div>

        <div class="panel" *ngIf="showCreate()">
          <h2>Create New Account</h2>
          <label>
            <span>Account name</span>
            <input [(ngModel)]="signupName" placeholder="Account name" />
          </label>
          <label>
            <span>Password</span>
            <input [(ngModel)]="signupPassword" placeholder="Password" type="password" />
          </label>
          <button class="primary" type="button" (click)="handleSignUp()">Create account</button>
          <p class="muted" *ngIf="!signupSuccess()">New accounts require admin approval.</p>
          <p class="error" *ngIf="signupError()">{{ signupError() }}</p>
          <p class="success" *ngIf="signupSuccess()">{{ signupSuccess() }}</p>
          <button class="ghost" type="button" (click)="showCreate.set(false)">Close</button>
        </div>
      </div>

      <section class="panel approvals" *ngIf="isAdmin()">
        <h2>Pending approvals</h2>
        <p class="muted" *ngIf="pending().length === 0">No pending accounts.</p>
        <div class="approval" *ngFor="let account of pending()">
          <div>
            <strong>{{ account.name }}</strong>
            <span class="pill">{{ account.role }}</span>
          </div>
          <div class="approval__actions">
            <button class="primary" type="button" (click)="approve(account.name)">Approve</button>
            <button class="ghost" type="button" (click)="reject(account.name)">Reject</button>
          </div>
        </div>
      </section>
    </section>
  `,
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  loginName = '';
  loginPassword = '';
  signupName = '';
  signupPassword = '';
  loginError = signal('');
  signupError = signal('');
  signupSuccess = signal('');
  showCreate = signal(false);

  pending = computed(() => this.auth.pending);

  constructor(public auth: AuthService, private router: Router) {}

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  handleSignIn() {
    this.loginError.set('');
    const result = this.auth.signIn(this.loginName, this.loginPassword);
    if (!result.ok) {
      this.loginError.set(result.error || 'Sign in failed.');
      return;
    }
    this.loginName = '';
    this.loginPassword = '';
    this.router.navigateByUrl('/');
  }

  handleSignOut() {
    this.auth.signOut();
  }

  handleSignUp() {
    this.signupError.set('');
    this.signupSuccess.set('');
    const result = this.auth.signUp({
      name: this.signupName,
      password: this.signupPassword,
      role: 'user',
    });
    if (!result.ok) {
      this.signupError.set(result.error || 'Request failed.');
      return;
    }
    this.signupSuccess.set('Request submitted. Awaiting approval.');
    this.signupName = '';
    this.signupPassword = '';
    this.showCreate.set(false);
  }

  approve(name: string) {
    this.auth.approve(name);
  }

  reject(name: string) {
    this.auth.reject(name);
  }
}
