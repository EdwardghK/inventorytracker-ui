import { Routes } from '@angular/router';
import { SignInComponent } from './auth/sign-in.component';
import { authGuard } from './auth.guard';
import { InventoryManageComponent } from './inventory/manage.component';
import { DrinkSpecComponent } from './drinks/drink-spec.component';

export const routes: Routes = [
  { path: '', component: DrinkSpecComponent },
  { path: 'inventory', component: InventoryManageComponent, canActivate: [authGuard] },
  { path: 'drink-spec', component: DrinkSpecComponent },
  { path: 'signin', component: SignInComponent },
  { path: '**', redirectTo: '' },
];
