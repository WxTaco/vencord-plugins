/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VencordStorage, MigrationData } from "./VencordStorage";
import { EmbedTemplate } from "./templateManager";

export interface MigrationResult {
    success: boolean;
    version: string;
    migratedData: {
        templates: number;
        settings: number;
        userData: boolean;
    };
    errors: string[];
    warnings: string[];
}

export interface LegacyTemplate {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    embedData: any;
    isBuiltIn?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Migration utilities for upgrading data between plugin versions
 */
export class MigrationUtils {
    private static readonly CURRENT_VERSION = "2.0.0";
    private static readonly LEGACY_KEYS = [
        "embed-builder-templates",
        "embed-tester-templates", 
        "vencord-embed-templates",
        "embed-builder-settings",
        "embed-builder-favorites"
    ];

    /**
     * Perform complete migration from legacy storage to DataStore
     */
    static async performFullMigration(): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            version: this.CURRENT_VERSION,
            migratedData: {
                templates: 0,
                settings: 0,
                userData: false
            },
            errors: [],
            warnings: []
        };

        try {
            console.log("🌸 Starting full migration to DataStore...");

            // Check if migration already completed
            const existingMigration = await VencordStorage.getMigrationData();
            if (existingMigration && existingMigration.version === this.CURRENT_VERSION) {
                console.log("🌸 Migration already completed for current version");
                return result;
            }

            // Migrate templates
            const templateResult = await this.migrateTemplates();
            result.migratedData.templates = templateResult.count;
            result.errors.push(...templateResult.errors);
            result.warnings.push(...templateResult.warnings);

            // Migrate settings
            const settingsResult = await this.migrateSettings();
            result.migratedData.settings = settingsResult.count;
            result.errors.push(...settingsResult.errors);

            // Migrate user data
            const userDataResult = await this.migrateUserData();
            result.migratedData.userData = userDataResult.success;
            result.errors.push(...userDataResult.errors);

            // Mark migration as complete
            const migrationData: MigrationData = {
                version: this.CURRENT_VERSION,
                migratedAt: new Date().toISOString(),
                legacyDataFound: result.migratedData.templates > 0 || result.migratedData.settings > 0
            };

            await VencordStorage.setMigrationData(migrationData);

            result.success = result.errors.length === 0;
            console.log("🌸 Migration completed:", result);

            return result;
        } catch (error) {
            console.error("🌸 Migration failed:", error);
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : String(error));
            return result;
        }
    }

    /**
     * Migrate templates from localStorage
     */
    private static async migrateTemplates(): Promise<{ count: number; errors: string[]; warnings: string[]; }> {
        const result = { count: 0, errors: [] as string[], warnings: [] as string[] };

        if (typeof localStorage === 'undefined') {
            result.warnings.push("localStorage not available - skipping template migration");
            return result;
        }

        try {
            // Check all possible legacy keys
            for (const key of this.LEGACY_KEYS) {
                if (key.includes('template')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        try {
                            const templates = JSON.parse(stored);
                            if (Array.isArray(templates)) {
                                const migratedTemplates = await this.convertLegacyTemplates(templates);
                                const existing = await VencordStorage.getCustomTemplates();
                                
                                // Merge without duplicates
                                const merged = this.mergeTemplates(existing, migratedTemplates);
                                await VencordStorage.saveCustomTemplates(merged);
                                
                                result.count += migratedTemplates.length;
                                console.log(`🌸 Migrated ${migratedTemplates.length} templates from ${key}`);
                            }
                        } catch (parseError) {
                            result.errors.push(`Failed to parse templates from ${key}: ${parseError}`);
                        }
                    }
                }
            }
        } catch (error) {
            result.errors.push(`Template migration error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Migrate settings from localStorage
     */
    private static async migrateSettings(): Promise<{ count: number; errors: string[]; }> {
        const result = { count: 0, errors: [] as string[] };

        if (typeof localStorage === 'undefined') {
            return result;
        }

        try {
            // Look for legacy settings
            const legacySettings: any = {};
            
            // Check for individual setting keys
            const settingKeys = [
                'embed-builder-api-url',
                'embed-builder-auth-token', 
                'embed-builder-bot-integration',
                'embed-builder-auto-save',
                'embed-builder-show-preview'
            ];

            for (const key of settingKeys) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    const settingName = key.replace('embed-builder-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    try {
                        legacySettings[settingName] = JSON.parse(value);
                        result.count++;
                    } catch {
                        legacySettings[settingName] = value;
                        result.count++;
                    }
                }
            }

            // Check for settings object
            for (const key of this.LEGACY_KEYS) {
                if (key.includes('settings')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        try {
                            const settings = JSON.parse(stored);
                            Object.assign(legacySettings, settings);
                            result.count += Object.keys(settings).length;
                        } catch (parseError) {
                            result.errors.push(`Failed to parse settings from ${key}: ${parseError}`);
                        }
                    }
                }
            }

            if (Object.keys(legacySettings).length > 0) {
                await VencordStorage.saveSettings(legacySettings);
                console.log(`🌸 Migrated ${result.count} settings`);
            }
        } catch (error) {
            result.errors.push(`Settings migration error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Migrate user data (favorites, recent templates, etc.)
     */
    private static async migrateUserData(): Promise<{ success: boolean; errors: string[]; }> {
        const result = { success: true, errors: [] as string[] };

        if (typeof localStorage === 'undefined') {
            return result;
        }

        try {
            const userData = await VencordStorage.getUserData();
            let hasChanges = false;

            // Migrate favorites
            const favorites = localStorage.getItem('embed-builder-favorites');
            if (favorites) {
                try {
                    const favoriteIds = JSON.parse(favorites);
                    if (Array.isArray(favoriteIds)) {
                        userData.favoriteTemplates = [...new Set([...userData.favoriteTemplates, ...favoriteIds])];
                        hasChanges = true;
                    }
                } catch (parseError) {
                    result.errors.push(`Failed to parse favorites: ${parseError}`);
                }
            }

            // Migrate recent templates
            const recent = localStorage.getItem('embed-builder-recent');
            if (recent) {
                try {
                    const recentIds = JSON.parse(recent);
                    if (Array.isArray(recentIds)) {
                        userData.recentTemplates = recentIds.slice(0, 10); // Keep only last 10
                        hasChanges = true;
                    }
                } catch (parseError) {
                    result.errors.push(`Failed to parse recent templates: ${parseError}`);
                }
            }

            if (hasChanges) {
                await VencordStorage.saveUserData(userData);
                console.log("🌸 Migrated user data");
            }
        } catch (error) {
            result.success = false;
            result.errors.push(`User data migration error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Convert legacy template format to current format
     */
    private static async convertLegacyTemplates(legacyTemplates: LegacyTemplate[]): Promise<EmbedTemplate[]> {
        const converted: EmbedTemplate[] = [];

        for (const legacy of legacyTemplates) {
            try {
                const template: EmbedTemplate = {
                    id: legacy.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: legacy.name || "Migrated Template",
                    description: legacy.description || "Migrated from legacy storage",
                    category: legacy.category || "Migrated Templates",
                    embedData: legacy.embedData || {},
                    isBuiltIn: false,
                    createdAt: legacy.createdAt || new Date().toISOString(),
                    updatedAt: legacy.updatedAt || new Date().toISOString()
                };

                converted.push(template);
            } catch (error) {
                console.warn("🌸 Failed to convert legacy template:", legacy, error);
            }
        }

        return converted;
    }

    /**
     * Merge templates without duplicates
     */
    private static mergeTemplates(existing: EmbedTemplate[], newTemplates: EmbedTemplate[]): EmbedTemplate[] {
        const merged = [...existing];
        const existingIds = new Set(existing.map(t => t.id));
        const existingNames = new Set(existing.map(t => t.name.toLowerCase()));

        for (const template of newTemplates) {
            // Skip if ID already exists
            if (existingIds.has(template.id)) {
                continue;
            }

            // If name exists, modify it
            if (existingNames.has(template.name.toLowerCase())) {
                template.name = `${template.name} (Migrated)`;
            }

            merged.push(template);
            existingIds.add(template.id);
            existingNames.add(template.name.toLowerCase());
        }

        return merged;
    }

    /**
     * Clean up legacy localStorage data after successful migration
     */
    static async cleanupLegacyData(): Promise<{ cleaned: number; errors: string[]; }> {
        const result = { cleaned: 0, errors: [] as string[] };

        if (typeof localStorage === 'undefined') {
            return result;
        }

        try {
            for (const key of this.LEGACY_KEYS) {
                if (localStorage.getItem(key) !== null) {
                    localStorage.removeItem(key);
                    result.cleaned++;
                    console.log(`🌸 Cleaned up legacy key: ${key}`);
                }
            }

            // Clean up individual setting keys
            const settingKeys = [
                'embed-builder-api-url',
                'embed-builder-auth-token',
                'embed-builder-bot-integration',
                'embed-builder-auto-save',
                'embed-builder-show-preview',
                'embed-builder-favorites',
                'embed-builder-recent'
            ];

            for (const key of settingKeys) {
                if (localStorage.getItem(key) !== null) {
                    localStorage.removeItem(key);
                    result.cleaned++;
                }
            }
        } catch (error) {
            result.errors.push(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Get migration status
     */
    static async getMigrationStatus(): Promise<{
        isComplete: boolean;
        version: string | null;
        migratedAt: string | null;
        legacyDataFound: boolean;
    }> {
        const migrationData = await VencordStorage.getMigrationData();
        
        return {
            isComplete: migrationData?.version === this.CURRENT_VERSION,
            version: migrationData?.version || null,
            migratedAt: migrationData?.migratedAt || null,
            legacyDataFound: migrationData?.legacyDataFound || false
        };
    }
}
