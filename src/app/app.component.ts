import { CommonModule } from '@angular/common';
import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  appName = 'Inventory Tracker';

  constructor(
    swUpdate: SwUpdate,
    destroyRef: DestroyRef,
    public auth: AuthService,
  ) {
    if (!swUpdate.isEnabled) {
      return;
    }

    swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => {
        window.location.reload();
      });
  }

  signOut() {
    this.auth.signOut();
  }
}
