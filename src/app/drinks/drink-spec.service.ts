import { Injectable } from '@angular/core';
import { getSupabaseClient } from '../core/supabase.client';

export interface DrinkRecord {
  id: string;
  name: string;
  kind: 'Cocktail' | 'Mocktail';
  type?: 'Cocktail' | 'Mocktail';
  build: string;
  glass: string;
  garnish: string;
  specs: string[];
  available: boolean;
  imageUrl?: string | null;
}

export type DrinkUpsertInput = Partial<DrinkRecord> & {
  name: string;
  build: string;
  glass: string;
  garnish: string;
  specs: string[];
  kind: 'Cocktail' | 'Mocktail';
};

@Injectable({ providedIn: 'root' })
export class DrinkSpecService {
  private readonly table = 'drink_specs';
  private readonly localStorageKey = 'drink-specs-local';

  async list(): Promise<DrinkRecord[]> {
    const client = getSupabaseClient();
    if (!client) {
      return this.loadLocal();
    }

    const { data, error } = await client
      .from(this.table)
      .select('id, name, kind, build, glass, garnish, specs, available, image_url')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load drinks from Supabase:', error.message);
      return this.loadLocal();
    }

    return (
      data?.map((row: any) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        type: row.kind, // keep UI compatibility
        build: row.build,
        glass: row.glass,
        garnish: row.garnish,
        specs: row.specs ?? [],
        available: row.available ?? true,
        imageUrl: row.image_url ?? undefined,
      })) ?? []
    );
  }

  async upsert(payload: DrinkUpsertInput): Promise<DrinkRecord> {
    const client = getSupabaseClient();
    if (!client) {
      return this.upsertLocal(payload);
    }

    const { data, error } = await client
      .from(this.table)
      .upsert({
        id: payload.id ?? undefined,
        name: payload.name,
        kind: payload.kind,
        build: payload.build,
        glass: payload.glass,
        garnish: payload.garnish,
        specs: payload.specs,
        available: payload.available ?? true,
        image_url: payload.imageUrl ?? null,
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase upsert failed; falling back to local storage.', error.message);
      return this.upsertLocal(payload);
    }

    return {
      id: data.id,
      name: data.name,
      kind: data.kind,
      type: data.kind,
      build: data.build,
      glass: data.glass,
      garnish: data.garnish,
      specs: data.specs ?? [],
      available: data.available ?? true,
      imageUrl: data.image_url ?? undefined,
    };
  }

  async delete(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      this.deleteLocal(id);
      return;
    }
    const { error } = await client.from(this.table).delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete failed; falling back to local storage.', error.message);
      this.deleteLocal(id);
    }
  }

  async updateAvailability(id: string, available: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      this.updateAvailabilityLocal(id, available);
      return;
    }
    const { error } = await client.from(this.table).update({ available }).eq('id', id);
    if (error) {
      console.warn('Supabase availability update failed; falling back to local storage.', error.message);
      this.updateAvailabilityLocal(id, available);
    }
  }

  async updateImage(id: string, imageUrl: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      this.updateImageLocal(id, imageUrl);
      return;
    }
    const { error } = await client.from(this.table).update({ image_url: imageUrl }).eq('id', id);
    if (error) {
      console.warn('Supabase image update failed; falling back to local storage.', error.message);
      this.updateImageLocal(id, imageUrl);
    }
  }

  private upsertLocal(payload: DrinkUpsertInput): DrinkRecord {
    const list = this.loadLocal();
    const id = payload.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: DrinkRecord = {
      id,
      name: payload.name,
      kind: payload.kind,
      type: payload.kind,
      build: payload.build,
      glass: payload.glass,
      garnish: payload.garnish,
      specs: payload.specs ?? [],
      available: payload.available ?? true,
      imageUrl: payload.imageUrl ?? null,
    };
    const next = list.filter((d) => d.id !== id);
    next.push(record);
    this.saveLocal(next);
    return record;
  }

  private deleteLocal(id: string) {
    const next = this.loadLocal().filter((d) => d.id !== id);
    this.saveLocal(next);
  }

  private updateAvailabilityLocal(id: string, available: boolean) {
    const next = this.loadLocal().map((d) => (d.id === id ? { ...d, available } : d));
    this.saveLocal(next);
  }

  private updateImageLocal(id: string, imageUrl: string) {
    const next = this.loadLocal().map((d) => (d.id === id ? { ...d, imageUrl } : d));
    this.saveLocal(next);
  }

  private loadLocal(): DrinkRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.localStorageKey);
      if (!raw) return [];
      return JSON.parse(raw) as DrinkRecord[];
    } catch (err) {
      console.warn('Failed to load local drink specs', err);
      return [];
    }
  }

  private saveLocal(list: DrinkRecord[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to save local drink specs', err);
    }
  }
}
