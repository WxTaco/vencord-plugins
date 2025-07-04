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
import { FluxDispatcher, GuildStore, UserStore } from "@webpack/common";

import { AnalyticsModal } from "./components/AnalyticsModal";

const { openModal } = findByPropsLazy("openModal", "closeModal");

interface AnalyticsData {
    success: boolean;
    timeframe: string;
    data: {
        commandActivity: Array<{
            hour: string;
            command_name: string;
            count: number;
        }>;
        userActivity: Array<{
            user_id: string;
            activity_score: number;
        }>;
        moderationActivity: Array<{
            action: string;
            count: number;
            hour: string;
        }>;
        lastUpdated: string;
    };
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
    autoRefresh: {
        type: OptionType.BOOLEAN,
        description: "Auto-refresh analytics every 30 seconds",
        default: true
    },
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for significant events",
        default: true
    }
});

async function fetchAnalytics(guildId: string, timeframe: string = "24h"): Promise<AnalyticsData | null> {
    try {
        const response = await fetch(`${settings.store.apiUrl}/api/vencord/guilds/${guildId}/analytics/realtime?timeframe=${timeframe}`, {
            headers: {
                "Authorization": `Bearer ${settings.store.authToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return null;
    }
}

export default definePlugin({
    name: "ServerAnalytics",
    description: "Real-time server analytics with beautiful charts and insights 🌸",
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
            name: "analytics",
            description: "🌸 View real-time server analytics and insights",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "timeframe",
                    description: "Time period for analytics",
                    type: ApplicationCommandOptionType.STRING,
                    choices: [
                        { name: "Last Hour", value: "1h" },
                        { name: "Last 24 Hours", value: "24h" },
                        { name: "Last 7 Days", value: "7d" }
                    ],
                    required: false
                }
            ],
            execute: async (args, ctx) => {
                const timeframe = findOption(args, "timeframe", "24h");
                const guildId = ctx.guild?.id;

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

                // Show loading message
                sendBotMessage(ctx.channel.id, {
                    content: "🌸 Loading analytics data..."
                });

                try {
                    const analyticsData = await fetchAnalytics(guildId, timeframe);
                    
                    if (!analyticsData || !analyticsData.success) {
                        sendBotMessage(ctx.channel.id, {
                            content: "❌ Failed to fetch analytics data. Please check your configuration."
                        });
                        return;
                    }

                    // Open analytics modal
                    openModal(props => (
                        <AnalyticsModal
                            {...props}
                            guildId={guildId}
                            timeframe={timeframe}
                            data={analyticsData}
                            onRefresh={() => fetchAnalytics(guildId, timeframe)}
                        />
                    ));

                } catch (error) {
                    console.error("Analytics command error:", error);
                    sendBotMessage(ctx.channel.id, {
                        content: "❌ An error occurred while fetching analytics data."
                    });
                }
            }
        }
    ],

    start() {
        // Set up auto-refresh if enabled
        if (settings.store.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                // Refresh analytics for currently viewed guild
                const currentGuildId = GuildStore.getGuildId();
                if (currentGuildId && this.isAnalyticsModalOpen) {
                    fetchAnalytics(currentGuildId).then(data => {
                        if (data && settings.store.showNotifications) {
                            // Could show notifications for significant changes
                            FluxDispatcher.dispatch({
                                type: "ANALYTICS_DATA_UPDATED",
                                guildId: currentGuildId,
                                data
                            });
                        }
                    });
                }
            }, 30000); // 30 seconds
        }
    },

    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    refreshInterval: null as NodeJS.Timeout | null,
    isAnalyticsModalOpen: false,

    // Helper methods for other plugins to use
    async getServerHealth(guildId: string) {
        try {
            const response = await fetch(`${settings.store.apiUrl}/api/vencord/guilds/${guildId}/health`, {
                headers: {
                    "Authorization": `Bearer ${settings.store.authToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    },

    async getUserContext(guildId: string, userId: string) {
        try {
            const response = await fetch(`${settings.store.apiUrl}/api/vencord/guilds/${guildId}/users/${userId}/context`, {
                headers: {
                    "Authorization": `Bearer ${settings.store.authToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    }
});
