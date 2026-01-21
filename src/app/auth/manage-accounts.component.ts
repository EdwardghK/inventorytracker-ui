import { CommonModule } from '@angular/common';
import { Component, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, PendingUser, UserRole } from '../core/auth.service';

@Component({
  selector: 'app-manage-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="accounts">
      <header class="accounts__head">
        <h1>Manage Accounts</h1>
        <p>Approve new users and manage roles.</p>
      </header>

      <section class="panel approvals" *ngIf="pending().length > 0">
        <h2>Pending approvals</h2>
        <div class="approval" *ngFor="let account of pending()">
          <div class="approval__info">
            <strong>{{ account.accountName }}</strong>
            <span class="pill">Pending</span>
          </div>
          <div class="approval__actions">
            <select [(ngModel)]="pendingRoles[account.accountName]">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button
              class="primary"
              type="button"
              (click)="approve(account)"
            >
              Approve
            </button>
            <button class="ghost" type="button" (click)="reject(account)">Reject</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>All users</h2>
        <div class="user-row" *ngFor="let user of users()">
          <div class="user-name">
            <strong>{{ user.accountName }}</strong>
            <span class="pill" *ngIf="!user.approved">Pending</span>
          </div>
          <div class="user-role">
            <select [(ngModel)]="user.role" (ngModelChange)="updateRole(user.accountName, $event)">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </section>
    </section>
  `,
  styleUrl: './manage-accounts.component.scss',
})
export class ManageAccountsComponent {
  pending = computed(() => this.auth.pending());
  users = computed(() => this.auth.users());
  pendingRoles: Record<string, UserRole> = {};

  constructor(private auth: AuthService) {
    effect(() => {
      const pending = this.pending();
      pending.forEach((item) => {
        if (!this.pendingRoles[item.accountName]) {
          this.pendingRoles[item.accountName] = 'user';
        }
      });
    });
  }

  approve(account: PendingUser) {
    const role = this.pendingRoles[account.accountName] || 'user';
    this.auth.approveWithRole(account.accountName, role);
  }

  

  reject(account: PendingUser) {
    this.auth.reject(account.accountName);
  }

  updateRole(accountName: string, role: UserRole) {
    this.auth.updateRole(accountName, role);
  }
}
