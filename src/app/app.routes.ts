import { Routes } from '@angular/router';
import { InventoryManageComponent } from './inventory/manage.component';
import { DrinkSpecComponent } from './drinks/drink-spec.component';

export const routes: Routes = [
  { path: '', component: DrinkSpecComponent },
  { path: 'inventory', component: InventoryManageComponent },
  { path: 'drink-spec', component: DrinkSpecComponent },
  { path: '**', redirectTo: '' },
];
