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

// Storage key for custom templates
const STORAGE_KEY = "embed-builder-templates";

// Template management functions
export class TemplateManager {
    static getCustomTemplates(): EmbedTemplate[] {
        try {
            // Check if localStorage is available (not available in Vencord context)
            if (typeof localStorage === 'undefined') {
                return [];
            }
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Failed to load custom templates:", error);
            return [];
        }
    }

    static saveCustomTemplate(template: Omit<EmbedTemplate, "id" | "isBuiltIn" | "createdAt" | "updatedAt">): EmbedTemplate {
        const newTemplate: EmbedTemplate = {
            ...template,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const customTemplates = this.getCustomTemplates();
        customTemplates.push(newTemplate);

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
            }
            return newTemplate;
        } catch (error) {
            console.error("Failed to save template:", error);
            throw new Error("Failed to save template");
        }
    }

    static updateCustomTemplate(id: string, updates: Partial<EmbedTemplate>): boolean {
        const customTemplates = this.getCustomTemplates();
        const index = customTemplates.findIndex(t => t.id === id);

        if (index === -1) return false;

        customTemplates[index] = {
            ...customTemplates[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
            }
            return true;
        } catch (error) {
            console.error("Failed to update template:", error);
            return false;
        }
    }

    static deleteCustomTemplate(id: string): boolean {
        const customTemplates = this.getCustomTemplates();
        const filtered = customTemplates.filter(t => t.id !== id);

        if (filtered.length === customTemplates.length) return false;

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            }
            return true;
        } catch (error) {
            console.error("Failed to delete template:", error);
            return false;
        }
    }

    static getAllTemplates(): EmbedTemplate[] {
        return [...BUILTIN_TEMPLATES, ...this.getCustomTemplates()];
    }

    static getTemplatesByCategory(category: string): EmbedTemplate[] {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    static getTemplateById(id: string): EmbedTemplate | null {
        return this.getAllTemplates().find(t => t.id === id) || null;
    }

    static exportTemplates(): string {
        const customTemplates = this.getCustomTemplates();
        return JSON.stringify(customTemplates, null, 2);
    }

    static importTemplates(jsonData: string): { success: number; errors: string[]; } {
        try {
            const templates = JSON.parse(jsonData);
            if (!Array.isArray(templates)) {
                throw new Error("Invalid format: expected array of templates");
            }

            const results = { success: 0, errors: [] as string[] };

            templates.forEach((template, index) => {
                try {
                    this.saveCustomTemplate({
                        name: template.name || `Imported Template ${index + 1}`,
                        description: template.description || "",
                        category: template.category || TEMPLATE_CATEGORIES.CUSTOM,
                        embedData: template.embedData || {}
                    });
                    results.success++;
                } catch (error) {
                    results.errors.push(`Template ${index + 1}: ${error.message}`);
                }
            });

            return results;
        } catch (error) {
            return { success: 0, errors: [error.message] };
        }
    }
}
