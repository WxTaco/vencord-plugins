/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VencordStorage, SavedEmbed, StoredSettings } from "./VencordStorage";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface BotApiEmbedResponse {
    success: boolean;
    embeds: Record<string, SavedEmbed>;
    message?: string;
}

export interface BotApiSaveResponse {
    success: boolean;
    message?: string;
}

export interface ApiConnectionStatus {
    connected: boolean;
    lastCheck: string;
    error?: string;
    responseTime?: number;
}

/**
 * Enhanced API integration with caching and error handling
 */
export class ApiIntegration {
    private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
    private static readonly RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY = 1000; // 1 second

    // Get current settings
    private static async getSettings(): Promise<StoredSettings> {
        const settings = await VencordStorage.getSettings();
        return {
            apiUrl: settings.apiUrl || "https://api.wrapped.site",
            authToken: settings.authToken || "",
            enableBotIntegration: settings.enableBotIntegration ?? true,
            autoSave: settings.autoSave ?? true,
            showPreview: settings.showPreview ?? true,
            syncEnabled: settings.syncEnabled ?? true
        };
    }

    // Check if API integration is enabled and configured
    static async isConfigured(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.enableBotIntegration && !!settings.apiUrl && !!settings.authToken;
    }

    // Test API connection
    static async testConnection(): Promise<ApiConnectionStatus> {
        const startTime = Date.now();
        
        try {
            if (!(await this.isConfigured())) {
                return {
                    connected: false,
                    lastCheck: new Date().toISOString(),
                    error: "API integration not configured"
                };
            }

            const settings = await this.getSettings();
            const url = `${settings.apiUrl}/api/vencord/health`;
            
            console.log("🌸 Testing API connection to:", url);

            const response = await this.makeRequest(url, {
                method: "GET",
                timeout: 5000 // Shorter timeout for health check
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                return {
                    connected: true,
                    lastCheck: new Date().toISOString(),
                    responseTime
                };
            } else {
                const errorText = await response.text();
                return {
                    connected: false,
                    lastCheck: new Date().toISOString(),
                    error: `HTTP ${response.status}: ${errorText}`,
                    responseTime
                };
            }
        } catch (error) {
            return {
                connected: false,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    // Fetch saved embeds for a guild with caching
    static async fetchSavedEmbeds(guildId: string, useCache: boolean = true): Promise<Record<string, SavedEmbed> | null> {
        try {
            console.log("🌸 Fetching saved embeds for guild:", guildId);

            // Check cache first if enabled
            if (useCache) {
                const cached = await VencordStorage.getApiCache(guildId);
                if (cached) {
                    console.log("🌸 Using cached embeds for guild:", guildId);
                    return cached.embeds;
                }
            }

            if (!(await this.isConfigured())) {
                console.log("🌸 API integration not configured");
                return null;
            }

            const settings = await this.getSettings();
            const url = `${settings.apiUrl}/api/vencord/guilds/${guildId}/embeds`;

            const response = await this.makeRequestWithRetry(url, {
                method: "GET"
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("🌸 Failed to fetch embeds:", response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: BotApiEmbedResponse = await response.json();
            console.log("🌸 Fetched embeds data:", data);

            if (data.success && data.embeds) {
                // Cache the result
                await VencordStorage.setApiCache(guildId, data.embeds);
                return data.embeds;
            }

            return null;
        } catch (error) {
            console.error("🌸 Failed to fetch saved embeds:", error);
            return null;
        }
    }

    // Save embed to API
    static async saveEmbed(guildId: string, name: string, embed: SavedEmbed): Promise<boolean> {
        try {
            console.log("🌸 Saving embed to API:", { guildId, name });

            if (!(await this.isConfigured())) {
                console.log("🌸 API integration not configured");
                return false;
            }

            const settings = await this.getSettings();
            const url = `${settings.apiUrl}/api/vencord/guilds/${guildId}/embeds`;

            const response = await this.makeRequestWithRetry(url, {
                method: "POST",
                body: JSON.stringify({ name, embed })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("🌸 Failed to save embed:", response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: BotApiSaveResponse = await response.json();
            console.log("🌸 Save response:", data);

            if (data.success) {
                // Invalidate cache to force refresh
                await VencordStorage.removeApiCache(guildId);
                return true;
            }

            return false;
        } catch (error) {
            console.error("🌸 Failed to save embed:", error);
            return false;
        }
    }

    // Delete embed from API
    static async deleteEmbed(guildId: string, name: string): Promise<boolean> {
        try {
            console.log("🌸 Deleting embed from API:", { guildId, name });

            if (!(await this.isConfigured())) {
                console.log("🌸 API integration not configured");
                return false;
            }

            const settings = await this.getSettings();
            const url = `${settings.apiUrl}/api/vencord/guilds/${guildId}/embeds/${encodeURIComponent(name)}`;

            const response = await this.makeRequestWithRetry(url, {
                method: "DELETE"
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("🌸 Failed to delete embed:", response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: BotApiSaveResponse = await response.json();
            console.log("🌸 Delete response:", data);

            if (data.success) {
                // Invalidate cache to force refresh
                await VencordStorage.removeApiCache(guildId);
                return true;
            }

            return false;
        } catch (error) {
            console.error("🌸 Failed to delete embed:", error);
            return false;
        }
    }

    // Sync local templates with API
    static async syncTemplates(guildId: string): Promise<{ success: boolean; synced: number; errors: string[]; }> {
        try {
            console.log("🌸 Syncing templates with API for guild:", guildId);

            const result = { success: true, synced: 0, errors: [] as string[] };

            if (!(await this.isConfigured())) {
                result.success = false;
                result.errors.push("API integration not configured");
                return result;
            }

            // Get local custom templates
            const customTemplates = await VencordStorage.getCustomTemplates();
            
            // Get API embeds
            const apiEmbeds = await this.fetchSavedEmbeds(guildId, false); // Force fresh fetch
            
            if (!apiEmbeds) {
                result.success = false;
                result.errors.push("Failed to fetch API embeds");
                return result;
            }

            // Sync each custom template to API
            for (const template of customTemplates) {
                try {
                    const embedName = `template-${template.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
                    
                    // Convert template to SavedEmbed format
                    const savedEmbed: SavedEmbed = {
                        title: template.embedData.title,
                        description: template.embedData.description,
                        color: template.embedData.color,
                        author: template.embedData.author,
                        footer: template.embedData.footer,
                        thumbnail: template.embedData.thumbnail,
                        image: template.embedData.image,
                        fields: template.embedData.fields,
                        timestamp: template.embedData.timestamp,
                        url: template.embedData.url
                    };

                    const success = await this.saveEmbed(guildId, embedName, savedEmbed);
                    if (success) {
                        result.synced++;
                    } else {
                        result.errors.push(`Failed to sync template: ${template.name}`);
                    }
                } catch (error) {
                    result.errors.push(`Error syncing template ${template.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            result.success = result.errors.length === 0;
            return result;
        } catch (error) {
            console.error("🌸 Failed to sync templates:", error);
            return {
                success: false,
                synced: 0,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    // Make HTTP request with authentication and timeout
    private static async makeRequest(url: string, options: {
        method?: string;
        body?: string;
        timeout?: number;
    } = {}): Promise<Response> {
        const settings = await this.getSettings();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.DEFAULT_TIMEOUT);

        try {
            const response = await fetch(url, {
                method: options.method || "GET",
                headers: {
                    "Authorization": `Bearer ${settings.authToken}`,
                    "Content-Type": "application/json"
                },
                body: options.body,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Make request with retry logic
    private static async makeRequestWithRetry(url: string, options: {
        method?: string;
        body?: string;
        timeout?: number;
    } = {}): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
            try {
                console.log(`🌸 API request attempt ${attempt}/${this.RETRY_ATTEMPTS}:`, url);
                return await this.makeRequest(url, options);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`🌸 API request attempt ${attempt} failed:`, lastError.message);

                if (attempt < this.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
                }
            }
        }

        throw lastError || new Error("All retry attempts failed");
    }
}
