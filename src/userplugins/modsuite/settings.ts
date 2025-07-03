/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    // UI Settings
    showFloatingButton: {
        type: OptionType.BOOLEAN,
        description: "Show floating action button for quick access to mod tools",
        default: true,
    },
    floatingButtonPosition: {
        type: OptionType.STRING,
        description: "Position of floating button (JSON format: {\"x\": 20, \"y\": 100})",
        default: JSON.stringify({ x: 20, y: 100 }),
        hidden: true,
    },
    showSidebar: {
        type: OptionType.BOOLEAN,
        description: "Show moderation sidebar panel",
        default: false,
    },
    enableContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Add moderation options to context menus",
        default: true,
    },

    // Feature Toggles
    enableQuickActions: {
        type: OptionType.BOOLEAN,
        description: "Enable quick moderation actions panel",
        default: true,
    },
    enableMassDeleter: {
        type: OptionType.BOOLEAN,
        description: "Enable mass message deletion helper",
        default: true,
    },
    enablePingMonitor: {
        type: OptionType.BOOLEAN,
        description: "Enable ping frequency monitoring",
        default: true,
    },
    enableModlogEnhancer: {
        type: OptionType.BOOLEAN,
        description: "Enable enhanced audit log viewer",
        default: true,
    },
    enableUserTracking: {
        type: OptionType.BOOLEAN,
        description: "Enable user message tracking",
        default: true,
    },

    // Ping Monitor Settings
    pingThreshold: {
        type: OptionType.NUMBER,
        description: "Maximum pings allowed within time window before showing warning",
        default: 5,
        markers: [1, 3, 5, 10, 15, 20],
    },
    pingTimeWindow: {
        type: OptionType.NUMBER,
        description: "Time window for ping monitoring (in minutes)",
        default: 10,
        markers: [1, 5, 10, 15, 30, 60],
    },
    showPingIndicator: {
        type: OptionType.BOOLEAN,
        description: "Show visual indicator when users exceed ping threshold",
        default: true,
    },

    // Mass Deletion Settings
    maxBulkDeleteCount: {
        type: OptionType.NUMBER,
        description: "Maximum number of messages to delete in one operation",
        default: 100,
        markers: [10, 25, 50, 100, 200, 500],
    },
    requireConfirmation: {
        type: OptionType.BOOLEAN,
        description: "Require confirmation before bulk deleting messages",
        default: true,
    },
    showDeletePreview: {
        type: OptionType.BOOLEAN,
        description: "Show preview of messages to be deleted",
        default: true,
    },

    // Modlog Settings
    showAvatars: {
        type: OptionType.BOOLEAN,
        description: "Show user avatars in audit log entries",
        default: true,
    },
    maxLogEntries: {
        type: OptionType.NUMBER,
        description: "Maximum number of audit log entries to display",
        default: 50,
        markers: [25, 50, 100, 200, 500],
    },
    autoRefresh: {
        type: OptionType.BOOLEAN,
        description: "Automatically refresh audit log",
        default: false,
    },
    refreshInterval: {
        type: OptionType.NUMBER,
        description: "Auto-refresh interval (in seconds)",
        default: 30,
        markers: [10, 30, 60, 120, 300],
        disabled: () => !settings.store.autoRefresh,
    },

    // User Tracking Settings
    maxTrackedMessages: {
        type: OptionType.NUMBER,
        description: "Maximum number of messages to track per user",
        default: 50,
        markers: [10, 25, 50, 100, 200],
    },
    trackingTimeLimit: {
        type: OptionType.NUMBER,
        description: "How long to track messages (in hours)",
        default: 24,
        markers: [1, 6, 12, 24, 48, 168],
    },

    // Quick Actions Settings
    showActionLabels: {
        type: OptionType.BOOLEAN,
        description: "Show labels on quick action buttons",
        default: true,
    },
    compactMode: {
        type: OptionType.BOOLEAN,
        description: "Use compact mode for action panels",
        default: false,
    },
    confirmDangerousActions: {
        type: OptionType.BOOLEAN,
        description: "Require confirmation for dangerous actions (ban, kick, etc.)",
        default: true,
    },

    // Theme Settings
    useCustomTheme: {
        type: OptionType.BOOLEAN,
        description: "Use custom pink theme for ModSuite components",
        default: true,
    },
    themeOpacity: {
        type: OptionType.SLIDER,
        description: "Theme opacity",
        default: 0.9,
        markers: [0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
        stickToMarkers: false,
        disabled: () => !settings.store.useCustomTheme,
    },
    accentColor: {
        type: OptionType.SELECT,
        description: "Accent color for the theme",
        default: "pink",
        options: [
            { label: "Pink", value: "pink" },
            { label: "Rose", value: "rose" },
            { label: "Magenta", value: "magenta" },
            { label: "Purple", value: "purple" },
            { label: "Violet", value: "violet" },
        ],
        disabled: () => !settings.store.useCustomTheme,
    },

    // Performance Settings
    enableCaching: {
        type: OptionType.BOOLEAN,
        description: "Enable caching for better performance",
        default: true,
    },
    cacheTimeout: {
        type: OptionType.NUMBER,
        description: "Cache timeout (in seconds)",
        default: 30,
        markers: [10, 30, 60, 120, 300],
        disabled: () => !settings.store.enableCaching,
    },
    maxCacheSize: {
        type: OptionType.NUMBER,
        description: "Maximum cache size (number of entries)",
        default: 1000,
        markers: [100, 500, 1000, 2000, 5000],
        disabled: () => !settings.store.enableCaching,
    },

    // Debug Settings
    enableDebugMode: {
        type: OptionType.BOOLEAN,
        description: "Enable debug mode (shows additional logging)",
        default: false,
    },
    logLevel: {
        type: OptionType.SELECT,
        description: "Logging level",
        default: "info",
        options: [
            { label: "Error", value: "error" },
            { label: "Warn", value: "warn" },
            { label: "Info", value: "info" },
            { label: "Debug", value: "debug" },
        ],
        disabled: () => !settings.store.enableDebugMode,
    },
});

// Helper functions for settings
export function getFloatingButtonPosition(): { x: number; y: number } {
    try {
        return JSON.parse(settings.store.floatingButtonPosition);
    } catch {
        return { x: 20, y: 100 };
    }
}

export function setFloatingButtonPosition(position: { x: number; y: number }): void {
    settings.store.floatingButtonPosition = JSON.stringify(position);
}

export function isFeatureEnabled(feature: keyof typeof settings.store): boolean {
    return Boolean(settings.store[feature]);
}

export function getThemeColors() {
    const accent = settings.store.accentColor;
    const opacity = settings.store.themeOpacity;
    
    const colors = {
        pink: {
            primary: `rgba(236, 72, 153, ${opacity})`,
            secondary: `rgba(251, 207, 232, ${opacity})`,
            accent: `rgba(219, 39, 119, ${opacity})`,
            background: `rgba(253, 242, 248, ${opacity})`,
            text: `rgba(136, 19, 55, ${opacity})`,
        },
        rose: {
            primary: `rgba(244, 63, 94, ${opacity})`,
            secondary: `rgba(254, 205, 211, ${opacity})`,
            accent: `rgba(225, 29, 72, ${opacity})`,
            background: `rgba(255, 241, 242, ${opacity})`,
            text: `rgba(136, 19, 32, ${opacity})`,
        },
        magenta: {
            primary: `rgba(217, 70, 239, ${opacity})`,
            secondary: `rgba(243, 232, 255, ${opacity})`,
            accent: `rgba(192, 38, 211, ${opacity})`,
            background: `rgba(253, 244, 255, ${opacity})`,
            text: `rgba(112, 26, 117, ${opacity})`,
        },
        purple: {
            primary: `rgba(168, 85, 247, ${opacity})`,
            secondary: `rgba(233, 213, 255, ${opacity})`,
            accent: `rgba(147, 51, 234, ${opacity})`,
            background: `rgba(250, 245, 255, ${opacity})`,
            text: `rgba(88, 28, 135, ${opacity})`,
        },
        violet: {
            primary: `rgba(139, 92, 246, ${opacity})`,
            secondary: `rgba(221, 214, 254, ${opacity})`,
            accent: `rgba(124, 58, 237, ${opacity})`,
            background: `rgba(245, 243, 255, ${opacity})`,
            text: `rgba(76, 29, 149, ${opacity})`,
        },
    };
    
    return colors[accent as keyof typeof colors] || colors.pink;
}
