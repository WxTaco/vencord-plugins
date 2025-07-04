/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";
import { EmbedTesterModal } from "./components/EmbedTesterModal";
import { VencordStorage, SavedEmbed } from "./utils/VencordStorage";
import { ApiIntegration } from "./utils/apiIntegration";
import { TemplateManager } from "./utils/templateManager";

interface SavedEmbeds {
    [embedName: string]: SavedEmbed;
}

const settings = definePluginSettings({
    apiUrl: {
        type: OptionType.STRING,
        description: "Your bot's API URL (include https://)",
        default: "https://api.wrapped.site"
    },
    authToken: {
        type: OptionType.STRING,
        description: "Your authentication token",
        default: ""
    },
    enableBotIntegration: {
        type: OptionType.BOOLEAN,
        description: "Enable bot API integration for templates",
        default: true
    },
    autoSave: {
        type: OptionType.BOOLEAN,
        description: "Auto-save embeds as you build them",
        default: true
    },
    showPreview: {
        type: OptionType.BOOLEAN,
        description: "Show live preview while editing",
        default: true
    }
});

async function fetchSavedEmbeds(guildId: string): Promise<SavedEmbeds | null> {
    try {
        console.log("🌸 Fetching saved embeds for guild:", guildId);
        const embeds = await ApiIntegration.fetchSavedEmbeds(guildId);
        return embeds;
    } catch (error) {
        console.error("🌸 Failed to fetch saved embeds:", error);
        return null;
    }
}

async function saveEmbed(guildId: string, name: string, embed: SavedEmbed): Promise<boolean> {
    try {
        console.log("🌸 Saving embed:", { guildId, name });
        return await ApiIntegration.saveEmbed(guildId, name, embed);
    } catch (error) {
        console.error("🌸 Failed to save embed:", error);
        return false;
    }
}

export default definePlugin({
    name: "EmbedBuilder",
    description: "Enhanced Embed Builder with bot integration, templates, and image generation 🌸",
    authors: [{ name: "taco.ot", id: 905201724539666503n }],
    dependencies: ["CommandsAPI"],

    settings,

    commands: [
        {
            name: "embed",
            description: "🌸 Create beautiful embeds with templates and bot integration",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "action",
                    description: "What to do with embeds",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        { name: "Create New", value: "create", label: "Create New" },
                        { name: "Load Template", value: "load", label: "Load Template" },
                        { name: "Quick Builder", value: "quick", label: "Quick Builder" }
                    ],
                    required: false
                },
                {
                    name: "template",
                    description: "Template name to load",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            execute: async (args, ctx) => {
                const action = (findOption(args, "action") as string) || "create";
                const templateName = findOption(args, "template") as string | undefined;

                await openEmbedTester(ctx, action, templateName);
            }
        },
        {
            name: "embed-builder",
            description: "Open Embed Builder (alias for /embed) 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                await openEmbedTester(ctx, "create");
            }
        },
        {
            name: "embed-test-bot",
            description: "Test bot integration for embed templates 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                if (!ctx.guild?.id) {
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ This command can only be used in a server!"
                    });
                    return;
                }

                const status = await testBotIntegration(ctx.guild.id);
                sendBotMessage(ctx.channel.id, {
                    content: `🌸 **Bot Integration Test**\n${status}`
                });
            }
        },
        {
            name: "embed-test-storage",
            description: "Test DataStore functionality 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                try {
                    const testResult = await VencordStorage.testDataStore();
                    const templates = await VencordStorage.getCustomTemplates();
                    const settings = await VencordStorage.getSettings();
                    const userData = await VencordStorage.getUserData();

                    sendBotMessage(ctx.channel.id, {
                        content: `🌸 **DataStore Test Results**\n${testResult}\n📁 Templates: ${templates.length}\n⚙️ Settings: ${Object.keys(settings).length} keys\n👤 Favorites: ${userData.favoriteTemplates.length}\n📝 Recent: ${userData.recentTemplates.length}`
                    });
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `🌸 **Storage Test Failed**\n❌ ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
        },
        {
            name: "embed-sync",
            description: "Sync local templates with bot API 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                if (!ctx.guild?.id) {
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ This command can only be used in servers!"
                    });
                    return;
                }

                try {
                    const result = await ApiIntegration.syncTemplates(ctx.guild.id);

                    if (result.success) {
                        sendBotMessage(ctx.channel.id, {
                            content: `✅ **Sync Complete!**\n🔄 Synced ${result.synced} templates to bot API`
                        });
                    } else {
                        sendBotMessage(ctx.channel.id, {
                            content: `❌ **Sync Failed**\n${result.errors.join('\n')}`
                        });
                    }
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ **Sync Error**\n${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
        },
        {
            name: "embed-migrate",
            description: "Migrate data from localStorage to DataStore 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                try {
                    const result = await VencordStorage.migrateFromLocalStorage();

                    if (result.success) {
                        sendBotMessage(ctx.channel.id, {
                            content: `✅ **Migration Complete!**\n📦 Found and migrated ${result.templatesFound} templates from localStorage`
                        });
                    } else {
                        sendBotMessage(ctx.channel.id, {
                            content: `❌ **Migration Failed**\nPlease check console for details`
                        });
                    }
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ **Migration Error**\n${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
        },
        {
            name: "embed-stats",
            description: "Show template and storage statistics 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                try {
                    const stats = await TemplateManager.getTemplateStats();
                    const connectionStatus = await ApiIntegration.testConnection();

                    sendBotMessage(ctx.channel.id, {
                        content: `📊 **Embed Builder Statistics**\n` +
                            `📁 Total Templates: ${stats.total}\n` +
                            `🏗️ Built-in: ${stats.builtin}\n` +
                            `✨ Custom: ${stats.custom}\n` +
                            `⭐ Favorites: ${stats.favorites}\n` +
                            `📂 Categories: ${stats.categories}\n` +
                            `🔗 API Status: ${connectionStatus.connected ? '✅ Connected' : '❌ Disconnected'}\n` +
                            `⏱️ Response Time: ${connectionStatus.responseTime || 'N/A'}ms`
                    });
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ **Stats Error**\n${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
        },
        {
            name: "embed-debug",
            description: "Debug DataStore and template loading 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                try {
                    console.log("🌸 Starting debug...");

                    // Test DataStore directly
                    const testResult = await VencordStorage.testDataStore();
                    console.log("🌸 DataStore test:", testResult);

                    // Test template loading step by step
                    console.log("🌸 Testing template loading...");
                    const rawTemplates = await VencordStorage.getCustomTemplates();
                    console.log("🌸 Raw templates from VencordStorage:", rawTemplates, "Type:", typeof rawTemplates, "IsArray:", Array.isArray(rawTemplates));

                    const allTemplates = await TemplateManager.getAllTemplates();
                    console.log("🌸 All templates from TemplateManager:", allTemplates.length);

                    const userData = await VencordStorage.getUserData();
                    console.log("🌸 User data:", userData);

                    sendBotMessage(ctx.channel.id, {
                        content: `🔍 **Debug Results**\n` +
                            `DataStore: ${testResult}\n` +
                            `Raw Templates: ${Array.isArray(rawTemplates) ? rawTemplates.length : 'NOT ARRAY: ' + typeof rawTemplates}\n` +
                            `All Templates: ${allTemplates.length}\n` +
                            `Favorites: ${userData.favoriteTemplates.length}\n` +
                            `Recent: ${userData.recentTemplates.length}\n` +
                            `Check console for detailed logs`
                    });
                } catch (error) {
                    console.error("🌸 Debug error:", error);
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ **Debug Error**\n${error instanceof Error ? error.message : String(error)}\nStack: ${error instanceof Error ? error.stack : 'N/A'}`
                    });
                }
            }
        }
    ],

    async start() {
        console.log("EmbedBuilder: Enhanced plugin started 🌸");

        // Perform automatic migration on startup
        try {
            const migrationResult = await VencordStorage.migrateFromLocalStorage();
            if (migrationResult.templatesFound > 0) {
                console.log(`🌸 Migrated ${migrationResult.templatesFound} templates from localStorage to DataStore`);
            }
        } catch (error) {
            console.error("🌸 Migration failed on startup:", error);
        }
    },

    stop() {
        console.log("EmbedBuilder: Plugin stopped");
    },

    // Add settings panel button with professional theme
    settingsAboutComponent: () => {
        return React.createElement("div", {
            style: {
                padding: "20px",
                background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
                border: "2px solid #f9a8d4",
                borderRadius: "12px",
                margin: "12px 0"
            }
        }, [
            React.createElement("h3", {
                key: "title",
                style: {
                    margin: "0 0 8px 0",
                    color: "#be185d",
                    fontSize: "18px",
                    fontWeight: "600"
                }
            }, "Embed Builder 🌸"),
            React.createElement("p", {
                key: "desc",
                style: {
                    margin: "0 0 16px 0",
                    color: "#831843",
                    fontSize: "14px",
                    lineHeight: "1.5"
                }
            }, "Beautiful Discord embed builder with visual editor, JSON editor, and image generation capabilities."),
            React.createElement("div", {
                key: "buttons",
                style: { display: "flex", gap: "8px", flexWrap: "wrap" }
            }, [
                React.createElement("button", {
                    key: "btn1",
                    onClick: () => openEmbedTester(),
                    style: {
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #ec4899, #be185d)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        boxShadow: "0 2px 4px rgba(190, 24, 93, 0.3)"
                    }
                }, "Open Embed Builder 🌸"),
                React.createElement("div", {
                    key: "info",
                    style: {
                        fontSize: "12px",
                        color: "#9d174d",
                        marginTop: "4px",
                        fontStyle: "italic"
                    }
                }, "Also available via /embed or /embed-builder commands 🌸")
            ])
        ]);
    }
});

// Function to open the embed tester modal
async function openEmbedTester(ctx?: any, action: string = "create", templateName?: string) {
    let savedEmbeds: SavedEmbeds | null = null;
    let initialEmbed: SavedEmbed | null = null;

    // If we have context and bot integration is enabled, try to fetch templates
    if (ctx?.guild?.id && settings.store.enableBotIntegration) {
        try {
            savedEmbeds = await fetchSavedEmbeds(ctx.guild.id);

            // Load specific template if requested
            if (action === "load" && templateName && savedEmbeds) {
                initialEmbed = savedEmbeds[templateName] || null;
                if (!initialEmbed && ctx) {
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ Template "${templateName}" not found!`
                    });
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        }
    }

    openModal(props => React.createElement(EmbedTesterModal, {
        ...props,
        guildId: ctx?.guild?.id,
        channelId: ctx?.channel?.id,
        userId: ctx?.user?.id,
        action,
        initialEmbed,
        savedEmbeds: savedEmbeds || {},
        onSave: ctx?.guild?.id ? (name: string, embed: SavedEmbed) => saveEmbed(ctx.guild.id, name, embed) : undefined,
        botIntegrationEnabled: settings.store.enableBotIntegration
    }));
}

// Test bot integration function
async function testBotIntegration(guildId: string): Promise<string> {
    try {
        console.log("🌸 Testing bot integration for guild:", guildId);

        const connectionStatus = await ApiIntegration.testConnection();

        if (!connectionStatus.connected) {
            return `❌ ${connectionStatus.error || 'Connection failed'}`;
        }

        // Test fetching embeds for the specific guild
        const embeds = await ApiIntegration.fetchSavedEmbeds(guildId, false); // Force fresh fetch

        if (embeds) {
            const count = Object.keys(embeds).length;
            return `✅ Bot integration working! Found ${count} saved templates (${connectionStatus.responseTime}ms)`;
        } else {
            return `⚠️ Connected but no templates found for this server (${connectionStatus.responseTime}ms)`;
        }
    } catch (error) {
        console.error("🌸 Test integration failed:", error);
        return `❌ Test failed: ${error instanceof Error ? error.message : String(error)}`;
    }
}

// Export for use in other components
export { openEmbedTester, fetchSavedEmbeds, saveEmbed, testBotIntegration };
