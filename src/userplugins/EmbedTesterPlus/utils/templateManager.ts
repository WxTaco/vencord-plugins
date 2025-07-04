/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EmbedData } from "./embedUtils";

export interface EmbedTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    embedData: EmbedData;
    isBuiltIn: boolean;
    createdAt: string;
    updatedAt: string;
}

export const TEMPLATE_CATEGORIES = {
    ANNOUNCEMENTS: "Announcements",
    EVENTS: "Events",
    POLLS: "Polls & Surveys",
    WELCOME: "Welcome Messages",
    RULES: "Rules & Guidelines",
    UPDATES: "Updates & News",
    CUSTOM: "Custom Templates"
};

// Built-in templates
export const BUILTIN_TEMPLATES: EmbedTemplate[] = [
    {
        id: "announcement-general",
        name: "General Announcement",
        description: "Clean announcement template with header and description",
        category: TEMPLATE_CATEGORIES.ANNOUNCEMENTS,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "📢 Important Announcement",
            description: "We have an important update to share with everyone in the server.",
            color: 0x5865F2,
            timestamp: new Date().toISOString(),
            footer: {
                text: "Server Management Team",
                icon_url: ""
            },
            author: {
                name: "Server Announcement",
                icon_url: "",
                url: ""
            }
        }
    },
    {
        id: "event-upcoming",
        name: "Upcoming Event",
        description: "Event announcement with date, time, and details",
        category: TEMPLATE_CATEGORIES.EVENTS,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "🎉 Upcoming Event",
            description: "Join us for an exciting community event!",
            color: 0xFF6B6B,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "📅 Date", value: "TBD", inline: true },
                { name: "🕐 Time", value: "TBD", inline: true },
                { name: "📍 Location", value: "Discord Server", inline: true },
                { name: "ℹ️ Details", value: "More information coming soon!", inline: false }
            ],
            footer: {
                text: "React with 🎉 if you're interested!",
                icon_url: ""
            },
            thumbnail: {
                url: ""
            }
        }
    },
    {
        id: "poll-simple",
        name: "Simple Poll",
        description: "Basic poll template with options",
        category: TEMPLATE_CATEGORIES.POLLS,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "📊 Community Poll",
            description: "Help us make a decision by voting below!",
            color: 0x4ECDC4,
            fields: [
                { name: "Option A", value: "React with 🅰️", inline: true },
                { name: "Option B", value: "React with 🅱️", inline: true },
                { name: "Option C", value: "React with 🇨", inline: true }
            ],
            footer: {
                text: "Poll ends in 24 hours",
                icon_url: ""
            }
        }
    },
    {
        id: "welcome-new-member",
        name: "Welcome Message",
        description: "Friendly welcome message for new members",
        category: TEMPLATE_CATEGORIES.WELCOME,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "🎊 Welcome to the Server!",
            description: "We're excited to have you join our community!",
            color: 0x57F287,
            fields: [
                { name: "📋 Getting Started", value: "Check out our rules and guidelines", inline: false },
                { name: "💬 Introduce Yourself", value: "Tell us about yourself in #introductions", inline: false },
                { name: "🎮 Have Fun", value: "Explore our channels and join the conversation!", inline: false }
            ],
            footer: {
                text: "Enjoy your stay! 🌸",
                icon_url: ""
            },
            thumbnail: {
                url: ""
            }
        }
    },
    {
        id: "rules-guidelines",
        name: "Server Rules",
        description: "Professional rules and guidelines template",
        category: TEMPLATE_CATEGORIES.RULES,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "📜 Server Rules & Guidelines",
            description: "Please read and follow these rules to maintain a positive community environment.",
            color: 0xFEE75C,
            fields: [
                { name: "1️⃣ Be Respectful", value: "Treat all members with kindness and respect", inline: false },
                { name: "2️⃣ No Spam", value: "Avoid excessive posting or repetitive messages", inline: false },
                { name: "3️⃣ Stay On Topic", value: "Keep discussions relevant to the channel", inline: false },
                { name: "4️⃣ No NSFW Content", value: "Keep all content appropriate for all ages", inline: false },
                { name: "5️⃣ Follow Discord ToS", value: "Adhere to Discord's Terms of Service", inline: false }
            ],
            footer: {
                text: "Violations may result in warnings or bans",
                icon_url: ""
            }
        }
    },
    {
        id: "update-changelog",
        name: "Update Changelog",
        description: "Software/server update announcement template",
        category: TEMPLATE_CATEGORIES.UPDATES,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedData: {
            title: "🔄 Update v1.0.0",
            description: "Here's what's new in this update:",
            color: 0x9B59B6,
            fields: [
                { name: "✨ New Features", value: "• Feature 1\n• Feature 2\n• Feature 3", inline: false },
                { name: "🐛 Bug Fixes", value: "• Fixed issue 1\n• Fixed issue 2", inline: false },
                { name: "⚡ Improvements", value: "• Performance improvements\n• UI enhancements", inline: false }
            ],
            footer: {
                text: "Thanks for your continued support!",
                icon_url: ""
            },
            timestamp: new Date().toISOString()
        }
    }
];

// Enhanced template management using DataStore
export class TemplateManager {
    // Get all custom templates from DataStore
    static async getCustomTemplates(): Promise<EmbedTemplate[]> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.getCustomTemplates();
    }

    // Save a new custom template
    static async saveCustomTemplate(template: Omit<EmbedTemplate, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): Promise<EmbedTemplate | null> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.addCustomTemplate(template);
    }

    // Update an existing custom template
    static async updateCustomTemplate(id: string, updates: Partial<EmbedTemplate>): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.updateCustomTemplate(id, updates);
    }

    // Delete a custom template
    static async deleteCustomTemplate(id: string): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.deleteCustomTemplate(id);
    }

    // Get all templates (built-in + custom)
    static async getAllTemplates(): Promise<EmbedTemplate[]> {
        const customTemplates = await this.getCustomTemplates();
        return [...BUILTIN_TEMPLATES, ...customTemplates];
    }

    // Get templates by category
    static async getTemplatesByCategory(category: string): Promise<EmbedTemplate[]> {
        const allTemplates = await this.getAllTemplates();
        return allTemplates.filter(t => t.category === category);
    }

    // Get template by ID
    static async getTemplateById(id: string): Promise<EmbedTemplate | null> {
        // Check built-in templates first
        const builtIn = BUILTIN_TEMPLATES.find(t => t.id === id);
        if (builtIn) return builtIn;

        // Check custom templates
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.getTemplateById(id);
    }

    // Get favorite templates
    static async getFavoriteTemplates(): Promise<EmbedTemplate[]> {
        const { VencordStorage } = await import("./VencordStorage");
        const userData = await VencordStorage.getUserData();
        const allTemplates = await this.getAllTemplates();

        return allTemplates.filter(t => userData.favoriteTemplates.includes(t.id));
    }

    // Get recent templates
    static async getRecentTemplates(): Promise<EmbedTemplate[]> {
        const { VencordStorage } = await import("./VencordStorage");
        const userData = await VencordStorage.getUserData();
        const allTemplates = await this.getAllTemplates();

        // Return templates in the order they appear in recent list
        const recentTemplates: EmbedTemplate[] = [];
        for (const templateId of userData.recentTemplates) {
            const template = allTemplates.find(t => t.id === templateId);
            if (template) recentTemplates.push(template);
        }

        return recentTemplates;
    }

    // Add template to favorites
    static async addToFavorites(templateId: string): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.addToFavorites(templateId);
    }

    // Remove template from favorites
    static async removeFromFavorites(templateId: string): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.removeFromFavorites(templateId);
    }

    // Mark template as recently used
    static async markAsRecentlyUsed(templateId: string): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.addToRecentTemplates(templateId);
    }

    // Get templates grouped by category
    static async getTemplatesGroupedByCategory(): Promise<Record<string, EmbedTemplate[]>> {
        const allTemplates = await this.getAllTemplates();
        const grouped: Record<string, EmbedTemplate[]> = {};

        // Initialize with all categories
        Object.values(TEMPLATE_CATEGORIES).forEach(category => {
            grouped[category] = [];
        });

        // Group templates
        allTemplates.forEach(template => {
            if (!grouped[template.category]) {
                grouped[template.category] = [];
            }
            grouped[template.category].push(template);
        });

        // Remove empty categories
        Object.keys(grouped).forEach(category => {
            if (grouped[category].length === 0) {
                delete grouped[category];
            }
        });

        return grouped;
    }

    // Search templates
    static async searchTemplates(query: string): Promise<EmbedTemplate[]> {
        const allTemplates = await this.getAllTemplates();
        const lowercaseQuery = query.toLowerCase();

        return allTemplates.filter(template =>
            template.name.toLowerCase().includes(lowercaseQuery) ||
            template.description.toLowerCase().includes(lowercaseQuery) ||
            template.category.toLowerCase().includes(lowercaseQuery) ||
            template.embedData.title?.toLowerCase().includes(lowercaseQuery) ||
            template.embedData.description?.toLowerCase().includes(lowercaseQuery)
        );
    }

    // Export custom templates
    static async exportTemplates(): Promise<string> {
        const customTemplates = await this.getCustomTemplates();
        return JSON.stringify(customTemplates, null, 2);
    }

    // Import templates
    static async importTemplates(jsonData: string): Promise<{ success: number; errors: string[]; }> {
        try {
            const templates = JSON.parse(jsonData);
            if (!Array.isArray(templates)) {
                throw new Error("Invalid format: expected array of templates");
            }

            const results = { success: 0, errors: [] as string[] };

            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                try {
                    const saved = await this.saveCustomTemplate({
                        name: template.name || `Imported Template ${i + 1}`,
                        description: template.description || "",
                        category: template.category || TEMPLATE_CATEGORIES.CUSTOM,
                        embedData: template.embedData || {}
                    });

                    if (saved) {
                        results.success++;
                    } else {
                        results.errors.push(`Template ${i + 1}: Failed to save`);
                    }
                } catch (error) {
                    results.errors.push(`Template ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            return results;
        } catch (error) {
            return { success: 0, errors: [error instanceof Error ? error.message : String(error)] };
        }
    }

    // Clear all custom templates
    static async clearCustomTemplates(): Promise<boolean> {
        const { VencordStorage } = await import("./VencordStorage");
        return await VencordStorage.clearCustomTemplates();
    }

    // Get template statistics
    static async getTemplateStats(): Promise<{
        total: number;
        builtin: number;
        custom: number;
        favorites: number;
        categories: number;
    }> {
        const allTemplates = await this.getAllTemplates();
        const customTemplates = await this.getCustomTemplates();
        const favoriteTemplates = await this.getFavoriteTemplates();
        const categories = await this.getTemplatesGroupedByCategory();

        return {
            total: allTemplates.length,
            builtin: BUILTIN_TEMPLATES.length,
            custom: customTemplates.length,
            favorites: favoriteTemplates.length,
            categories: Object.keys(categories).length
        };
    }
}
