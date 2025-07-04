/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";

import { EmbedBuilderModal } from "./components/EmbedBuilderModal";

const { openModal } = findByPropsLazy("openModal", "closeModal");

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
    autoSave: {
        type: OptionType.BOOLEAN,
        description: "Auto-save embeds as you build them",
        default: true
    },
    showPreview: {
        type: OptionType.BOOLEAN,
        description: "Show live preview while editing",
        default: true
    },
    enableTemplates: {
        type: OptionType.BOOLEAN,
        description: "Enable embed templates from your bot",
        default: true
    }
});

async function fetchSavedEmbeds(guildId: string): Promise<SavedEmbeds | null> {
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

function parsePlaceholders(text: string, guildId?: string, channelId?: string, userId?: string): string {
    if (!text) return text;
    
    const guild = guildId ? GuildStore.getGuild(guildId) : null;
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    const user = userId ? UserStore.getUser(userId) : UserStore.getCurrentUser();
    
    return text
        .replace(/{user}/g, user ? `<@${user.id}>` : "{user}")
        .replace(/{username}/g, user?.username || "{username}")
        .replace(/{usertag}/g, user ? `${user.username}#${user.discriminator || "0000"}` : "{usertag}")
        .replace(/{userid}/g, user?.id || "{userid}")
        .replace(/{channel}/g, channel ? `<#${channel.id}>` : "{channel}")
        .replace(/{channelname}/g, channel?.name || "{channelname}")
        .replace(/{guild}/g, guild?.name || "{guild}")
        .replace(/{guildid}/g, guild?.id || "{guildid}")
        .replace(/{date}/g, new Date().toLocaleDateString())
        .replace(/{time}/g, new Date().toLocaleTimeString())
        .replace(/{datetime}/g, new Date().toLocaleString());
}

export default definePlugin({
    name: "EnhancedEmbedBuilder",
    description: "Advanced embed builder with templates, live preview, and bot integration 🌸",
    authors: [
        {
            name: "taco.ot",
            id: 905201724539666503n
        }
    ],
    dependencies: ["CommandsAPI"],

    settings,

    commands: [
        {
            name: "embed",
            description: "🌸 Create beautiful embeds with templates and live preview",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "action",
                    description: "What to do with embeds",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        { name: "Create New", value: "create" },
                        { name: "Edit Existing", value: "edit" },
                        { name: "Load Template", value: "load" },
                        { name: "Quick Send", value: "send" }
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
                const action = findOption(args, "action", "create");
                const templateName = findOption(args, "template");
                const guildId = ctx.guild?.id;
                const channelId = ctx.channel.id;

                if (!guildId) {
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ This command can only be used in servers!"
                    });
                    return;
                }

                if (!settings.store.apiUrl || !settings.store.authToken) {
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ Please configure your API URL and authentication token in plugin settings!"
                    });
                    return;
                }

                try {
                    let savedEmbeds: SavedEmbeds | null = null;
                    let initialEmbed: SavedEmbed | null = null;

                    // Fetch saved embeds if needed
                    if (action === "edit" || action === "load" || settings.store.enableTemplates) {
                        savedEmbeds = await fetchSavedEmbeds(guildId);
                    }

                    // Load specific template if requested
                    if (action === "load" && templateName && savedEmbeds) {
                        initialEmbed = savedEmbeds[templateName] || null;
                        if (!initialEmbed) {
                            sendBotMessage(ctx.channel.id, {
                                content: `❌ Template "${templateName}" not found!`
                            });
                            return;
                        }
                    }

                    // Open embed builder modal
                    openModal(props => (
                        <EmbedBuilderModal
                            {...props}
                            guildId={guildId}
                            channelId={channelId}
                            userId={ctx.user.id}
                            action={action}
                            initialEmbed={initialEmbed}
                            savedEmbeds={savedEmbeds || {}}
                            onSave={(name, embed) => saveEmbed(guildId, name, embed)}
                            parsePlaceholders={(text) => parsePlaceholders(text, guildId, channelId, ctx.user.id)}
                        />
                    ));

                } catch (error) {
                    console.error("Embed builder error:", error);
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ An error occurred while opening the embed builder."
                    });
                }
            }
        }
    ],

    // Helper function for other plugins
    async getSavedEmbeds(guildId: string) {
        return await fetchSavedEmbeds(guildId);
    },

    async saveEmbedTemplate(guildId: string, name: string, embed: SavedEmbed) {
        return await saveEmbed(guildId, name, embed);
    },

    parsePlaceholders
});
