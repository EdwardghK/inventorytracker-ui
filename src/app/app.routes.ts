import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { InventoryManageComponent } from './inventory/manage.component';
import { DrinkSpecComponent } from './drinks/drink-spec.component';

export const routes: Routes = [
  { path: '', component: DrinkSpecComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'inventory', component: InventoryManageComponent },
  { path: 'drink-spec', component: DrinkSpecComponent },
  { path: '**', redirectTo: '' },
];
