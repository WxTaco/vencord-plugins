/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Permission utilities
export {
    hasPermission,
    hasGuildPermission,
    getPermissionCheck,
    canModerateUser,
    canDeleteMessages,
    canManageChannel,
    canViewAuditLog,
    canKickMembers,
    canBanMembers,
    canTimeoutMembers,
    canMuteMembers,
    hasAnyModPermissions,
    getModerableChannels,
    isChannelModerable,
    getPermissionLevel,
    getCachedPermissionCheck,
    clearPermissionCache
} from "./permissions";

// Message monitoring
export {
    MessageMonitor,
    messageMonitor,
    initializeMessageMonitoring,
    checkMonitoringStatus,
    getUserAnalytics,
    getServerAnalytics
} from "./messageMonitor";

// Re-export types
export type {
    PermissionCheck,
    ModSuiteSettings,
    ModAction,
    PingData,
    PingEvent,
    UserTrackingData,
    TrackedMessage,
    AuditLogEntry,
    MassDeleteFilter,
    MassDeletePreview,
    BulkActionProgress
} from "../types";
