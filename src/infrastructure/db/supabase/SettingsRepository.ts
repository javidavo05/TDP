import { createClient } from "@/lib/supabase/server";

export type SettingCategory = "payment" | "email" | "general" | "fiscal" | "printer" | string;

export interface SystemSetting {
  key: string;
  value: any;
  category: SettingCategory;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface ISettingsRepository {
  get(key: string): Promise<SystemSetting | null>;
  getAll(): Promise<SystemSetting[]>;
  getByCategory(category: SettingCategory): Promise<SystemSetting[]>;
  set(key: string, value: any, category: SettingCategory, description?: string): Promise<SystemSetting>;
  delete(key: string): Promise<void>;
}

export class SettingsRepository implements ISettingsRepository {
  async get(key: string): Promise<SystemSetting | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", key)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToSetting(data);
  }

  async getAll(): Promise<SystemSetting[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToSetting(item));
  }

  async getByCategory(category: SettingCategory): Promise<SystemSetting[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("category", category)
      .order("key", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToSetting(item));
  }

  async getSettingsByCategory(category: SettingCategory): Promise<SystemSetting[]> {
    return this.getByCategory(category);
  }

  async set(key: string, value: any, category: SettingCategory, description?: string): Promise<SystemSetting> {
    const supabase = await createClient();
    
    // Get current user for updated_by
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const settingData: any = {
      key,
      value,
      category,
      updated_at: new Date().toISOString(),
    };

    if (description) {
      settingData.description = description;
    }

    if (user) {
      settingData.updated_by = user.id;
    }

    const { data, error } = await supabase
      .from("system_settings")
      .upsert(settingData, { onConflict: "key" })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save setting: ${error.message}`);
    }

    return this.mapToSetting(data);
  }

  async delete(key: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("system_settings").delete().eq("key", key);

    if (error) {
      throw new Error(`Failed to delete setting: ${error.message}`);
    }
  }

  private mapToSetting(data: any): SystemSetting {
    return {
      key: data.key,
      value: data.value,
      category: data.category,
      description: data.description,
      updatedAt: new Date(data.updated_at),
      updatedBy: data.updated_by,
    };
  }
}

