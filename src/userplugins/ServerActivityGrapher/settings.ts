/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enableMessageTracking: {
        type: OptionType.BOOLEAN,
        description: "Track message activity for charts and analytics",
        default: true,
        restartNeeded: false
    },
    enableJoinLeaveTracking: {
        type: OptionType.BOOLEAN,
        description: "Track user join/leave events",
        default: true,
        restartNeeded: false
    },
    enablePingTracking: {
        type: OptionType.BOOLEAN,
        description: "Track @everyone, @here, and role mentions",
        default: true,
        restartNeeded: false
    },
    maxDataDays: {
        type: OptionType.NUMBER,
        description: "Maximum days of data to keep (0 = unlimited)",
        default: 30,
        restartNeeded: false
    },
    trackBotMessages: {
        type: OptionType.BOOLEAN,
        description: "Include bot messages in activity tracking",
        default: false,
        restartNeeded: false
    },
    enableHeatmap: {
        type: OptionType.BOOLEAN,
        description: "Enable day-vs-hour heatmap visualization",
        default: true,
        restartNeeded: false
    },
    autoSaveInterval: {
        type: OptionType.SELECT,
        description: "How often to save activity data",
        options: [
            { label: "Every 5 minutes", value: 5, default: false },
            { label: "Every 15 minutes", value: 15, default: true },
            { label: "Every 30 minutes", value: 30, default: false },
            { label: "Every hour", value: 60, default: false }
        ],
        restartNeeded: false
    },
    defaultTimeRange: {
        type: OptionType.SELECT,
        description: "Default time range for charts",
        options: [
            { label: "Last 24 hours", value: "24h", default: false },
            { label: "Last 7 days", value: "7d", default: true },
            { label: "Last 30 days", value: "30d", default: false },
            { label: "All time", value: "all", default: false }
        ],
        restartNeeded: false
    },
    chartTheme: {
        type: OptionType.SELECT,
        description: "Chart color theme",
        options: [
            { label: "Blue Ocean", value: "blue", default: true },
            { label: "Purple Galaxy", value: "purple", default: false },
            { label: "Green Forest", value: "green", default: false },
            { label: "Orange Sunset", value: "orange", default: false },
            { label: "Pink Blossom", value: "pink", default: false }
        ],
        restartNeeded: false
    },
    enableNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for activity milestones",
        default: false,
        restartNeeded: false
    },
    compactMode: {
        type: OptionType.BOOLEAN,
        description: "Use compact layout for smaller screens",
        default: false,
        restartNeeded: false
    },
    enableHistoryFetching: {
        type: OptionType.BOOLEAN,
        description: "Enable fetching message history from Discord API",
        default: true,
        restartNeeded: false
    },
    historyFetchDays: {
        type: OptionType.NUMBER,
        description: "Days of history to fetch from API (max 30)",
        default: 7,
        restartNeeded: false
    },
    maxMessagesPerChannel: {
        type: OptionType.NUMBER,
        description: "Maximum messages to fetch per channel",
        default: 1000,
        restartNeeded: false
    },
    apiRateLimit: {
        type: OptionType.NUMBER,
        description: "Delay between API requests (milliseconds)",
        default: 1000,
        restartNeeded: false
    },
    autoFetchOnOpen: {
        type: OptionType.BOOLEAN,
        description: "Automatically fetch history when opening analytics",
        default: false,
        restartNeeded: false
    }
});
