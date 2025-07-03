/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Guild, Message, User } from "discord-types/general";

export interface ModSuiteSettings {
    // UI Settings
    showFloatingButton: boolean;
    floatingButtonPosition: { x: number; y: number };
    showSidebar: boolean;
    enableContextMenu: boolean;
    
    // Ping Monitor Settings
    pingThreshold: number;
    pingTimeWindow: number; // in minutes
    showPingIndicator: boolean;
    
    // Mass Deletion Settings
    maxBulkDeleteCount: number;
    requireConfirmation: boolean;
    
    // Modlog Settings
    showAvatars: boolean;
    maxLogEntries: number;
    autoRefresh: boolean;
    refreshInterval: number; // in seconds
    
    // Feature Toggles
    enableQuickActions: boolean;
    enableMassDeleter: boolean;
    enablePingMonitor: boolean;
    enableModlogEnhancer: boolean;
    enableUserTracking: boolean;
}

export interface ModAction {
    type: 'kick' | 'ban' | 'timeout' | 'mute' | 'delete' | 'purge' | 'lock' | 'slowmode';
    label: string;
    icon: string;
    permission: bigint;
    color?: string;
    requiresReason?: boolean;
    requiresTarget?: boolean;
}

export interface QuickActionProps {
    channel: Channel;
    guild?: Guild;
    user?: User;
    onAction: (action: ModAction, data?: any) => void;
}

export interface MassDeleteFilter {
    keyword?: string;
    channelId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    messageType?: 'all' | 'text' | 'media' | 'embeds';
    hasAttachments?: boolean;
}

export interface MassDeletePreview {
    messages: Message[];
    totalCount: number;
    estimatedTime: number; // in seconds
    channels: { id: string; name: string; count: number }[];
}

export interface PingData {
    userId: string;
    username: string;
    pings: PingEvent[];
    totalPings: number;
    recentPings: number; // within time window
    isOverThreshold: boolean;
}

export interface PingEvent {
    timestamp: number;
    channelId: string;
    messageId: string;
    type: 'user' | 'role' | 'everyone' | 'here';
    targetId?: string; // user or role ID
}

export interface UserTrackingData {
    userId: string;
    username: string;
    messages: TrackedMessage[];
    channels: string[];
    lastSeen: number;
    messageCount: number;
}

export interface TrackedMessage {
    id: string;
    channelId: string;
    content: string;
    timestamp: number;
    edited?: boolean;
    deleted?: boolean;
}

export interface AuditLogEntry {
    id: string;
    actionType: number;
    targetId?: string;
    userId: string;
    reason?: string;
    timestamp: number;
    changes?: AuditLogChange[];
    options?: Record<string, any>;
}

export interface AuditLogChange {
    key: string;
    oldValue?: any;
    newValue?: any;
}

export interface ModlogFilter {
    actionTypes: number[];
    userId?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    hasReason?: boolean;
}

export interface FloatingButtonProps {
    position: { x: number; y: number };
    onPositionChange: (position: { x: number; y: number }) => void;
    onToggle: () => void;
    isVisible: boolean;
}

export interface ModPanelProps {
    channel: Channel;
    guild?: Guild;
    isVisible: boolean;
    onClose: () => void;
}

export interface PermissionCheck {
    canKick: boolean;
    canBan: boolean;
    canTimeout: boolean;
    canMute: boolean;
    canDeleteMessages: boolean;
    canManageChannels: boolean;
    canManageMessages: boolean;
    canViewAuditLog: boolean;
}

export interface ComponentState {
    isLoading: boolean;
    error?: string;
    data?: any;
}

export interface ModSuiteStore {
    settings: ModSuiteSettings;
    pingData: Map<string, PingData>;
    userTracking: Map<string, UserTrackingData>;
    auditLogs: AuditLogEntry[];
    permissions: Map<string, PermissionCheck>;
}

export interface ActionResult {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}

export interface BulkActionProgress {
    total: number;
    completed: number;
    failed: number;
    isRunning: boolean;
    currentAction?: string;
}

// Discord API Types Extensions
export interface ExtendedChannel extends Channel {
    rateLimitPerUser?: number;
    flags?: number;
}

export interface ExtendedGuild extends Guild {
    auditLog?: AuditLogEntry[];
}

export interface ExtendedMessage extends Message {
    pinged?: boolean;
    tracked?: boolean;
}

// Component Props Types
export interface BaseComponentProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    size?: 'small' | 'medium' | 'large';
}

export interface ButtonProps extends BaseComponentProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
}

export interface InputProps extends BaseComponentProps {
    type?: 'text' | 'number' | 'password' | 'email';
    placeholder?: string;
    value?: string | number;
    onChange?: (value: string | number) => void;
    disabled?: boolean;
    error?: string;
}

// Event Types
export type ModSuiteEvent = 
    | { type: 'PING_DETECTED'; data: PingEvent }
    | { type: 'USER_MESSAGE'; data: TrackedMessage }
    | { type: 'AUDIT_LOG_UPDATE'; data: AuditLogEntry }
    | { type: 'PERMISSION_CHANGE'; data: { channelId: string; permissions: PermissionCheck } }
    | { type: 'SETTINGS_UPDATE'; data: Partial<ModSuiteSettings> };

export type EventHandler<T = any> = (event: T) => void;

// Utility Types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
