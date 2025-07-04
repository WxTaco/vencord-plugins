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

interface SavedEmbed {
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

interface SavedEmbeds {
    [embedName: string]: SavedEmbed;
}

const settings = definePluginSettings({
    apiUrl: {
        type: OptionType.STRING,
        description: "Your bot's API URL",
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
    if (!settings.store.enableBotIntegration || !settings.store.apiUrl || !settings.store.authToken) {
        return null;
    }

    try {
        const response = await fetch(`${settings.store.apiUrl}/api/vencord/guilds/${guildId}/embeds`, {
            headers: {
                "Authorization": `Bearer ${settings.store.authToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.success ? data.embeds : null;
    } catch (error) {
        console.error("Failed to fetch saved embeds:", error);
        return null;
    }
}

async function saveEmbed(guildId: string, name: string, embed: SavedEmbed): Promise<boolean> {
    if (!settings.store.enableBotIntegration || !settings.store.apiUrl || !settings.store.authToken) {
        return false;
    }

    try {
        const response = await fetch(`${settings.store.apiUrl}/api/vencord/guilds/${guildId}/embeds`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${settings.store.authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, embed })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("Failed to save embed:", error);
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
            execute: async (args, ctx) => {
                await openEmbedTester(ctx, "create");
            }
        }
    ],

    start() {
        console.log("EmbedBuilder: Enhanced plugin started 🌸");
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

// Export for use in other components
export { openEmbedTester, fetchSavedEmbeds, saveEmbed };
