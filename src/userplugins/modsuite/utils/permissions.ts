/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, GuildStore, PermissionsBits, PermissionStore, UserStore } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { PermissionCheck } from "../types";

/**
 * Check if the current user has a specific permission in a channel
 */
export function hasPermission(permission: bigint, channel?: Channel): boolean {
    if (!channel) return false;
    
    // DMs don't have permissions
    if (channel.isDM() || channel.isGroupDM()) return false;
    
    return PermissionStore.can(permission, channel);
}

/**
 * Check if the current user has a specific permission in a guild
 */
export function hasGuildPermission(permission: bigint, guildId?: string): boolean {
    if (!guildId) return false;
    
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return false;
    
    return PermissionStore.can(permission, guild);
}

/**
 * Get comprehensive permission check for moderation actions
 */
export function getPermissionCheck(channel?: Channel): PermissionCheck {
    if (!channel || channel.isDM() || channel.isGroupDM()) {
        return {
            canKick: false,
            canBan: false,
            canTimeout: false,
            canMute: false,
            canDeleteMessages: false,
            canManageChannels: false,
            canManageMessages: false,
            canViewAuditLog: false,
        };
    }

    return {
        canKick: hasPermission(PermissionsBits.KICK_MEMBERS, channel),
        canBan: hasPermission(PermissionsBits.BAN_MEMBERS, channel),
        canTimeout: hasPermission(PermissionsBits.MODERATE_MEMBERS, channel),
        canMute: hasPermission(PermissionsBits.MUTE_MEMBERS, channel),
        canDeleteMessages: hasPermission(PermissionsBits.MANAGE_MESSAGES, channel),
        canManageChannels: hasPermission(PermissionsBits.MANAGE_CHANNELS, channel),
        canManageMessages: hasPermission(PermissionsBits.MANAGE_MESSAGES, channel),
        canViewAuditLog: hasPermission(PermissionsBits.VIEW_AUDIT_LOG, channel),
    };
}

/**
 * Check if the current user can perform a specific action on a target user
 */
export function canModerateUser(targetUser: User, channel?: Channel): boolean {
    if (!channel || !targetUser) return false;
    
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser || currentUser.id === targetUser.id) return false;
    
    const guild = GuildStore.getGuild(channel.guild_id);
    if (!guild) return false;
    
    // Check if target is guild owner
    if (guild.ownerId === targetUser.id) return false;
    
    // Check if current user is guild owner
    if (guild.ownerId === currentUser.id) return true;
    
    // Compare highest roles
    const currentUserMember = guild.members?.[currentUser.id];
    const targetUserMember = guild.members?.[targetUser.id];
    
    if (!currentUserMember || !targetUserMember) return false;
    
    const currentUserHighestRole = getHighestRole(currentUserMember.roles, guild);
    const targetUserHighestRole = getHighestRole(targetUserMember.roles, guild);
    
    return currentUserHighestRole.position > targetUserHighestRole.position;
}

/**
 * Get the highest role from a list of role IDs
 */
function getHighestRole(roleIds: string[], guild: Guild) {
    let highestRole = { position: 0, id: guild.id }; // @everyone role
    
    for (const roleId of roleIds) {
        const role = guild.roles[roleId];
        if (role && role.position > highestRole.position) {
            highestRole = role;
        }
    }
    
    return highestRole;
}

/**
 * Check if the current user can delete messages in a channel
 */
export function canDeleteMessages(channel?: Channel): boolean {
    if (!channel) return false;
    
    // Can always delete own messages in DMs
    if (channel.isDM() || channel.isGroupDM()) return true;
    
    return hasPermission(PermissionsBits.MANAGE_MESSAGES, channel);
}

/**
 * Check if the current user can manage a specific channel
 */
export function canManageChannel(channel?: Channel): boolean {
    if (!channel) return false;
    
    // Can't manage DMs
    if (channel.isDM() || channel.isGroupDM()) return false;
    
    return hasPermission(PermissionsBits.MANAGE_CHANNELS, channel);
}

/**
 * Check if the current user can view audit logs
 */
export function canViewAuditLog(guildId?: string): boolean {
    if (!guildId) return false;
    
    return hasGuildPermission(PermissionsBits.VIEW_AUDIT_LOG, guildId);
}

/**
 * Check if the current user can kick members
 */
export function canKickMembers(channel?: Channel): boolean {
    if (!channel) return false;
    
    return hasPermission(PermissionsBits.KICK_MEMBERS, channel);
}

/**
 * Check if the current user can ban members
 */
export function canBanMembers(channel?: Channel): boolean {
    if (!channel) return false;
    
    return hasPermission(PermissionsBits.BAN_MEMBERS, channel);
}

/**
 * Check if the current user can timeout members
 */
export function canTimeoutMembers(channel?: Channel): boolean {
    if (!channel) return false;
    
    return hasPermission(PermissionsBits.MODERATE_MEMBERS, channel);
}

/**
 * Check if the current user can mute members in voice
 */
export function canMuteMembers(channel?: Channel): boolean {
    if (!channel) return false;
    
    return hasPermission(PermissionsBits.MUTE_MEMBERS, channel);
}

/**
 * Check if the current user has any moderation permissions
 */
export function hasAnyModPermissions(channel?: Channel): boolean {
    if (!channel) return false;
    
    const permissions = getPermissionCheck(channel);
    
    return Object.values(permissions).some(Boolean);
}

/**
 * Get all channels where the user has moderation permissions
 */
export function getModerableChannels(guildId?: string): Channel[] {
    if (!guildId) return [];
    
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return [];
    
    const channels = Object.values(guild.channels || {}) as Channel[];
    
    return channels.filter(channel => hasAnyModPermissions(channel));
}

/**
 * Check if a channel is moderatable (has any mod permissions)
 */
export function isChannelModerable(channelId: string): boolean {
    const channel = ChannelStore.getChannel(channelId);
    return hasAnyModPermissions(channel);
}

/**
 * Get permission level description
 */
export function getPermissionLevel(channel?: Channel): string {
    if (!channel) return "No Access";
    
    if (channel.isDM() || channel.isGroupDM()) return "Direct Message";
    
    const permissions = getPermissionCheck(channel);
    
    if (permissions.canBan && permissions.canKick) return "Full Moderator";
    if (permissions.canTimeout || permissions.canMute) return "Limited Moderator";
    if (permissions.canDeleteMessages) return "Message Manager";
    if (permissions.canManageChannels) return "Channel Manager";
    
    return "No Permissions";
}

/**
 * Cache for permission checks to avoid repeated calculations
 */
const permissionCache = new Map<string, { permissions: PermissionCheck; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get cached permission check or calculate new one
 */
export function getCachedPermissionCheck(channelId: string): PermissionCheck {
    const cached = permissionCache.get(channelId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.permissions;
    }
    
    const channel = ChannelStore.getChannel(channelId);
    const permissions = getPermissionCheck(channel);
    
    permissionCache.set(channelId, { permissions, timestamp: now });
    
    return permissions;
}

/**
 * Clear permission cache
 */
export function clearPermissionCache(): void {
    permissionCache.clear();
}
