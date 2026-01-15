import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryItem, InventorySaveInput, InventoryService } from './inventory.service';
import { SkuScannerComponent } from './sku-scanner.component';

@Component({
  selector: 'app-inventory-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, SkuScannerComponent],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class InventoryManageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  items = signal<InventoryItem[]>([]);
  edits = signal<Record<string, InventorySaveInput>>({});

  categories = ['Wine', 'Beer', 'Liquor'] as const;
  subcategoriesByCategory: Record<'Wine' | 'Beer' | 'Liquor', string[]> = {
    Wine: ['Sparkling', 'Orange/Skin', 'Rose', 'Red', 'White', 'Dessert', 'Fortified'],
    Beer: [],
    Liquor: [
      'Whiskey - Bourbon',
      'Whiskey - Rye',
      'Whiskey - Scotch',
      'Whiskey - Irish',
      'Whiskey - Japanese',
      'Brandy - Cognac',
      'Brandy - Armagnac',
      'Rum - White',
      'Rum - Dark',
      'Rum - Aged',
      'Gin',
      'Vodka',
      'Tequila - Blanco',
      'Tequila - Reposado',
      'Tequila - Anejo',
      'Mezcal',
      'Liqueur / Cordial',
    ],
  };

  newItem = signal<InventorySaveInput>({
    id: '',
    name: '',
    sku: '',
    shelf: '',
    onHand: 0,
    reorderPoint: 0,
    category: undefined,
    subcategory: undefined,
  });

  filteredEdits = computed(() =>
    this.items().map((item) => this.edits()[item.id] ?? { ...item })
  );

  showScanner = signal(false);

  constructor(private inventory: InventoryService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.inventory.list();
      this.items.set(data);
      const map: Record<string, InventorySaveInput> = {};
      data.forEach((item) => {
        map[item.id] = { ...item };
      });
      this.edits.set(map);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  onScan(value: string) {
    this.newItem.set({ ...this.newItem(), sku: value });
    this.showScanner.set(false);
  }

  toggleScanner() {
    this.showScanner.set(!this.showScanner());
  }

  updateEdit(id: string, partial: Partial<InventorySaveInput>) {
    const current = this.edits()[id];
    if (!current) return;
    this.edits.set({ ...this.edits(), [id]: { ...current, ...partial } });
  }

  onCategoryChange(id: string, category: 'Wine' | 'Beer' | 'Liquor' | '') {
    this.updateEdit(id, {
      category: category || undefined,
      subcategory: category ? undefined : undefined,
    });
  }

  subcategoryOptions(category?: 'Wine' | 'Beer' | 'Liquor' | ''): string[] {
    if (!category) {
      return this.subcategoriesByCategory.Wine.concat(this.subcategoriesByCategory.Beer, this.subcategoriesByCategory.Liquor);
    }
    return this.subcategoriesByCategory[category];
  }

  async saveItem(item: InventorySaveInput) {
    this.error.set(null);
    try {
      await this.inventory.upsert(item);
      await this.load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save item.';
      this.error.set(message);
    }
  }

  async addItem() {
    const item = this.newItem();
    if (!item.name || !item.sku || !item.shelf) {
      this.error.set('Name, SKU, and shelf are required.');
      return;
    }
    this.error.set(null);
    try {
      await this.inventory.upsert({ ...item, id: crypto.randomUUID() });
      this.newItem.set({
        id: '',
        name: '',
        sku: '',
        shelf: '',
        onHand: 0,
        reorderPoint: 0,
        category: undefined,
        subcategory: undefined,
      });
      await this.load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create item.';
      this.error.set(message);
    }
  }

  async deleteItem(id: string) {
    this.error.set(null);
    try {
      await this.inventory.delete(id);
      await this.load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete item.';
      this.error.set(message);
    }
  }

  trackById(_: number, item: InventorySaveInput) {
    return item.id;
  }
}
