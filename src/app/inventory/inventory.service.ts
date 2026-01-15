import { Injectable } from '@angular/core';
import { getSupabaseClient } from '../core/supabase.client';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  shelf: string;
  onHand: number;
  reorderPoint: number;
  updatedAt: string;
  category?: 'Wine' | 'Beer' | 'Liquor';
  subcategory?: string;
}

export type InventorySaveInput = Omit<InventoryItem, 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly mockItems: InventoryItem[] = [
  ];

  async list(): Promise<InventoryItem[]> {
    const client = getSupabaseClient();
    if (!client) {
      return this.mockItems;
    }

    const { data, error } = await client
      .from('inventory_items')
      .select('id, name, sku, shelf, on_hand, reorder_point, updated_at, category, subcategory')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Falling back to mock data because Supabase query failed:', error.message);
      return this.mockItems;
    }

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      shelf: row.shelf,
      onHand: row.on_hand ?? 0,
      reorderPoint: row.reorder_point ?? 0,
      updatedAt: row.updated_at ?? '',
      category: row.category ?? undefined,
      subcategory: row.subcategory ?? undefined,
    }));
  }

  lowStock(items: InventoryItem[]): InventoryItem[] {
    return items.filter((item) => item.onHand <= item.reorderPoint);
  }

  async upsert(item: InventorySaveInput): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      const existing = this.mockItems.find((m) => m.id === item.id);
      if (existing) {
        Object.assign(existing, item, { updatedAt: new Date().toISOString() });
      } else {
        this.mockItems.push({ ...item, updatedAt: new Date().toISOString() });
      }
      return;
    }

    const payload = {
      id: item.id || undefined,
      name: item.name,
      sku: item.sku,
      shelf: item.shelf,
      on_hand: item.onHand,
      reorder_point: item.reorderPoint,
      category: item.category ?? null,
      subcategory: item.subcategory ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('inventory_items').upsert(payload);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      const idx = this.mockItems.findIndex((m) => m.id === id);
      if (idx >= 0) {
        this.mockItems.splice(idx, 1);
      }
      return;
    }

    const { error } = await client.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  }
}
