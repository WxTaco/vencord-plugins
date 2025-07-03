/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ChannelStore, Constants, PermissionsBits, RestAPI, showToast, Toasts } from "@webpack/common";
import { React, useState } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

import { settings } from "../settings";
import { ModAction, QuickActionProps } from "../types";
import { getPermissionCheck } from "../utils/permissions";

const cl = classNameFactory("ms-");

// Action definitions with their required permissions and icons
const MOD_ACTIONS: ModAction[] = [
    {
        type: 'kick',
        label: 'Kick',
        icon: '👢',
        permission: PermissionsBits.KICK_MEMBERS,
        color: 'warning',
        requiresReason: true,
        requiresTarget: true
    },
    {
        type: 'ban',
        label: 'Ban',
        icon: '🔨',
        permission: PermissionsBits.BAN_MEMBERS,
        color: 'danger',
        requiresReason: true,
        requiresTarget: true
    },
    {
        type: 'timeout',
        label: 'Timeout',
        icon: '⏰',
        permission: PermissionsBits.MODERATE_MEMBERS,
        color: 'warning',
        requiresReason: true,
        requiresTarget: true
    },
    {
        type: 'mute',
        label: 'Mute',
        icon: '🔇',
        permission: PermissionsBits.MUTE_MEMBERS,
        requiresTarget: true
    },
    {
        type: 'delete',
        label: 'Delete Msgs',
        icon: '🗑️',
        permission: PermissionsBits.MANAGE_MESSAGES
    },
    {
        type: 'purge',
        label: 'Purge',
        icon: '🧹',
        permission: PermissionsBits.MANAGE_MESSAGES,
        color: 'danger'
    },
    {
        type: 'lock',
        label: 'Lock Channel',
        icon: '🔒',
        permission: PermissionsBits.MANAGE_CHANNELS
    },
    {
        type: 'slowmode',
        label: 'Slowmode',
        icon: '🐌',
        permission: PermissionsBits.MANAGE_CHANNELS
    }
];

const ActionIcon: React.FC<{ action: ModAction }> = ({ action }) => {
    // For now using emoji, but could be replaced with proper SVG icons
    return <span style={{ fontSize: '16px' }}>{action.icon}</span>;
};

const ActionButton: React.FC<{
    action: ModAction;
    disabled: boolean;
    onClick: () => void;
}> = ({ action, disabled, onClick }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        if (disabled || isLoading) return;
        
        setIsLoading(true);
        try {
            await onClick();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            className={cl("action-button", {
                danger: action.color === 'danger',
                warning: action.color === 'warning'
            })}
            disabled={disabled || isLoading}
            onClick={handleClick}
            title={`${action.label}${disabled ? ' (No Permission)' : ''}`}
        >
            {isLoading ? (
                <div className={cl("spinner")} />
            ) : (
                <ActionIcon action={action} />
            )}
            {settings.store.showActionLabels && (
                <span>{action.label}</span>
            )}
        </button>
    );
};

export const QuickActions: React.FC<QuickActionProps> = ({
    channel,
    guild,
    user,
    onAction
}) => {
    const permissions = getPermissionCheck(channel);
    
    const handleAction = async (action: ModAction) => {
        if (settings.store.confirmDangerousActions && 
            (action.color === 'danger' || action.type === 'kick' || action.type === 'ban')) {
            
            const confirmed = confirm(`Are you sure you want to ${action.label.toLowerCase()}?`);
            if (!confirmed) return;
        }

        try {
            await executeAction(action, channel, guild, user);
            onAction(action);
            showToast(`${action.label} action completed`, Toasts.Type.SUCCESS);
        } catch (error) {
            console.error(`Failed to execute ${action.type}:`, error);
            showToast(`Failed to ${action.label.toLowerCase()}: ${error.message}`, Toasts.Type.FAILURE);
        }
    };

    const isActionEnabled = (action: ModAction): boolean => {
        switch (action.type) {
            case 'kick':
                return permissions.canKick;
            case 'ban':
                return permissions.canBan;
            case 'timeout':
                return permissions.canTimeout;
            case 'mute':
                return permissions.canMute;
            case 'delete':
            case 'purge':
                return permissions.canDeleteMessages;
            case 'lock':
            case 'slowmode':
                return permissions.canManageChannels;
            default:
                return false;
        }
    };

    if (!settings.store.enableQuickActions) {
        return null;
    }

    return (
        <ErrorBoundary noop>
            <div className={cl("quick-actions")}>
                {MOD_ACTIONS.map(action => (
                    <ActionButton
                        key={action.type}
                        action={action}
                        disabled={!isActionEnabled(action)}
                        onClick={() => handleAction(action)}
                    />
                ))}
            </div>
        </ErrorBoundary>
    );
};

// Action execution functions
async function executeAction(
    action: ModAction,
    channel: Channel,
    guild?: Guild,
    user?: any
): Promise<void> {
    if (!channel || (!guild && !channel.isDM())) {
        throw new Error('Invalid channel or guild');
    }

    switch (action.type) {
        case 'kick':
            if (!user) throw new Error('No user selected');
            await kickUser(guild!.id, user.id);
            break;
            
        case 'ban':
            if (!user) throw new Error('No user selected');
            await banUser(guild!.id, user.id);
            break;
            
        case 'timeout':
            if (!user) throw new Error('No user selected');
            await timeoutUser(guild!.id, user.id);
            break;
            
        case 'mute':
            if (!user) throw new Error('No user selected');
            await muteUser(guild!.id, user.id);
            break;
            
        case 'delete':
            await openDeleteMessagesDialog(channel.id);
            break;
            
        case 'purge':
            await openPurgeDialog(channel.id);
            break;
            
        case 'lock':
            await lockChannel(channel.id);
            break;
            
        case 'slowmode':
            await openSlowmodeDialog(channel.id);
            break;
            
        default:
            throw new Error(`Unknown action: ${action.type}`);
    }
}

// Individual action implementations
async function kickUser(guildId: string, userId: string): Promise<void> {
    const reason = prompt('Reason for kick (optional):') || undefined;
    
    await RestAPI.delete({
        url: Constants.Endpoints.GUILD_MEMBER(guildId, userId),
        body: reason ? { reason } : undefined
    });
}

async function banUser(guildId: string, userId: string): Promise<void> {
    const reason = prompt('Reason for ban (optional):') || undefined;
    const deleteMessageDays = confirm('Delete messages from the last 7 days?') ? 7 : 0;
    
    await RestAPI.put({
        url: Constants.Endpoints.GUILD_BAN(guildId, userId),
        body: {
            reason,
            delete_message_days: deleteMessageDays
        }
    });
}

async function timeoutUser(guildId: string, userId: string): Promise<void> {
    const duration = prompt('Timeout duration in minutes (max 40320 = 28 days):');
    if (!duration || isNaN(Number(duration))) {
        throw new Error('Invalid duration');
    }
    
    const durationMs = Math.min(Number(duration) * 60 * 1000, 40320 * 60 * 1000);
    const until = new Date(Date.now() + durationMs).toISOString();
    const reason = prompt('Reason for timeout (optional):') || undefined;
    
    await RestAPI.patch({
        url: Constants.Endpoints.GUILD_MEMBER(guildId, userId),
        body: {
            communication_disabled_until: until,
            reason
        }
    });
}

async function muteUser(guildId: string, userId: string): Promise<void> {
    // This would need to be implemented based on the specific voice channel
    // For now, just show a placeholder
    showToast('Voice mute functionality not yet implemented', Toasts.Type.MESSAGE);
}

async function openDeleteMessagesDialog(channelId: string): Promise<void> {
    // This would open a dialog for selecting messages to delete
    showToast('Message deletion dialog not yet implemented', Toasts.Type.MESSAGE);
}

async function openPurgeDialog(channelId: string): Promise<void> {
    const count = prompt('Number of messages to purge (1-100):');
    if (!count || isNaN(Number(count))) {
        throw new Error('Invalid count');
    }
    
    const numCount = Math.min(Math.max(Number(count), 1), 100);
    
    if (!confirm(`Are you sure you want to purge ${numCount} messages?`)) {
        return;
    }
    
    // This is a simplified implementation
    // In practice, you'd need to fetch messages and delete them in batches
    showToast(`Purging ${numCount} messages...`, Toasts.Type.MESSAGE);
}

async function lockChannel(channelId: string): Promise<void> {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) throw new Error('Channel not found');
    
    // Toggle lock state
    const isLocked = channel.rateLimitPerUser > 0;
    const newRateLimit = isLocked ? 0 : 21600; // 6 hours
    
    await RestAPI.patch({
        url: Constants.Endpoints.CHANNEL(channelId),
        body: {
            rate_limit_per_user: newRateLimit
        }
    });
    
    showToast(isLocked ? 'Channel unlocked' : 'Channel locked', Toasts.Type.SUCCESS);
}

async function openSlowmodeDialog(channelId: string): Promise<void> {
    const seconds = prompt('Slowmode duration in seconds (0 to disable, max 21600):');
    if (seconds === null) return;
    
    const duration = Math.min(Math.max(Number(seconds) || 0, 0), 21600);
    
    await RestAPI.patch({
        url: Constants.Endpoints.CHANNEL(channelId),
        body: {
            rate_limit_per_user: duration
        }
    });
    
    showToast(
        duration === 0 ? 'Slowmode disabled' : `Slowmode set to ${duration} seconds`,
        Toasts.Type.SUCCESS
    );
}
