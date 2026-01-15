import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { InventoryItem, InventoryService } from '../inventory/inventory.service';
import { SkuScannerComponent } from '../inventory/sku-scanner.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, SkuScannerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  items = signal<InventoryItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  search = signal('');
  categoryFilter = signal<'Wine' | 'Beer' | 'Liquor' | ''>('');
  subcategoryFilter = signal<string>('');
  showScanner = signal(false);

  totalOnHand = computed(() => this.items().reduce((sum, item) => sum + item.onHand, 0));
  lowStock = computed(() => this.inventory.lowStock(this.items()));
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
  filteredItems = computed(() => {
    const term = this.search().toLowerCase().trim();
    const category = this.categoryFilter();
    const subcategory = this.subcategoryFilter();

    return this.items().filter((item) => {
      if (category && item.category !== category) return false;
      if (subcategory && item.subcategory !== subcategory) return false;
      if (!term) return true;
      const haystack = `${item.name} ${item.sku} ${item.shelf}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  constructor(private inventory: InventoryService) {}

  async ngOnInit() {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.inventory.list();
      this.items.set(data);
      if (this.categoryFilter()) {
        this.subcategoryFilter.set('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  trackById(_: number, item: InventoryItem): string {
    return item.id;
  }

  categoryChanged(category: 'Wine' | 'Beer' | 'Liquor' | '') {
    this.categoryFilter.set(category);
    if (!category) {
      this.subcategoryFilter.set('');
    } else if (!this.subcategoriesByCategory[category].includes(this.subcategoryFilter())) {
      this.subcategoryFilter.set('');
    }
  }

  onCategoryChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value as
      | 'Wine'
      | 'Beer'
      | 'Liquor'
      | ''
      | undefined;
    this.categoryChanged(value ?? '');
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.search.set(value);
  }

  onSubcategoryChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.subcategoryFilter.set(value);
  }

  toggleScanner() {
    this.showScanner.set(!this.showScanner());
  }

  onScan(value: string) {
    this.search.set(value);
    this.showScanner.set(false);
  }
}
