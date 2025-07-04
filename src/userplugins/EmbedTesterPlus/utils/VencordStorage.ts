/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { EmbedTemplate } from "./templateManager";

// Storage keys for different data types
const STORAGE_KEYS = {
    TEMPLATES: "embed-builder-templates",
    SETTINGS: "embed-builder-settings",
    API_CACHE: "embed-builder-api-cache",
    USER_DATA: "embed-builder-user-data",
    MIGRATION: "embed-builder-migration"
} as const;

// Data interfaces
export interface SavedEmbed {
    title?: string;
    description?: string;
    color?: number;
    author?: {
        name?: string;
        icon_url?: string;
        url?: string;
    };
    footer?: {
        text?: string;
        icon_url?: string;
    };
    thumbnail?: {
        url?: string;
    };
    image?: {
        url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    timestamp?: string;
    url?: string;
}

export interface StoredSettings {
    apiUrl: string;
    authToken: string;
    enableBotIntegration: boolean;
    autoSave: boolean;
    showPreview: boolean;
    lastSync?: string;
    syncEnabled?: boolean;
}

export interface ApiCacheEntry {
    guildId: string;
    embeds: Record<string, SavedEmbed>;
    lastFetch: string;
    expiresAt: string;
}

export interface UserData {
    favoriteTemplates: string[];
    recentTemplates: string[];
    customCategories: string[];
    preferences: {
        defaultColor?: number;
        defaultFooter?: string;
        autoTimestamp?: boolean;
    };
}

export interface MigrationData {
    version: string;
    migratedAt: string;
    legacyDataFound: boolean;
}

/**
 * Enhanced Vencord storage utilities using DataStore API
 */
export class VencordStorage {
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private static readonly MAX_CACHE_ENTRIES = 50;

    // Template Management
    static async getCustomTemplates(): Promise<EmbedTemplate[]> {
        try {
            console.log("🌸 Loading custom templates from DataStore...");
            const stored = await DataStore.get(STORAGE_KEYS.TEMPLATES);
            const templates = stored || [];
            console.log("🌸 Loaded", templates.length, "custom templates");
            return templates;
        } catch (error) {
            console.error("🌸 Failed to load custom templates:", error);
            return [];
        }
    }

    static async saveCustomTemplates(templates: EmbedTemplate[]): Promise<boolean> {
        try {
            console.log("🌸 Saving", templates.length, "custom templates...");
            await DataStore.set(STORAGE_KEYS.TEMPLATES, templates);
            console.log("🌸 Successfully saved custom templates");
            return true;
        } catch (error) {
            console.error("🌸 Failed to save custom templates:", error);
            return false;
        }
    }

    /**
     * Add a new custom template
     */
    static async addCustomTemplate(template: Omit<EmbedTemplate, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<EmbedTemplate | null> {
        try {
            const newTemplate: EmbedTemplate = {
                ...template,
                id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                isBuiltIn: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const existingTemplates = await this.getCustomTemplates();
            const updatedTemplates = [...existingTemplates, newTemplate];

            const success = await this.saveCustomTemplates(updatedTemplates);
            return success ? newTemplate : null;
        } catch (error) {
            console.error("🌸 Failed to add custom template:", error);
            return null;
        }
    }

    /**
     * Update an existing custom template
     */
    static async updateCustomTemplate(templateId: string, updates: Partial<EmbedTemplate>): Promise<boolean> {
        try {
            const existingTemplates = await this.getCustomTemplates();
            const templateIndex = existingTemplates.findIndex(t => t.id === templateId);

            if (templateIndex === -1) {
                console.error("🌸 Template not found:", templateId);
                return false;
            }

            existingTemplates[templateIndex] = {
                ...existingTemplates[templateIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            return await this.saveCustomTemplates(existingTemplates);
        } catch (error) {
            console.error("🌸 Failed to update custom template:", error);
            return false;
        }
    }

    /**
     * Delete a custom template
     */
    static async deleteCustomTemplate(templateId: string): Promise<boolean> {
        try {
            const existingTemplates = await this.getCustomTemplates();
            const filteredTemplates = existingTemplates.filter(t => t.id !== templateId);

            if (filteredTemplates.length === existingTemplates.length) {
                console.error("🌸 Template not found for deletion:", templateId);
                return false;
            }

            return await this.saveCustomTemplates(filteredTemplates);
        } catch (error) {
            console.error("🌸 Failed to delete custom template:", error);
            return false;
        }
    }

    static async getTemplateById(id: string): Promise<EmbedTemplate | null> {
        try {
            const templates = await this.getCustomTemplates();
            return templates.find(t => t.id === id) || null;
        } catch (error) {
            console.error("🌸 Failed to get template by ID:", error);
            return null;
        }
    }

    static async clearCustomTemplates(): Promise<boolean> {
        try {
            console.log("🌸 Clearing all custom templates...");
            await DataStore.set(STORAGE_KEYS.TEMPLATES, []);
            console.log("🌸 Successfully cleared all custom templates");
            return true;
        } catch (error) {
            console.error("🌸 Failed to clear custom templates:", error);
            return false;
        }
    }

    // Settings Management
    static async getSettings(): Promise<Partial<StoredSettings>> {
        try {
            console.log("🌸 Loading settings from DataStore...");
            const stored = await DataStore.get(STORAGE_KEYS.SETTINGS);
            return stored || {};
        } catch (error) {
            console.error("🌸 Failed to load settings:", error);
            return {};
        }
    }

    static async saveSettings(settings: Partial<StoredSettings>): Promise<boolean> {
        try {
            console.log("🌸 Saving settings to DataStore...");
            const existing = await this.getSettings();
            const updated = { ...existing, ...settings };
            await DataStore.set(STORAGE_KEYS.SETTINGS, updated);
            console.log("🌸 Successfully saved settings");
            return true;
        } catch (error) {
            console.error("🌸 Failed to save settings:", error);
            return false;
        }
    }

    // API Cache Management
    static async getApiCache(guildId: string): Promise<ApiCacheEntry | null> {
        try {
            const cache = await DataStore.get(STORAGE_KEYS.API_CACHE) || {};
            const entry = cache[guildId];

            if (!entry) return null;

            // Check if cache is expired
            if (new Date(entry.expiresAt) < new Date()) {
                await this.removeApiCache(guildId);
                return null;
            }

            return entry;
        } catch (error) {
            console.error("🌸 Failed to get API cache:", error);
            return null;
        }
    }

    static async setApiCache(guildId: string, embeds: Record<string, SavedEmbed>): Promise<boolean> {
        try {
            const cache = await DataStore.get(STORAGE_KEYS.API_CACHE) || {};
            const now = new Date();
            const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);

            cache[guildId] = {
                guildId,
                embeds,
                lastFetch: now.toISOString(),
                expiresAt: expiresAt.toISOString()
            };

            // Cleanup old entries if we have too many
            const entries = Object.values(cache) as ApiCacheEntry[];
            if (entries.length > this.MAX_CACHE_ENTRIES) {
                const sorted = entries.sort((a, b) => new Date(a.lastFetch).getTime() - new Date(b.lastFetch).getTime());
                const toRemove = sorted.slice(0, entries.length - this.MAX_CACHE_ENTRIES);
                toRemove.forEach(entry => delete cache[entry.guildId]);
            }

            await DataStore.set(STORAGE_KEYS.API_CACHE, cache);
            return true;
        } catch (error) {
            console.error("🌸 Failed to set API cache:", error);
            return false;
        }
    }

    static async removeApiCache(guildId: string): Promise<boolean> {
        try {
            const cache = await DataStore.get(STORAGE_KEYS.API_CACHE) || {};
            delete cache[guildId];
            await DataStore.set(STORAGE_KEYS.API_CACHE, cache);
            return true;
        } catch (error) {
            console.error("🌸 Failed to remove API cache:", error);
            return false;
        }
    }

    static async clearApiCache(): Promise<boolean> {
        try {
            await DataStore.set(STORAGE_KEYS.API_CACHE, {});
            return true;
        } catch (error) {
            console.error("🌸 Failed to clear API cache:", error);
            return false;
        }
    }

    // User Data Management
    static async getUserData(): Promise<UserData> {
        try {
            const stored = await DataStore.get(STORAGE_KEYS.USER_DATA);
            return stored || {
                favoriteTemplates: [],
                recentTemplates: [],
                customCategories: [],
                preferences: {}
            };
        } catch (error) {
            console.error("🌸 Failed to load user data:", error);
            return {
                favoriteTemplates: [],
                recentTemplates: [],
                customCategories: [],
                preferences: {}
            };
        }
    }

    static async saveUserData(userData: UserData): Promise<boolean> {
        try {
            await DataStore.set(STORAGE_KEYS.USER_DATA, userData);
            return true;
        } catch (error) {
            console.error("🌸 Failed to save user data:", error);
            return false;
        }
    }

    static async addToFavorites(templateId: string): Promise<boolean> {
        try {
            const userData = await this.getUserData();
            if (!userData.favoriteTemplates.includes(templateId)) {
                userData.favoriteTemplates.push(templateId);
                return await this.saveUserData(userData);
            }
            return true;
        } catch (error) {
            console.error("🌸 Failed to add to favorites:", error);
            return false;
        }
    }

    static async removeFromFavorites(templateId: string): Promise<boolean> {
        try {
            const userData = await this.getUserData();
            userData.favoriteTemplates = userData.favoriteTemplates.filter(id => id !== templateId);
            return await this.saveUserData(userData);
        } catch (error) {
            console.error("🌸 Failed to remove from favorites:", error);
            return false;
        }
    }

    static async addToRecentTemplates(templateId: string): Promise<boolean> {
        try {
            const userData = await this.getUserData();
            // Remove if already exists to avoid duplicates
            userData.recentTemplates = userData.recentTemplates.filter(id => id !== templateId);
            // Add to beginning
            userData.recentTemplates.unshift(templateId);
            // Keep only last 10
            userData.recentTemplates = userData.recentTemplates.slice(0, 10);
            return await this.saveUserData(userData);
        } catch (error) {
            console.error("🌸 Failed to add to recent templates:", error);
            return false;
        }
    }

    static async removeFromRecentTemplates(templateId: string): Promise<boolean> {
        try {
            const userData = await this.getUserData();
            userData.recentTemplates = userData.recentTemplates.filter(id => id !== templateId);
            return await this.saveUserData(userData);
        } catch (error) {
            console.error("🌸 Failed to remove from recent templates:", error);
            return false;
        }
    }

    // Migration and Maintenance
    static async getMigrationData(): Promise<MigrationData | null> {
        try {
            return await DataStore.get(STORAGE_KEYS.MIGRATION);
        } catch (error) {
            console.error("🌸 Failed to get migration data:", error);
            return null;
        }
    }

    static async setMigrationData(data: MigrationData): Promise<boolean> {
        try {
            await DataStore.set(STORAGE_KEYS.MIGRATION, data);
            return true;
        } catch (error) {
            console.error("🌸 Failed to set migration data:", error);
            return false;
        }
    }

    static async migrateFromLocalStorage(): Promise<{ success: boolean; templatesFound: number; }> {
        try {
            console.log("🌸 Checking for legacy localStorage data...");

            // Check if we already migrated
            const migrationData = await this.getMigrationData();
            if (migrationData) {
                console.log("🌸 Migration already completed");
                return { success: true, templatesFound: 0 };
            }

            let templatesFound = 0;

            // Try to migrate templates from localStorage
            if (typeof localStorage !== 'undefined') {
                try {
                    const legacyTemplates = localStorage.getItem("embed-builder-templates");
                    if (legacyTemplates) {
                        const parsed = JSON.parse(legacyTemplates);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const existing = await this.getCustomTemplates();
                            const combined = [...existing, ...parsed];
                            await this.saveCustomTemplates(combined);
                            templatesFound = parsed.length;
                            console.log(`🌸 Migrated ${templatesFound} templates from localStorage`);
                        }
                    }
                } catch (error) {
                    console.error("🌸 Failed to migrate templates from localStorage:", error);
                }
            }

            // Mark migration as complete
            await this.setMigrationData({
                version: "1.0.0",
                migratedAt: new Date().toISOString(),
                legacyDataFound: templatesFound > 0
            });

            return { success: true, templatesFound };
        } catch (error) {
            console.error("🌸 Migration failed:", error);
            return { success: false, templatesFound: 0 };
        }
    }

    static async exportAllData(): Promise<string> {
        try {
            const templates = await this.getCustomTemplates();
            const settings = await this.getSettings();
            const userData = await this.getUserData();

            const exportData = {
                version: "1.0.0",
                exportedAt: new Date().toISOString(),
                templates,
                settings,
                userData
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error("🌸 Failed to export data:", error);
            throw new Error("Failed to export data");
        }
    }

    static async importAllData(jsonData: string): Promise<{ success: boolean; imported: { templates: number; settings: boolean; userData: boolean; }; errors: string[]; }> {
        try {
            const data = JSON.parse(jsonData);
            const result = {
                success: true,
                imported: { templates: 0, settings: false, userData: false },
                errors: [] as string[]
            };

            // Import templates
            if (data.templates && Array.isArray(data.templates)) {
                try {
                    const existing = await this.getCustomTemplates();
                    const combined = [...existing, ...data.templates];
                    await this.saveCustomTemplates(combined);
                    result.imported.templates = data.templates.length;
                } catch (error) {
                    result.errors.push(`Templates: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Import settings
            if (data.settings && typeof data.settings === 'object') {
                try {
                    await this.saveSettings(data.settings);
                    result.imported.settings = true;
                } catch (error) {
                    result.errors.push(`Settings: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Import user data
            if (data.userData && typeof data.userData === 'object') {
                try {
                    await this.saveUserData(data.userData);
                    result.imported.userData = true;
                } catch (error) {
                    result.errors.push(`User Data: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;
        } catch (error) {
            return {
                success: false,
                imported: { templates: 0, settings: false, userData: false },
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    static async testDataStore(): Promise<string> {
        try {
            console.log("🌸 Testing Vencord DataStore...");

            // Test write
            const testKey = "embed-builder-test";
            const testData = { test: true, timestamp: Date.now() };
            await DataStore.set(testKey, testData);

            // Test read
            const retrieved = await DataStore.get(testKey);

            // Cleanup
            await DataStore.del(testKey);

            if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
                console.log("🌸 DataStore test successful!");
                return "✅ DataStore is working correctly";
            } else {
                console.error("🌸 DataStore test failed - data mismatch");
                return "❌ DataStore test failed - data mismatch";
            }
        } catch (error) {
            console.error("🌸 DataStore test failed:", error);
            return `❌ DataStore test failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    static async clearAllData(): Promise<boolean> {
        try {
            console.log("🌸 Clearing all plugin data...");
            await Promise.all([
                DataStore.del(STORAGE_KEYS.TEMPLATES),
                DataStore.del(STORAGE_KEYS.SETTINGS),
                DataStore.del(STORAGE_KEYS.API_CACHE),
                DataStore.del(STORAGE_KEYS.USER_DATA),
                DataStore.del(STORAGE_KEYS.MIGRATION)
            ]);
            console.log("🌸 Successfully cleared all plugin data");
            return true;
        } catch (error) {
            console.error("🌸 Failed to clear all data:", error);
            return false;
        }
    }
}
