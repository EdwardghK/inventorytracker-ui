import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrinkRecord, DrinkSpecService, DrinkUpsertInput } from './drink-spec.service';
import { AuthService } from '../core/auth.service';

type Drink = DrinkRecord;
type IngredientDraft = { amount: string | number; unit: string; name: string };
type DrinkEditDraft = {
  id: string;
  name: string;
  type: 'Cocktail' | 'Mocktail';
  build: string;
  glass: string;
  garnish: string;
  ingredients: IngredientDraft[];
};

@Component({
  selector: 'app-drink-spec',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Cocktail & Mocktail Specs</h1>
          <p class="lede">Alphabetized list with availability toggles and quick search.</p>
        </div>
        <div class="filters">
          <input
            type="search"
            placeholder="Search by name or ingredient"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event || '')"
          />
          <label class="toggle">
            <input type="checkbox" [checked]="showUnavailable()" (change)="toggleShowUnavailable($event)" />
            <span>Show unavailable</span>
          </label>
 
        </div>
      </header>

      <div class="sections">
        <section class="section" *ngFor="let section of sections()" [class.section--cocktails]="section.title === 'Cocktails'">
          <header class="section__head">
            <p class="label">{{ section.title }}</p>
            <span class="pill">{{ section.drinks.length }} drinks</span>
          </header>

          <div class="cards">
            <article class="card" *ngFor="let drink of section.drinks" (click)="toggleDetails(drink)">
              <div class="card__body" [class.compact]="!isExpanded(drink)">
                <div class="card__main">
                  <div class="card__title">
                    <h3>{{ drink.name }}</h3>
                    <p class="build" *ngIf="isExpanded(drink)">{{ drink.build }}</p>
                  </div>
                  <div class="availability" *ngIf="isExpanded(drink)">
                    <span class="pill" [class.unavailable]="!isAvailable(drink)">
                      {{ isAvailable(drink) ? 'Available' : 'Unavailable' }}
                    </span>
                    <button
                      type="button"
                      *ngIf="canEdit()"
                      (click)="toggleAvailability(drink); $event.stopPropagation()"
                    >
                      Mark as {{ isAvailable(drink) ? 'Unavailable' : 'Available' }}
                    </button>
                  </div>
                  <div class="details" [class.open]="isExpanded(drink)">
                    <div class="meta">
                      <div>
                        <p class="label">Glass</p>
                        <p>{{ drink.glass }}</p>
                      </div>
                      <div>
                        <p class="label">Garnish</p>
                        <p>{{ drink.garnish }}</p>
                      </div>
                    </div>
                    <div class="specs">
                      <p class="label">Specs</p>
                      <ul>
                        <li *ngFor="let line of drink.specs">{{ line }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="card__side" *ngIf="isExpanded(drink)">
                  <button
                    class="image-placeholder"
                    type="button"
                    *ngIf="isExpanded(drink)"
                    [class.has-image]="imageSrc(drink)"
                    [style.backgroundImage]="imageSrc(drink) ? 'url(' + imageSrc(drink) + ')' : 'none'"
                    (click)="handleImageAction(filePicker, drink, $event)"
                  >
                    <ng-container *ngIf="imageSrc(drink)">View image</ng-container>
                    <ng-container *ngIf="!imageSrc(drink) && canEdit()">Add image</ng-container>
                    <ng-container *ngIf="!imageSrc(drink) && !canEdit()">No image</ng-container>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden-input"
                    #filePicker
                    [disabled]="!isExpanded(drink) || !canEdit()"
                    (click)="$event.stopPropagation()"
                    (change)="onImageSelected($event, drink); $event.stopPropagation()"
                  />
                  <div class="card-actions" *ngIf="isExpanded(drink)">
                    <button
                      class="ghost"
                      type="button"
                      (click)="openImagePicker(filePicker, $event)"
                      *ngIf="imageSrc(drink) && canEdit()"
                    >
                      Update image
                    </button>
                    <button class="ghost" type="button" *ngIf="canEdit()" (click)="startInlineEdit(drink, $event)">
                      Edit
                    </button>
                    <button
                      class="ghost"
                      type="button"
                      *ngIf="canDelete()"
                      (click)="deleteDrink(drink); $event.stopPropagation()"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div
                class="edit-form"
                *ngIf="canEdit() && isEditing(drink) && editDraft(drink) as edit"
                (click)="$event.stopPropagation()"
              >
                <div class="edit-grid">
                  <label>
                    <span>Name</span>
                    <input [(ngModel)]="edit.name" />
                  </label>
                  <label>
                    <span>Type</span>
                    <select [(ngModel)]="edit.type">
                      <option value="Cocktail">Cocktail</option>
                      <option value="Mocktail">Mocktail</option>
                    </select>
                  </label>
                  <label>
                    <span>Build</span>
                    <input [(ngModel)]="edit.build" />
                  </label>
                  <label>
                    <span>Glass</span>
                    <input [(ngModel)]="edit.glass" />
                  </label>
                  <label>
                    <span>Garnish</span>
                    <input [(ngModel)]="edit.garnish" />
                  </label>
                  <div class="specs-field">
                    <span>Ingredients</span>
                    <div class="ingredients">
                      <div class="ingredient-row" *ngFor="let ingredient of edit.ingredients; let i = index">
                        <input
                          class="ingredient-oz"
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="0"
                          [(ngModel)]="ingredient.amount"
                        />
                        <select class="ingredient-unit" [(ngModel)]="ingredient.unit">
                          <option value="oz">oz</option>
                          <option value="dash">dash</option>
                          <option value="dashes">dashes</option>
                          <option value="splash">splash</option>
                          <option value="splashes">splashes</option>
                          <option value="top up">top up</option>
                        </select>
                        <input class="ingredient-name" placeholder="Ingredient" [(ngModel)]="ingredient.name" />
                        <button type="button" class="ghost" (click)="removeInlineIngredient(drink, i, $event)">Remove</button>
                      </div>
                      <button type="button" class="ghost add-ingredient" (click)="addInlineIngredient(drink, $event)">
                        Add ingredient
                      </button>
                    </div>
                  </div>
                </div>
                <div class="edit-actions">
                  <button class="primary" type="button" (click)="saveInlineEdit(drink, $event)">Save</button>
                  <button class="ghost" type="button" (click)="cancelInlineEdit(drink, $event)">Cancel</button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      <details class="add-card" *ngIf="canAdd()" [open]="addOpen()" (toggle)="addOpen.set(addDetails.open)" #addDetails>
        <summary class="add-card__head">
          <h2>Add New Drink</h2>
        </summary>
        <div class="add-grid">
          <label>
            <span>Name</span>
            <input [(ngModel)]="draft.name" />
          </label>
          <label>
            <span>Type</span>
            <select [(ngModel)]="draft.type">
              <option value="Cocktail">Cocktail</option>
              <option value="Mocktail">Mocktail</option>
            </select>
          </label>
          <label>
            <span>Build (ingredients summary)</span>
            <input [(ngModel)]="draft.build" />
          </label>
          <label>
            <span>Glass</span>
            <input [(ngModel)]="draft.glass" />
          </label>
          <label>
            <span>Garnish</span>
            <input [(ngModel)]="draft.garnish" />
          </label>
          <div class="specs-field">
            <span>Ingredients</span>
            <div class="ingredients">
              <div class="ingredient-row" *ngFor="let ingredient of draft.ingredients; let i = index">
                <input
                  class="ingredient-oz"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="0"
                  [(ngModel)]="ingredient.amount"
                />
                <select class="ingredient-unit" [(ngModel)]="ingredient.unit">
                  <option value="oz">oz</option>
                  <option value="dash">dash</option>
                  <option value="dashes">dashes</option>
                  <option value="splash">splash</option>
                  <option value="splashes">splashes</option>
                  <option value="top up">top up w/</option>
                </select>
                <input class="ingredient-name" placeholder="Ingredient" [(ngModel)]="ingredient.name" />
                <button type="button" class="ghost" (click)="removeIngredient(i)">Remove</button>
              </div>
              <button type="button" class="ghost add-ingredient" (click)="addIngredient()">Add ingredient</button>
            </div>
          </div>
        </div>
        <div class="add-actions">
          <button class="primary" type="button" (click)="saveDraft()">
            {{ draft.id ? 'Save changes' : 'Add drink' }}
          </button>
          <button class="ghost" type="button" (click)="resetDraft()" *ngIf="draft.id">Cancel edit</button>
        </div>
      </details>

      <div class="image-modal" *ngIf="previewOpen()" (click)="closePreview()">
        <div class="image-modal__panel" (click)="$event.stopPropagation()">
          <header>
            <h3>{{ previewName() }}</h3>
            <button type="button" class="ghost" (click)="closePreview()">Close</button>
          </header>
          <img class="image-modal__img" [src]="previewImage()" [alt]="previewName()" />
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./drink-spec.component.scss'],
})
export class DrinkSpecComponent {
  searchTerm = signal('');
  showUnavailable = signal(true);
 
  addOpen = signal(false);
  previewOpen = signal(false);
  previewImage = signal('');
  previewName = signal('');
  availability = signal<Record<string, boolean>>({});
  images = signal<Record<string, string>>({});
  expanded = signal<Record<string, boolean>>({});
  inlineEditing = signal<Record<string, boolean>>({});
  inlineDrafts = signal<Record<string, DrinkEditDraft>>({});
  private readonly imageStorageKey = 'drink-spec-images';

  drinks = signal<Drink[]>([]);
  draft: {
    id?: string;
    name: string;
    type: 'Cocktail' | 'Mocktail';
    build: string;
    glass: string;
    garnish: string;
    ingredients: IngredientDraft[];
  } = {
    id: undefined,
    name: '',
    type: 'Cocktail',
    build: '',
    glass: '',
    garnish: '',
    ingredients: [{ amount: '', unit: 'oz', name: '' }],
  };

  sections = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const avail = this.availability();
    const filtered = this.drinks()
      .filter((drink) => {
        const available = avail[this.key(drink)] ?? true;
        if (!this.showUnavailable() && !available) return false;
        if (!term) return true;
        const haystack = `${drink.name} ${drink.build} ${drink.specs.join(' ')}`.toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      { title: 'Cocktails', drinks: filtered.filter((d) => d.type === 'Cocktail') },
      { title: 'Mocktails', drinks: filtered.filter((d) => d.type === 'Mocktail') },
    ];
  });

  toggleShowUnavailable(event: Event) {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.showUnavailable.set(checked);
  }

  isAvailable(drink: Drink): boolean {
    return this.availability()[this.key(drink)] ?? true;
  }

  toggleAvailability(drink: Drink) {
    if (!this.canEdit()) {
      return;
    }
    const next = { ...this.availability() };
    const key = this.key(drink);
    const newVal = !(next[key] ?? true);
    next[key] = newVal;
    this.availability.set(next);
    this.drinkSvc
      .updateAvailability(drink.id, newVal)
      .catch((err: unknown) => console.warn('Availability update failed', err));
  }

  toggleDetails(drink: Drink) {
    const next = { ...this.expanded() };
    const key = drink.id;
    next[key] = !(next[key] ?? false);
    this.expanded.set(next);
  }

  isExpanded(drink: Drink): boolean {
    return this.expanded()[drink.id] ?? false;
  }

  openImagePicker(picker: HTMLInputElement, event: Event) {
    event.stopPropagation();
    picker.removeAttribute('capture');
    picker.click();
  }

  saveDraft() {
    if (!this.canAdd()) {
      return;
    }
    if (!this.draft.name.trim()) {
      return;
    }
    const specs = this.buildSpecsFromIngredients(this.draft.ingredients);
    const payload: DrinkUpsertInput = {
      id: this.draft.id,
      name: this.draft.name.trim(),
      kind: this.draft.type,
      build: this.draft.build.trim(),
      glass: this.draft.glass.trim(),
      garnish: this.draft.garnish.trim(),
      specs,
      available: true,
    };
    this.drinkSvc
      .upsert(payload)
      .then((saved: Drink) => {
        this.drinks.update((list) => {
          const others = list.filter((d) => d.id !== saved.id);
          return [...others, { ...saved, type: saved.kind }];
        });
        this.resetDraft();
      })
      .catch((err: unknown) => {
        console.warn('Save failed', err);
      });
  }

  startEdit(drink: Drink) {
    this.addOpen.set(true);
    this.draft = {
      id: drink.id,
      name: drink.name,
      type: drink.type ?? drink.kind ?? 'Cocktail',
      build: drink.build,
      glass: drink.glass,
      garnish: drink.garnish,
      ingredients: this.parseIngredients(drink.specs),
    };
  }

  deleteDrink(drink: Drink) {
    if (!this.canDelete()) {
      return;
    }
    this.drinkSvc
      .delete(drink.id)
      .catch((err: unknown) => console.warn('Delete failed', err))
      .finally(() => {
        this.drinks.update((list) => list.filter((d) => d.id !== drink.id));
        this.availability.update((map) => {
          const next = { ...map };
          delete next[this.key(drink)];
          return next;
        });
        this.removeImage(drink);
        if (this.draft.id === drink.id) {
          this.resetDraft();
        }
      });
  }

  resetDraft() {
    this.draft = {
      id: undefined,
      name: '',
      type: 'Cocktail',
      build: '',
      glass: '',
      garnish: '',
      ingredients: [{ amount: '', unit: 'oz', name: '' }],
    };
  }

  private key(drink: Drink) {
    return drink.id ?? `${drink.type}-${drink.name}`;
  }

  startInlineEdit(drink: Drink, event: Event) {
    event.stopPropagation();
    if (!this.canEdit()) return;
    if (!drink.id) return;
    const key = this.key(drink);
    this.inlineEditing.update((map) => ({ ...map, [key]: true }));
    this.inlineDrafts.update((map) => ({
      ...map,
      [key]: {
        id: drink.id,
        name: drink.name,
        type: drink.type ?? drink.kind ?? 'Cocktail',
        build: drink.build,
        glass: drink.glass,
        garnish: drink.garnish,
        ingredients: this.parseIngredients(drink.specs),
      },
    }));
    this.expanded.update((map) => ({ ...map, [key]: true }));
  }

  isEditing(drink: Drink): boolean {
    return this.inlineEditing()[this.key(drink)] ?? false;
  }

  editDraft(drink: Drink): DrinkEditDraft | undefined {
    return this.inlineDrafts()[this.key(drink)];
  }

  cancelInlineEdit(drink: Drink, event: Event) {
    event.stopPropagation();
    const key = this.key(drink);
    this.inlineEditing.update((map) => {
      const next = { ...map };
      delete next[key];
      return next;
    });
    this.inlineDrafts.update((map) => {
      const next = { ...map };
      delete next[key];
      return next;
    });
  }

  saveInlineEdit(drink: Drink, event: Event) {
    event.stopPropagation();
    if (!this.canEdit()) return;
    const key = this.key(drink);
    const draft = this.inlineDrafts()[key];
    if (!draft || !draft.name.trim()) return;
    const specs = this.buildSpecsFromIngredients(draft.ingredients);
    const payload: DrinkUpsertInput = {
      id: draft.id,
      name: draft.name.trim(),
      kind: draft.type,
      build: draft.build.trim(),
      glass: draft.glass.trim(),
      garnish: draft.garnish.trim(),
      specs,
      available: this.isAvailable(drink),
    };
    this.drinkSvc
      .upsert(payload)
      .then((saved: Drink) => {
        this.drinks.update((list) => {
          const others = list.filter((d) => d.id !== saved.id);
          return [...others, { ...saved, type: saved.kind }];
        });
        this.cancelInlineEdit(drink, event);
      })
      .catch((err: unknown) => {
        console.warn('Inline save failed', err);
      });
  }

  addInlineIngredient(drink: Drink, event: Event) {
    event.stopPropagation();
    if (!this.canEdit()) return;
    const key = this.key(drink);
    this.inlineDrafts.update((map) => {
      const current = map[key];
      if (!current) return map;
      const next = {
        ...current,
        ingredients: [...current.ingredients, { amount: '', unit: 'oz', name: '' }],
      };
      return { ...map, [key]: next };
    });
  }

  removeInlineIngredient(drink: Drink, index: number, event: Event) {
    event.stopPropagation();
    if (!this.canEdit()) return;
    const key = this.key(drink);
    this.inlineDrafts.update((map) => {
      const current = map[key];
      if (!current) return map;
      const ingredients = [...current.ingredients];
      if (ingredients.length === 1) {
        ingredients[0] = { amount: '', unit: 'oz', name: '' };
      } else {
        ingredients.splice(index, 1);
      }
      return { ...map, [key]: { ...current, ingredients } };
    });
  }

  addIngredient() {
    if (!this.canAdd()) return;
    this.draft.ingredients.push({ amount: '', unit: 'oz', name: '' });
  }

  removeIngredient(index: number) {
    if (!this.canAdd()) return;
    if (this.draft.ingredients.length === 1) {
      this.draft.ingredients[0] = { amount: '', unit: 'oz', name: '' };
      return;
    }
    this.draft.ingredients.splice(index, 1);
  }

  private buildSpecsFromIngredients(ingredients: IngredientDraft[]): string[] {
    return ingredients
      .map((item) => {
        const amount = String(item.amount ?? '').trim();
        const name = item.name.trim();
        const unit = item.unit?.trim() || 'oz';
        if (!amount && unit !== 'top up') return '';
        if (!name) return '';
        if (unit === 'top up') {
          return `top up ${name}`;
        }
        return `${amount} ${unit} ${name}`;
      })
      .filter(Boolean);
  }

  private parseIngredients(specs: string[]): IngredientDraft[] {
    const parsed = specs
      .map((line) => {
        const trimmed = line.trim();
        const topUpMatch = trimmed.match(/^top\s*up\s+(.+)$/i);
        if (topUpMatch) {
          return { amount: '', unit: 'top up', name: topUpMatch[1].trim() };
        }
        const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(oz|dash|dashes|splash|splashes)\s*(.+)$/i);
        if (!match) {
          return { amount: '', unit: 'oz', name: trimmed };
        }
        return { amount: match[1], unit: match[2].toLowerCase(), name: match[3].trim() };
      })
      .filter((item) => item.name);
    return parsed.length ? parsed : [{ amount: '', unit: 'oz', name: '' }];
  }

  canAdd(): boolean {
    return this.auth.isAdmin() || this.auth.isUser();
  }

  canEdit(): boolean {
    return this.auth.isAdmin() || this.auth.isUser();
  }

  canDelete(): boolean {
    return this.auth.isAdmin();
  }

  constructor(private drinkSvc: DrinkSpecService, private auth: AuthService) {
    this.loadImagesFromStorage();
    this.loadFromDb();
  }

  private async loadFromDb() {
    try {
      const records = await this.drinkSvc.list();
      const availabilityMap: Record<string, boolean> = {};
      const imageMap: Record<string, string> = { ...this.images() };

      records.forEach((drink) => {
        const key = this.key(drink);
        availabilityMap[key] = drink.available ?? true;
        if (drink.imageUrl) {
          imageMap[drink.id] = drink.imageUrl;
        }
      });

      this.drinks.set(records.map((r) => ({ ...r, type: r.type ?? r.kind })));
      this.availability.set(availabilityMap);
      this.images.set(imageMap);
    } catch (err: unknown) {
      console.warn('Failed to load drinks from Supabase', err);
    }
  }

  imageSrc(drink: Drink): string | undefined {
    return this.images()[drink.id] ?? drink.imageUrl ?? undefined;
  }

  openImagePreview(drink: Drink, event: Event) {
    event.stopPropagation();
    const src = this.imageSrc(drink);
    if (!src) return;
    this.previewImage.set(src);
    this.previewName.set(drink.name);
    this.previewOpen.set(true);
  }

  closePreview() {
    this.previewOpen.set(false);
    this.previewImage.set('');
    this.previewName.set('');
  }

  handleImageAction(picker: HTMLInputElement, drink: Drink, event: Event) {
    if (this.imageSrc(drink)) {
      this.openImagePreview(drink, event);
      return;
    }
    if (!this.canEdit()) {
      event.stopPropagation();
      return;
    }
    this.openImagePicker(picker, event);
  }

  async onImageSelected(event: Event, drink: Drink) {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const dataUrl = await this.readAsDataUrl(file);
    const existing = this.images()[drink.id];
    if (existing && existing.startsWith('blob:')) {
      URL.revokeObjectURL(existing);
    }
    this.images.update((map: Record<string, string>) => ({ ...map, [drink.id]: dataUrl }));
    this.drinkSvc.updateImage(drink.id, dataUrl).catch((err: unknown) => console.warn('Image update failed', err));
    this.persistImages();
    (event.target as HTMLInputElement).value = '';
  }

  private removeImage(drink: Drink) {
    const existing = this.images()[drink.id];
    if (existing && existing.startsWith('blob:')) {
      URL.revokeObjectURL(existing);
    }
    this.images.update((map: Record<string, string>) => {
      const next = { ...map };
      delete next[drink.id];
      return next;
    });
    this.persistImages();
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private loadImagesFromStorage() {
    try {
      const raw = localStorage.getItem(this.imageStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      this.images.set(parsed);
    } catch (err) {
      console.warn('Failed to load stored images', err);
    }
  }

  private persistImages() {
    try {
      localStorage.setItem(this.imageStorageKey, JSON.stringify(this.images()));
    } catch (err) {
      console.warn('Failed to persist images', err);
    }
  }
}
