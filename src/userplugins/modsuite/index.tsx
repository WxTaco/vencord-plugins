/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, Menu, React, SelectedChannelStore, showToast, Toasts, useState, UserStore, RestAPI, Constants } from "@webpack/common";

// import { FloatingButtonManager } from "./components/FloatingButton";
// import { ModPanel } from "./components/ModPanel";
import { settings } from "./settings";
import { checkMonitoringStatus, initializeMessageMonitoring } from "./utils/messageMonitor";
import { hasAnyModPermissions } from "./utils/permissions";

// Simple DOM-based floating button
function createFloatingButton() {
    // Remove existing button if any
    const existing = document.getElementById('modsuite-floating-btn');
    if (existing) existing.remove();

    // Check if we should show the button
    if (!settings.store.showFloatingButton) return;

    // Check if current channel has mod permissions
    const channelId = SelectedChannelStore.getChannelId();
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || !hasAnyModPermissions(channel)) return;

    // Create floating button
    const button = document.createElement('button');
    button.id = 'modsuite-floating-btn';
    button.innerHTML = '🛠️';
    button.title = 'ModSuite - Click to open mod tools';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #ec4899, #db2777);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
        z-index: 9998;
        transition: all 0.2s ease;
    `;

    // Hover effects
    button.onmouseenter = () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 6px 16px rgba(236, 72, 153, 0.4)';
    };
    button.onmouseleave = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.3)';
    };

    // Click handler
    button.onclick = () => {
        createModSuiteModal();
        showToast("Opening ModSuite...", Toasts.Type.MESSAGE);
    };

    // Add to DOM
    document.body.appendChild(button);
}

// Update floating button when channel changes
function updateFloatingButton() {
    createFloatingButton();
}

const cl = classNameFactory("ms-");

// Discord API Service
const DiscordAPI = {
    async kickUser(guildId: string, userId: string, reason?: string) {
        try {
            await RestAPI.del({
                url: Constants.Endpoints.GUILD_MEMBER(guildId, userId),
                body: reason ? { reason } : undefined
            });
            return { success: true };
        } catch (error: any) {
            console.error('Failed to kick user:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async banUser(guildId: string, userId: string, reason?: string, deleteMessageDays = 0) {
        try {
            await RestAPI.put({
                url: Constants.Endpoints.GUILD_BAN(guildId, userId),
                body: {
                    reason,
                    delete_message_days: deleteMessageDays
                }
            });
            return { success: true };
        } catch (error: any) {
            console.error('Failed to ban user:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async timeoutUser(guildId: string, userId: string, duration: number, reason?: string) {
        try {
            const timeoutUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
            await RestAPI.patch({
                url: Constants.Endpoints.GUILD_MEMBER(guildId, userId),
                body: {
                    communication_disabled_until: timeoutUntil,
                    reason
                }
            });
            return { success: true };
        } catch (error: any) {
            console.error('Failed to timeout user:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async deleteMessages(channelId: string, messageIds: string[]) {
        try {
            if (messageIds.length === 1) {
                await RestAPI.del({
                    url: Constants.Endpoints.MESSAGE(channelId, messageIds[0])
                });
            } else if (messageIds.length <= 100) {
                await RestAPI.post({
                    url: Constants.Endpoints.BULK_DELETE(channelId),
                    body: { messages: messageIds }
                });
            } else {
                // Split into chunks of 100
                const chunks = [];
                for (let i = 0; i < messageIds.length; i += 100) {
                    chunks.push(messageIds.slice(i, i + 100));
                }
                for (const chunk of chunks) {
                    await RestAPI.post({
                        url: Constants.Endpoints.BULK_DELETE(channelId),
                        body: { messages: chunk }
                    });
                    // Add delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return { success: true };
        } catch (error: any) {
            console.error('Failed to delete messages:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async getMessages(channelId: string, limit = 50, before?: string) {
        try {
            const query: any = { limit };
            if (before) query.before = before;

            const response = await RestAPI.get({
                url: Constants.Endpoints.MESSAGES(channelId),
                query
            });
            return { success: true, messages: response.body };
        } catch (error: any) {
            console.error('Failed to get messages:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async setSlowmode(channelId: string, seconds: number) {
        try {
            await RestAPI.patch({
                url: Constants.Endpoints.CHANNEL(channelId),
                body: { rate_limit_per_user: seconds }
            });
            return { success: true };
        } catch (error: any) {
            console.error('Failed to set slowmode:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    },

    async lockChannel(channelId: string, lock: boolean) {
        try {
            const channel = ChannelStore.getChannel(channelId);
            if (!channel) return { success: false, error: 'Channel not found' };

            const guild = GuildStore.getGuild(channel.guild_id);
            if (!guild) return { success: false, error: 'Guild not found' };

            const everyoneRole = guild.id; // @everyone role has same ID as guild

            await RestAPI.put({
                url: Constants.Endpoints.CHANNEL_PERMISSION(channelId, everyoneRole),
                body: {
                    type: 0, // role
                    deny: lock ? '2048' : '0', // SEND_MESSAGES permission
                    allow: lock ? '0' : '2048'
                }
            });
            return { success: true };
        } catch (error: any) {
            console.error('Failed to lock/unlock channel:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    }
};

// Import the advanced message monitoring system
import { messageMonitor, getUserAnalytics, getServerAnalytics } from "./utils/messageMonitor";

// Simple tracking system that only tracks explicitly selected users
const MessageTracker = {
    // Store only explicitly tracked users
    explicitlyTrackedUsers: new Set<string>(),
    userMessages: new Map<string, any[]>(),

    get trackedUsers() {
        // Return a Map-like interface for compatibility
        const map = new Map();
        this.explicitlyTrackedUsers.forEach(userId => {
            map.set(userId, this.userMessages.get(userId) || []);
        });
        return map;
    },

    addMessage(userId: string, message: any) {
        // Only add messages for explicitly tracked users
        if (this.explicitlyTrackedUsers.has(userId)) {
            if (!this.userMessages.has(userId)) {
                this.userMessages.set(userId, []);
            }
            const messages = this.userMessages.get(userId)!;
            messages.unshift(message);
            // Keep only last 100 messages per user
            if (messages.length > 100) {
                messages.splice(100);
            }
        }
    },

    getMessages(userId: string) {
        return this.userMessages.get(userId) || [];
    },

    getTrackedUsers() {
        return Array.from(this.explicitlyTrackedUsers).map(userId => {
            const messages = this.userMessages.get(userId) || [];
            const user = UserStore.getUser(userId);
            return {
                id: userId,
                username: user?.username || 'Unknown User',
                messageCount: messages.length,
                lastMessage: messages[0]?.timestamp || null
            };
        });
    },

    startTracking(userId: string) {
        if (!this.explicitlyTrackedUsers.has(userId)) {
            this.explicitlyTrackedUsers.add(userId);
            if (!this.userMessages.has(userId)) {
                this.userMessages.set(userId, []);
            }
            const user = UserStore.getUser(userId);
            console.log(`ModSuite: Started tracking user ${user?.username || 'Unknown'} (${userId})`);
        } else {
            console.log(`ModSuite: User ${userId} is already being tracked`);
        }
    },

    stopTracking(userId: string) {
        this.explicitlyTrackedUsers.delete(userId);
        this.userMessages.delete(userId);
        const user = UserStore.getUser(userId);
        console.log(`ModSuite: Stopped tracking user ${user?.username || 'Unknown'} (${userId})`);
    },

    // Check if a user is being explicitly tracked
    isTracking(userId: string) {
        return this.explicitlyTrackedUsers.has(userId);
    }
};

// Make MessageTracker available globally for the monitoring system
window.ModSuiteMessageTracker = MessageTracker;

// Global state for ModSuite
let modSuiteState = {
    isOpen: false,
    selectedUser: null as any,
    activeTab: 'actions' as string,
    modalOpen: false,
    modalType: null as string | null,
    modalData: null as any
};

// Full ModSuite React Component
const ModSuitePanel = () => {
    const [isOpen, setIsOpen] = useState(modSuiteState.isOpen);
    const [selectedUser, setSelectedUser] = useState(modSuiteState.selectedUser);
    const [activeTab, setActiveTab] = useState(modSuiteState.activeTab);
    const [currentChannel, setCurrentChannel] = useState(() => {
        const channelId = SelectedChannelStore.getChannelId();
        return ChannelStore.getChannel(channelId);
    });
    const [currentGuild, setCurrentGuild] = useState(() => {
        return currentChannel?.guild_id ? GuildStore.getGuild(currentChannel.guild_id) : undefined;
    });

    // Listen for external events
    React.useEffect(() => {
        const handleOpenPanel = (e: any) => {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : undefined;

            setCurrentChannel(channel);
            setCurrentGuild(guild);
            setSelectedUser(e.detail?.user || null);
            setIsOpen(true);
            modSuiteState.isOpen = true;
        };

        const handleClosePanel = () => {
            setIsOpen(false);
            modSuiteState.isOpen = false;
        };

        const handleOpenModal = (e: any) => {
            // Modal will be handled by separate component
        };

        document.addEventListener('modsuite:open-panel', handleOpenPanel);
        document.addEventListener('modsuite:close-panel', handleClosePanel);
        document.addEventListener('modsuite:open-modal', handleOpenModal);

        return () => {
            document.removeEventListener('modsuite:open-panel', handleOpenPanel);
            document.removeEventListener('modsuite:close-panel', handleClosePanel);
            document.removeEventListener('modsuite:open-modal', handleOpenModal);
        };
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        modSuiteState.isOpen = false;
    };

    const handleBackdropClick = (e: any) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen || !currentChannel) return null;

    const channelName = currentChannel.name || 'Direct Message';
    const guildName = currentGuild?.name || 'Direct Message';

    return (
        <ErrorBoundary noop>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={handleBackdropClick}
            >
                <div style={{
                    width: '600px',
                    maxHeight: '700px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '2px solid #fbcfe8'
                }} onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #ec4899, #db2777)',
                        color: 'white',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                ModSuite - {channelName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {guildName}
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                fontSize: '18px'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb'
                    }}>
                        {[
                            { id: 'actions', label: 'Quick Actions' },
                            { id: 'mass-delete', label: 'Mass Delete' },
                            { id: 'tracking', label: 'User Tracking' },
                            { id: 'modlog', label: 'Audit Log' },
                            { id: 'analytics', label: 'Analytics' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: activeTab === tab.id ? '#ec4899' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#6b7280',
                                    border: 'none',
                                    borderBottom: activeTab === tab.id ? '2px solid #ec4899' : '2px solid transparent',
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: activeTab === tab.id ? 600 : 500,
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== tab.id) {
                                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                                        e.currentTarget.style.color = '#374151';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== tab.id) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#6b7280';
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{
                        padding: '20px',
                        maxHeight: '500px',
                        overflowY: 'auto'
                    }}>
                        {activeTab === 'actions' && <QuickActionsTab channel={currentChannel} guild={currentGuild} selectedUser={selectedUser} />}
                        {activeTab === 'mass-delete' && <MassDeleteTab channel={currentChannel} />}
                        {activeTab === 'tracking' && <UserTrackingTab selectedUser={selectedUser} />}
                        {activeTab === 'modlog' && <ModLogTab guild={currentGuild} />}
                        {activeTab === 'analytics' && <AnalyticsTab />}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

// Professional Action Button Component
const ActionButton = ({
    label,
    description,
    onClick,
    disabled = false,
    variant = 'default'
}: {
    label: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger' | 'warning';
}) => {
    const getVariantStyles = () => {
        if (disabled) {
            return {
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                color: '#9ca3af'
            };
        }

        switch (variant) {
            case 'danger':
                return {
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    hoverBg: '#fee2e2'
                };
            case 'warning':
                return {
                    background: '#fffbeb',
                    border: '1px solid #fed7aa',
                    color: '#d97706',
                    hoverBg: '#fef3c7'
                };
            default:
                return {
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    hoverBg: '#f1f5f9'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                ...styles,
                borderRadius: '8px',
                padding: '16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                width: '100%',
                fontSize: '14px',
                fontWeight: 500
            }}
            onMouseEnter={(e) => {
                if (!disabled && styles.hoverBg) {
                    e.currentTarget.style.backgroundColor = styles.hoverBg;
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = styles.background;
                }
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{description}</div>
        </button>
    );
};

// Tab Components
const QuickActionsTab = ({ channel, selectedUser }: any) => {
    const permissions = React.useMemo(() => {
        if (!channel || channel.isDM?.() || channel.isGroupDM?.()) {
            return { canKick: false, canBan: false, canTimeout: false, canDeleteMessages: false, canManageChannels: false };
        }
        return {
            canKick: hasAnyModPermissions(channel),
            canBan: hasAnyModPermissions(channel),
            canTimeout: hasAnyModPermissions(channel),
            canDeleteMessages: hasAnyModPermissions(channel),
            canManageChannels: hasAnyModPermissions(channel)
        };
    }, [channel]);

    const openModerationModal = (action: string) => {
        const event = new CustomEvent('modsuite:open-modal', {
            detail: {
                type: action,
                user: selectedUser,
                channel: channel
            }
        });
        document.dispatchEvent(event);
    };

    return (
        <div>
            <div style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                }}>
                    Moderation Actions
                </h3>
                <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '14px'
                }}>
                    Perform moderation actions on users and manage channel settings
                </p>
            </div>

            {selectedUser && (
                <div style={{
                    padding: '16px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0369a1',
                        marginBottom: '4px'
                    }}>
                        Target User Selected
                    </div>
                    <div style={{ fontSize: '13px', color: '#0284c7' }}>
                        {selectedUser.username}#{selectedUser.discriminator || '0000'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px' }}>
                        ID: {selectedUser.id}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        User Actions
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <ActionButton
                            label="Kick User"
                            description="Remove user from server temporarily"
                            onClick={() => openModerationModal('kick')}
                            disabled={!permissions.canKick || !selectedUser}
                            variant="warning"
                        />
                        <ActionButton
                            label="Ban User"
                            description="Permanently ban user from server"
                            onClick={() => openModerationModal('ban')}
                            disabled={!permissions.canBan || !selectedUser}
                            variant="danger"
                        />
                        <ActionButton
                            label="Timeout User"
                            description="Temporarily restrict user communication"
                            onClick={() => openModerationModal('timeout')}
                            disabled={!permissions.canTimeout || !selectedUser}
                            variant="warning"
                        />
                    </div>
                </div>

                <div>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Message Management
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <ActionButton
                            label="Delete Messages"
                            description="Select and delete specific messages"
                            onClick={() => openModerationModal('delete')}
                            disabled={!permissions.canDeleteMessages}
                        />
                        <ActionButton
                            label="Bulk Delete"
                            description="Delete multiple messages with filters"
                            onClick={() => openModerationModal('bulk-delete')}
                            disabled={!permissions.canDeleteMessages}
                            variant="warning"
                        />
                    </div>
                </div>

                <div>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Channel Management
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <ActionButton
                            label="Lock Channel"
                            description="Prevent users from sending messages"
                            onClick={() => openModerationModal('lock')}
                            disabled={!permissions.canManageChannels}
                        />
                        <ActionButton
                            label="Set Slowmode"
                            description="Configure message rate limiting"
                            onClick={() => openModerationModal('slowmode')}
                            disabled={!permissions.canManageChannels}
                        />
                    </div>
                </div>
            </div>

            {!selectedUser && (
                <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        marginBottom: '8px'
                    }}>
                        No User Selected
                    </div>
                    <div style={{
                        color: '#9ca3af',
                        fontSize: '12px'
                    }}>
                        Right-click on a user and select "Open ModSuite" to enable user-specific actions
                    </div>
                </div>
            )}
        </div>
    );
};

const MassDeleteTab = ({ channel }: any) => {
    const [keyword, setKeyword] = useState('');
    const [messageCount, setMessageCount] = useState('50');
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const handlePreview = async () => {
        if (!channel) {
            showToast('No channel selected', Toasts.Type.FAILURE);
            return;
        }

        setLoading(true);
        try {
            const count = parseInt(messageCount) || 50;
            const result = await DiscordAPI.getMessages(channel.id, Math.min(count * 2, 100)); // Get more to filter

            if (result.success) {
                let filteredMessages = result.messages;

                // Apply filters
                if (keyword.trim()) {
                    filteredMessages = filteredMessages.filter(msg =>
                        msg.content.toLowerCase().includes(keyword.toLowerCase())
                    );
                }

                if (userId.trim()) {
                    filteredMessages = filteredMessages.filter(msg =>
                        msg.author.id.includes(userId) ||
                        msg.author.username.toLowerCase().includes(userId.toLowerCase())
                    );
                }

                // Limit to requested count
                filteredMessages = filteredMessages.slice(0, count);

                setPreview(filteredMessages);
                setShowPreview(true);
            } else {
                showToast(`Failed to load messages: ${result.error}`, Toasts.Type.FAILURE);
            }
        } catch (error) {
            showToast('Failed to load message preview', Toasts.Type.FAILURE);
        }
        setLoading(false);
    };

    const handleMassDelete = async () => {
        if (preview.length === 0) {
            showToast('No messages to delete', Toasts.Type.FAILURE);
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${preview.length} messages? This action cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        setLoading(true);
        const messageIds = preview.map(msg => msg.id);
        const result = await DiscordAPI.deleteMessages(channel.id, messageIds);

        if (result.success) {
            showToast(`Successfully deleted ${messageIds.length} messages`, Toasts.Type.SUCCESS);
            setPreview([]);
            setShowPreview(false);
        } else {
            showToast(`Failed to delete messages: ${result.error}`, Toasts.Type.FAILURE);
        }
        setLoading(false);
    };

    return (
        <div>
            <div style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                }}>
                    Bulk Message Deletion
                </h3>
                <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '14px'
                }}>
                    Delete multiple messages with advanced filtering and preview
                </p>
            </div>

            <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151'
                    }}>
                        Number of Messages to Scan
                    </label>
                    <input
                        type="number"
                        value={messageCount}
                        onChange={(e) => setMessageCount(e.target.value)}
                        min="1"
                        max="100"
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
                        Maximum 100 messages can be scanned at once
                    </p>
                </div>

                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151'
                    }}>
                        Content Filter (optional)
                    </label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Delete messages containing this text..."
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151'
                    }}>
                        User Filter (optional)
                    </label>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="User ID or username..."
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                    onClick={handlePreview}
                    disabled={loading}
                    style={{
                        flex: 1,
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? 'Loading...' : 'Preview Messages'}
                </button>

                {showPreview && (
                    <button
                        onClick={handleMassDelete}
                        disabled={loading || preview.length === 0}
                        style={{
                            flex: 1,
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: (loading || preview.length === 0) ? 'not-allowed' : 'pointer',
                            opacity: (loading || preview.length === 0) ? 0.6 : 1
                        }}
                    >
                        Delete {preview.length} Messages
                    </button>
                )}
            </div>

            {showPreview && (
                <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#374151'
                    }}>
                        Preview: {preview.length} messages will be deleted
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {preview.map(msg => (
                            <div key={msg.id} style={{
                                padding: '8px 16px',
                                borderBottom: '1px solid #f3f4f6'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '2px'
                                }}>
                                    <span style={{ fontWeight: 500, fontSize: '12px', color: '#374151' }}>
                                        {msg.author.username}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {msg.content || '[No content]'}
                                </div>
                            </div>
                        ))}

                        {preview.length === 0 && (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#9ca3af',
                                fontSize: '14px'
                            }}>
                                No messages match the current filters
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#92400e'
            }}>
                ⚠️ Deleted messages cannot be recovered. Always preview before deleting.
            </div>
        </div>
    );
};

const UserTrackingTab = ({ selectedUser }: any) => {
    const [trackedUsers, setTrackedUsers] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Refresh tracked users data
    React.useEffect(() => {
        const updateTrackedUsers = () => {
            const users = MessageTracker.getTrackedUsers();
            setTrackedUsers(users);
        };

        updateTrackedUsers();
        const interval = setInterval(updateTrackedUsers, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, [refreshKey]);

    const handleStartTracking = (user: any) => {
        MessageTracker.startTracking(user.id);
        showToast(`Started tracking ${user.username}`, Toasts.Type.SUCCESS);
        setRefreshKey(prev => prev + 1);
    };

    const handleStopTracking = (userId: string) => {
        const user = UserStore.getUser(userId);
        MessageTracker.stopTracking(userId);
        showToast(`Stopped tracking ${user?.username || 'user'}`, Toasts.Type.SUCCESS);
        setRefreshKey(prev => prev + 1);
    };

    const handleViewMessages = (userId: string) => {
        document.dispatchEvent(new CustomEvent('modsuite:open-user-tracking', {
            detail: { user: UserStore.getUser(userId) }
        }));
    };

    return (
        <div>
            <div style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                }}>
                    User Message Tracking
                </h3>
                <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '14px'
                }}>
                    Monitor and track user messages across channels
                </p>
            </div>

            {selectedUser && (
                <div style={{
                    padding: '16px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                                Selected User: {selectedUser.username}
                            </div>
                            <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '2px' }}>
                                ID: {selectedUser.id}
                            </div>
                        </div>
                        <button
                            onClick={() => handleStartTracking(selectedUser)}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Start Tracking
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                <h4 style={{
                    margin: '0 0 12px 0',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600
                }}>
                    Currently Tracked Users ({trackedUsers.length})
                </h4>
            </div>

            {trackedUsers.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {trackedUsers.map(user => (
                        <div key={user.id} style={{
                            padding: '16px',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#374151', fontSize: '14px' }}>
                                        {user.username}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        ID: {user.id}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleViewMessages(user.id)}
                                        style={{
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View Messages
                                    </button>
                                    <button
                                        onClick={() => handleStopTracking(user.id)}
                                        style={{
                                            background: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Stop
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                marginTop: '12px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
                                        {user.messageCount}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                        Messages
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#059669' }}>
                                        {user.lastMessage ? new Date(user.lastMessage).toLocaleDateString() : 'Never'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                        Last Message
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#d97706' }}>
                                        {user.lastMessage ? Math.floor((Date.now() - new Date(user.lastMessage).getTime()) / (1000 * 60 * 60)) : '∞'}h
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                        Hours Ago
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        No users are currently being tracked
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Right-click on a user and select "Track Messages" to start monitoring
                    </div>
                </div>
            )}
        </div>
    );
};

const ModLogTab = ({ guild }: any) => {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAuditLogs = async () => {
        if (!guild) {
            setError('No guild selected');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch audit logs from Discord API
            const response = await RestAPI.get({
                url: Constants.Endpoints.GUILD_AUDIT_LOG(guild.id),
                query: { limit: 50 }
            });

            if (response.ok) {
                const auditLogEntries = response.body.audit_log_entries || [];
                const users = response.body.users || [];

                // Create a user lookup map
                const userMap = new Map();
                users.forEach((user: any) => userMap.set(user.id, user));

                // Process audit log entries
                const processedLogs = auditLogEntries.map((entry: any) => {
                    const user = userMap.get(entry.user_id);
                    let target = userMap.get(entry.target_id);

                    // Try to get target from UserStore if not in audit log users
                    if (!target && entry.target_id) {
                        const storeUser = UserStore.getUser(entry.target_id);
                        if (storeUser) {
                            target = storeUser;
                        }
                    }

                    // Handle different target types
                    if (!target) {
                        if (entry.target_id) {
                            // Try to determine target type from action
                            if ([10, 11, 12].includes(entry.action_type)) {
                                // Channel actions
                                const channel = ChannelStore.getChannel(entry.target_id);
                                target = { name: channel?.name || `Channel ${entry.target_id}`, id: entry.target_id };
                            } else if ([30, 31, 32].includes(entry.action_type)) {
                                // Role actions
                                const guild = GuildStore.getGuild(entry.guild_id);
                                const role = guild?.roles?.[entry.target_id];
                                target = { name: role?.name || `Role ${entry.target_id}`, id: entry.target_id };
                            } else {
                                // Unknown user
                                target = { username: `User ${entry.target_id}`, id: entry.target_id };
                            }
                        } else {
                            target = { username: 'Unknown Target', id: 'unknown' };
                        }
                    }

                    // Map action types to readable names
                    const actionNames: { [key: number]: string; } = {
                        1: 'Guild Updated',
                        10: 'Channel Created',
                        11: 'Channel Updated',
                        12: 'Channel Deleted',
                        20: 'User Kicked',
                        22: 'User Banned',
                        23: 'User Unbanned',
                        24: 'User Updated',
                        25: 'User Role Updated',
                        26: 'User Moved',
                        27: 'User Disconnected',
                        28: 'Bot Added',
                        30: 'Role Created',
                        31: 'Role Updated',
                        32: 'Role Deleted',
                        40: 'Invite Created',
                        41: 'Invite Updated',
                        42: 'Invite Deleted',
                        50: 'Webhook Created',
                        51: 'Webhook Updated',
                        52: 'Webhook Deleted',
                        60: 'Emoji Created',
                        61: 'Emoji Updated',
                        62: 'Emoji Deleted',
                        72: 'Message Deleted',
                        73: 'Messages Bulk Deleted',
                        74: 'Message Pinned',
                        75: 'Message Unpinned',
                        80: 'Integration Created',
                        81: 'Integration Updated',
                        82: 'Integration Deleted',
                        83: 'Stage Instance Created',
                        84: 'Stage Instance Updated',
                        85: 'Stage Instance Deleted',
                        90: 'Sticker Created',
                        91: 'Sticker Updated',
                        92: 'Sticker Deleted',
                        100: 'Thread Created',
                        101: 'Thread Updated',
                        102: 'Thread Deleted',
                        110: 'Application Command Permission Updated',
                        121: 'Auto Moderation Rule Created',
                        122: 'Auto Moderation Rule Updated',
                        123: 'Auto Moderation Rule Deleted',
                        124: 'Auto Moderation Block Message',
                        125: 'Auto Moderation Flag Message',
                        126: 'Auto Moderation Timeout User'
                    };

                    // Try to get user from UserStore if not in audit log
                    let resolvedUser = user;
                    if (!resolvedUser && entry.user_id) {
                        const storeUser = UserStore.getUser(entry.user_id);
                        if (storeUser) {
                            resolvedUser = storeUser;
                        }
                    }

                    // Generate detailed description based on action type and changes
                    const getDetailedDescription = (actionType: number, changes: any[], target: any, entry: any) => {
                        const baseAction = actionNames[actionType] || `Unknown Action (${actionType})`;

                        if (!changes || changes.length === 0) {
                            // Handle actions without changes
                            switch (actionType) {
                                case 20: return `Kicked ${target.username || target.name} from the server`;
                                case 22: return `Banned ${target.username || target.name} from the server`;
                                case 23: return `Unbanned ${target.username || target.name}`;
                                case 27: return `Disconnected ${target.username || target.name} from voice`;
                                case 72: return `Deleted a message in ${target.name || 'unknown channel'}`;
                                case 73: return `Bulk deleted messages in ${target.name || 'unknown channel'}`;
                                case 74: return `Pinned a message in ${target.name || 'unknown channel'}`;
                                case 75: return `Unpinned a message in ${target.name || 'unknown channel'}`;
                                default: return baseAction;
                            }
                        }

                        // Handle actions with detailed changes
                        const details: string[] = [];

                        changes.forEach((change: any) => {
                            const key = change.key;
                            const oldValue = change.old_value;
                            const newValue = change.new_value;

                            switch (key) {
                                case 'name':
                                    details.push(`renamed from "${oldValue}" to "${newValue}"`);
                                    break;
                                case 'topic':
                                    details.push(`changed topic from "${oldValue || 'none'}" to "${newValue || 'none'}"`);
                                    break;
                                case 'nsfw':
                                    details.push(`${newValue ? 'enabled' : 'disabled'} NSFW`);
                                    break;
                                case 'rate_limit_per_user':
                                    const oldSeconds = oldValue || 0;
                                    const newSeconds = newValue || 0;
                                    if (newSeconds === 0) {
                                        details.push(`disabled slowmode (was ${oldSeconds}s)`);
                                    } else if (oldSeconds === 0) {
                                        details.push(`enabled slowmode (${newSeconds}s)`);
                                    } else {
                                        details.push(`changed slowmode from ${oldSeconds}s to ${newSeconds}s`);
                                    }
                                    break;
                                case 'bitrate':
                                    details.push(`changed bitrate from ${oldValue || 0} to ${newValue || 0}`);
                                    break;
                                case 'user_limit':
                                    const oldLimit = oldValue || 0;
                                    const newLimit = newValue || 0;
                                    if (newLimit === 0) {
                                        details.push(`removed user limit (was ${oldLimit})`);
                                    } else if (oldLimit === 0) {
                                        details.push(`set user limit to ${newLimit}`);
                                    } else {
                                        details.push(`changed user limit from ${oldLimit} to ${newLimit}`);
                                    }
                                    break;
                                case 'permission_overwrites':
                                    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
                                        const added = newValue.filter((perm: any) =>
                                            !oldValue.some((old: any) => old.id === perm.id)
                                        );
                                        const removed = oldValue.filter((perm: any) =>
                                            !newValue.some((new_: any) => new_.id === perm.id)
                                        );
                                        const modified = newValue.filter((perm: any) => {
                                            const oldPerm = oldValue.find((old: any) => old.id === perm.id);
                                            return oldPerm && (oldPerm.allow !== perm.allow || oldPerm.deny !== perm.deny);
                                        });

                                        if (added.length > 0) details.push(`added permissions for ${added.length} role(s)/user(s)`);
                                        if (removed.length > 0) details.push(`removed permissions for ${removed.length} role(s)/user(s)`);
                                        if (modified.length > 0) details.push(`modified permissions for ${modified.length} role(s)/user(s)`);
                                    } else {
                                        details.push('updated channel permissions');
                                    }
                                    break;
                                case 'nick':
                                    details.push(`changed nickname from "${oldValue || 'none'}" to "${newValue || 'none'}"`);
                                    break;
                                case 'deaf':
                                    details.push(`${newValue ? 'deafened' : 'undeafened'} user`);
                                    break;
                                case 'mute':
                                    details.push(`${newValue ? 'muted' : 'unmuted'} user`);
                                    break;
                                case 'communication_disabled_until':
                                    if (newValue) {
                                        const timeoutEnd = new Date(newValue);
                                        const duration = Math.round((timeoutEnd.getTime() - Date.now()) / (1000 * 60));
                                        details.push(`timed out until ${timeoutEnd.toLocaleString()} (${duration} minutes)`);
                                    } else {
                                        details.push('removed timeout');
                                    }
                                    break;
                                case '$add':
                                    if (Array.isArray(newValue)) {
                                        const roleNames = newValue.map((role: any) => role.name || role.id).join(', ');
                                        details.push(`added role(s): ${roleNames}`);
                                    }
                                    break;
                                case '$remove':
                                    if (Array.isArray(newValue)) {
                                        const roleNames = newValue.map((role: any) => role.name || role.id).join(', ');
                                        details.push(`removed role(s): ${roleNames}`);
                                    }
                                    break;
                                case 'color':
                                    details.push(`changed color from #${oldValue?.toString(16) || '000000'} to #${newValue?.toString(16) || '000000'}`);
                                    break;
                                case 'hoist':
                                    details.push(`${newValue ? 'enabled' : 'disabled'} role hoisting`);
                                    break;
                                case 'mentionable':
                                    details.push(`made role ${newValue ? 'mentionable' : 'non-mentionable'}`);
                                    break;
                                case 'permissions':
                                    details.push(`updated role permissions`);
                                    break;
                                case 'code':
                                    details.push(`changed invite code from "${oldValue}" to "${newValue}"`);
                                    break;
                                case 'channel_id':
                                    const oldChannel = ChannelStore.getChannel(oldValue);
                                    const newChannel = ChannelStore.getChannel(newValue);
                                    details.push(`moved from #${oldChannel?.name || oldValue} to #${newChannel?.name || newValue}`);
                                    break;
                                case 'max_uses':
                                    details.push(`changed max uses from ${oldValue || 'unlimited'} to ${newValue || 'unlimited'}`);
                                    break;
                                case 'max_age':
                                    const oldAge = oldValue === 0 ? 'never' : `${oldValue}s`;
                                    const newAge = newValue === 0 ? 'never' : `${newValue}s`;
                                    details.push(`changed expiry from ${oldAge} to ${newAge}`);
                                    break;
                                case 'temporary':
                                    details.push(`${newValue ? 'enabled' : 'disabled'} temporary membership`);
                                    break;
                                case 'avatar_hash':
                                    details.push(newValue ? 'changed avatar' : 'removed avatar');
                                    break;
                                case 'banner_hash':
                                    details.push(newValue ? 'changed banner' : 'removed banner');
                                    break;
                                case 'discovery_splash_hash':
                                    details.push(newValue ? 'changed discovery splash' : 'removed discovery splash');
                                    break;
                                case 'icon_hash':
                                    details.push(newValue ? 'changed server icon' : 'removed server icon');
                                    break;
                                case 'splash_hash':
                                    details.push(newValue ? 'changed invite splash' : 'removed invite splash');
                                    break;
                                case 'owner_id':
                                    const oldOwner = UserStore.getUser(oldValue);
                                    const newOwner = UserStore.getUser(newValue);
                                    details.push(`transferred ownership from ${oldOwner?.username || oldValue} to ${newOwner?.username || newValue}`);
                                    break;
                                case 'region':
                                    details.push(`changed voice region from "${oldValue}" to "${newValue}"`);
                                    break;
                                case 'afk_channel_id':
                                    const oldAfkChannel = ChannelStore.getChannel(oldValue);
                                    const newAfkChannel = ChannelStore.getChannel(newValue);
                                    if (newValue) {
                                        details.push(`set AFK channel to #${newAfkChannel?.name || newValue}`);
                                    } else {
                                        details.push(`removed AFK channel (was #${oldAfkChannel?.name || oldValue})`);
                                    }
                                    break;
                                case 'afk_timeout':
                                    details.push(`changed AFK timeout from ${oldValue || 0}s to ${newValue || 0}s`);
                                    break;
                                case 'mfa_level':
                                    const mfaLevels = ['None', '2FA Required'];
                                    details.push(`changed 2FA requirement from "${mfaLevels[oldValue] || oldValue}" to "${mfaLevels[newValue] || newValue}"`);
                                    break;
                                case 'verification_level':
                                    const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
                                    details.push(`changed verification level from "${verificationLevels[oldValue] || oldValue}" to "${verificationLevels[newValue] || newValue}"`);
                                    break;
                                case 'explicit_content_filter':
                                    const filterLevels = ['Disabled', 'Members without roles', 'All members'];
                                    details.push(`changed content filter from "${filterLevels[oldValue] || oldValue}" to "${filterLevels[newValue] || newValue}"`);
                                    break;
                                case 'default_message_notifications':
                                    const notificationLevels = ['All messages', 'Only mentions'];
                                    details.push(`changed default notifications from "${notificationLevels[oldValue] || oldValue}" to "${notificationLevels[newValue] || newValue}"`);
                                    break;
                                case 'vanity_url_code':
                                    details.push(`changed vanity URL from "${oldValue || 'none'}" to "${newValue || 'none'}"`);
                                    break;
                                case 'prune_delete_days':
                                    details.push(`pruned members inactive for ${newValue} days`);
                                    break;
                                case 'widget_enabled':
                                    details.push(`${newValue ? 'enabled' : 'disabled'} server widget`);
                                    break;
                                case 'widget_channel_id':
                                    const widgetChannel = ChannelStore.getChannel(newValue);
                                    details.push(`set widget channel to #${widgetChannel?.name || newValue}`);
                                    break;
                                case 'system_channel_id':
                                    const systemChannel = ChannelStore.getChannel(newValue);
                                    if (newValue) {
                                        details.push(`set system channel to #${systemChannel?.name || newValue}`);
                                    } else {
                                        details.push('removed system channel');
                                    }
                                    break;
                                case 'position':
                                    details.push(`moved from position ${oldValue} to position ${newValue}`);
                                    break;
                                case 'type':
                                    const channelTypes = {
                                        0: 'Text Channel',
                                        1: 'DM',
                                        2: 'Voice Channel',
                                        3: 'Group DM',
                                        4: 'Category',
                                        5: 'News Channel',
                                        6: 'Store Channel',
                                        10: 'News Thread',
                                        11: 'Public Thread',
                                        12: 'Private Thread',
                                        13: 'Stage Channel',
                                        14: 'Directory',
                                        15: 'Forum Channel'
                                    };
                                    details.push(`changed type from ${channelTypes[oldValue as keyof typeof channelTypes] || oldValue} to ${channelTypes[newValue as keyof typeof channelTypes] || newValue}`);
                                    break;
                                case 'enable_emoticons':
                                    details.push(`${newValue ? 'enabled' : 'disabled'} emoticons`);
                                    break;
                                case 'expire_behavior':
                                    const expireBehaviors = ['Remove role', 'Kick'];
                                    details.push(`changed expire behavior from "${expireBehaviors[oldValue] || oldValue}" to "${expireBehaviors[newValue] || newValue}"`);
                                    break;
                                case 'expire_grace_period':
                                    details.push(`changed grace period from ${oldValue} days to ${newValue} days`);
                                    break;
                                default:
                                    if (typeof newValue === 'boolean') {
                                        details.push(`${newValue ? 'enabled' : 'disabled'} ${key.replace(/_/g, ' ')}`);
                                    } else if (oldValue !== undefined && newValue !== undefined) {
                                        details.push(`changed ${key.replace(/_/g, ' ')} from "${oldValue}" to "${newValue}"`);
                                    } else if (newValue !== undefined) {
                                        details.push(`set ${key.replace(/_/g, ' ')} to "${newValue}"`);
                                    } else {
                                        details.push(`updated ${key.replace(/_/g, ' ')}`);
                                    }
                                    break;
                            }
                        });

                        if (details.length === 0) {
                            return baseAction;
                        }

                        return `${baseAction}: ${details.join(', ')}`;
                    };

                    return {
                        id: entry.id,
                        action: actionNames[entry.action_type] || `Unknown Action (${entry.action_type})`,
                        detailedAction: getDetailedDescription(entry.action_type, entry.changes, target, entry),
                        user: resolvedUser?.username || `User ${entry.user_id || 'Unknown'}`,
                        userId: entry.user_id,
                        target: target.username || target.name || 'Unknown Target',
                        targetId: entry.target_id,
                        timestamp: entry.id ? new Date(parseInt(entry.id) / 4194304 + 1420070400000) : new Date(),
                        reason: entry.reason || null,
                        changes: entry.changes || []
                    };
                }).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());

                setAuditLogs(processedLogs);
            } else {
                setError('Failed to fetch audit logs');
            }
        } catch (err: any) {
            console.error('Failed to load audit logs:', err);
            setError(err.message || 'Failed to load audit logs');
        }

        setLoading(false);
    };

    React.useEffect(() => {
        if (guild) {
            loadAuditLogs();
        }
    }, [guild]);

    return (
        <div>
            <div style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                }}>
                    Server Audit Log
                </h3>
                <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '14px'
                }}>
                    Recent moderation actions and server changes
                </p>
            </div>

            {error && (
                <div style={{
                    padding: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    color: '#dc2626',
                    fontSize: '14px'
                }}>
                    Error: {error}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {loading ? 'Loading...' : `${auditLogs.length} entries`}
                </div>
                <button
                    onClick={loadAuditLogs}
                    disabled={loading || !guild}
                    style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {auditLogs.length > 0 ? auditLogs.map(log => (
                    <div key={log.id} style={{
                        padding: '16px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '8px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontWeight: 600,
                                    color: '#1f2937',
                                    fontSize: '14px',
                                    marginBottom: '4px'
                                }}>
                                    {log.action}
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#4b5563',
                                    lineHeight: '1.4',
                                    marginBottom: '6px'
                                }}>
                                    {log.detailedAction}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    <strong style={{ color: '#3b82f6' }}>{log.user}</strong>
                                    {log.target !== 'Unknown Target' && (
                                        <span> → <strong style={{ color: '#059669' }}>{log.target}</strong></span>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                textAlign: 'right',
                                minWidth: '120px',
                                marginLeft: '12px'
                            }}>
                                {log.timestamp.toLocaleDateString()}<br />
                                {log.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                        {log.reason && (
                            <div style={{
                                fontSize: '12px',
                                color: '#7c2d12',
                                background: '#fef7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                marginTop: '8px'
                            }}>
                                <strong>Reason:</strong> {log.reason}
                            </div>
                        )}
                        {log.changes && log.changes.length > 0 && (
                            <details style={{ marginTop: '8px' }}>
                                <summary style={{
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                    View raw changes ({log.changes.length})
                                </summary>
                                <div style={{
                                    marginTop: '6px',
                                    padding: '8px',
                                    background: '#f3f4f6',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    color: '#374151',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    {log.changes.map((change: any, i: number) => (
                                        <div key={i} style={{ marginBottom: '4px' }}>
                                            <strong>{change.key}:</strong> {JSON.stringify(change.old_value)} → {JSON.stringify(change.new_value)}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                )) : !loading && (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontSize: '14px'
                    }}>
                        {error ? 'Failed to load audit logs' : 'No audit log entries found'}
                    </div>
                )}
            </div>
        </div>
    );
};

const AnalyticsTab = () => {
    const [stats, setStats] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    React.useEffect(() => {
        const updateStats = () => {
            try {
                const serverAnalytics = getServerAnalytics();
                setStats(serverAnalytics);
            } catch (error) {
                console.error('Failed to get server analytics:', error);
                // Fallback to basic stats
                setStats({
                    trackedUsers: 0,
                    totalMessages: 0,
                    activeUsers: 0,
                    usersOverPingThreshold: 0,
                    totalPings: 0,
                    topMessageUsers: [],
                    topPingUsers: []
                });
            }
        };

        updateStats();
        const interval = setInterval(updateStats, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [refreshKey]);

    if (!stats) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                Loading analytics...
            </div>
        );
    }

    return (
        <div>
            <div style={{
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                }}>
                    Server Analytics
                </h3>
                <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '14px'
                }}>
                    Real-time statistics from ModSuite monitoring
                </p>
            </div>

            {/* Main Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    padding: '16px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#0369a1' }}>
                        {stats.trackedUsers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px' }}>
                        Tracked Users
                    </div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#059669' }}>
                        {stats.totalMessages}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                        Total Messages
                    </div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#fffbeb',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#d97706' }}>
                        {stats.activeUsers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
                        Active Users (24h)
                    </div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#dc2626' }}>
                        {stats.usersOverPingThreshold}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                        Flagged Users
                    </div>
                </div>

                <div style={{
                    padding: '16px',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#7c3aed' }}>
                        {stats.totalPings}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6d28d9', marginTop: '4px' }}>
                        Total Pings
                    </div>
                </div>
            </div>

            {/* Top Users */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        Top Message Users
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {stats.topMessageUsers.length > 0 ? stats.topMessageUsers.map((user: any, i: number) => (
                            <div key={i} style={{
                                padding: '8px 12px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '12px', color: '#374151' }}>
                                    {user.username}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#059669' }}>
                                    {user.messageCount}
                                </span>
                            </div>
                        )) : (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: '#9ca3af',
                                fontSize: '12px'
                            }}>
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        Top Ping Users
                    </h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {stats.topPingUsers.length > 0 ? stats.topPingUsers.map((user: any, i: number) => (
                            <div key={i} style={{
                                padding: '8px 12px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '12px', color: '#374151' }}>
                                    {user.username}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#dc2626' }}>
                                    {user.totalPings}
                                </span>
                            </div>
                        )) : (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: '#9ca3af',
                                fontSize: '12px'
                            }}>
                                No data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    Refresh Analytics
                </button>
            </div>

            <div style={{
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#166534'
            }}>
                ✅ Analytics are updated in real-time from ModSuite's advanced monitoring system.
            </div>
        </div>
    );
};

// Professional Moderation Modal Component
const ModerationModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalType, setModalType] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    React.useEffect(() => {
        const handleOpenModal = (e: any) => {
            setModalType(e.detail.type);
            setModalData(e.detail);
            setIsOpen(true);
            setFormData({});
        };

        document.addEventListener('modsuite:open-modal', handleOpenModal);
        return () => document.removeEventListener('modsuite:open-modal', handleOpenModal);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setModalType(null);
        setModalData(null);
        setFormData({});
    };

    const handleSubmit = async () => {
        const channel = modalData.channel;
        const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

        switch (modalType) {
            case 'kick':
                if (modalData.user && guild) {
                    const result = await DiscordAPI.kickUser(guild.id, modalData.user.id, formData.reason);
                    if (result.success) {
                        showToast(`Successfully kicked ${modalData.user.username}`, Toasts.Type.SUCCESS);
                    } else {
                        showToast(`Failed to kick user: ${result.error}`, Toasts.Type.FAILURE);
                    }
                }
                break;
            case 'ban':
                if (modalData.user && guild) {
                    const deleteMessageDays = parseInt(formData.deleteMessages || '0');
                    const result = await DiscordAPI.banUser(guild.id, modalData.user.id, formData.reason, deleteMessageDays);
                    if (result.success) {
                        showToast(`Successfully banned ${modalData.user.username}`, Toasts.Type.SUCCESS);
                    } else {
                        showToast(`Failed to ban user: ${result.error}`, Toasts.Type.FAILURE);
                    }
                }
                break;
            case 'timeout':
                if (modalData.user && guild && formData.duration) {
                    const duration = parseInt(formData.duration);
                    const result = await DiscordAPI.timeoutUser(guild.id, modalData.user.id, duration, formData.reason);
                    if (result.success) {
                        showToast(`Successfully timed out ${modalData.user.username} for ${duration} minutes`, Toasts.Type.SUCCESS);
                    } else {
                        showToast(`Failed to timeout user: ${result.error}`, Toasts.Type.FAILURE);
                    }
                }
                break;
            case 'delete':
                // Open message selector modal
                document.dispatchEvent(new CustomEvent('modsuite:open-message-selector', {
                    detail: { channel: modalData.channel }
                }));
                break;
            case 'bulk-delete':
                // Open bulk delete modal
                document.dispatchEvent(new CustomEvent('modsuite:open-bulk-delete', {
                    detail: { channel: modalData.channel }
                }));
                break;
            case 'lock':
                if (channel) {
                    const result = await DiscordAPI.lockChannel(channel.id, true);
                    if (result.success) {
                        showToast('Channel locked successfully', Toasts.Type.SUCCESS);
                    } else {
                        showToast(`Failed to lock channel: ${result.error}`, Toasts.Type.FAILURE);
                    }
                }
                break;
            case 'slowmode':
                if (channel && formData.duration !== undefined) {
                    const seconds = parseInt(formData.duration || '0');
                    const result = await DiscordAPI.setSlowmode(channel.id, seconds);
                    if (result.success) {
                        showToast(`Slowmode set to ${seconds} seconds`, Toasts.Type.SUCCESS);
                    } else {
                        showToast(`Failed to set slowmode: ${result.error}`, Toasts.Type.FAILURE);
                    }
                }
                break;
        }
        handleClose();
    };

    const renderModalContent = () => {
        switch (modalType) {
            case 'kick':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Kick User</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', borderRadius: '6px' }}>
                            <strong>Target:</strong> {modalData.user?.username}#{modalData.user?.discriminator || '0000'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Reason (optional)</label>
                            <textarea
                                value={formData.reason || ''}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Enter reason for kick..."
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    resize: 'vertical',
                                    minHeight: '80px'
                                }}
                            />
                        </div>
                    </div>
                );
            case 'ban':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Ban User</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', borderRadius: '6px' }}>
                            <strong>Target:</strong> {modalData.user?.username}#{modalData.user?.discriminator || '0000'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Reason (optional)</label>
                            <textarea
                                value={formData.reason || ''}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Enter reason for ban..."
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    resize: 'vertical',
                                    minHeight: '80px'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Delete message history</label>
                            <select
                                value={formData.deleteMessages || '0'}
                                onChange={(e) => setFormData({ ...formData, deleteMessages: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="0">Don't delete any</option>
                                <option value="1">Previous 24 hours</option>
                                <option value="7">Previous 7 days</option>
                            </select>
                        </div>
                    </div>
                );
            case 'timeout':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#d97706' }}>Timeout User</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', borderRadius: '6px' }}>
                            <strong>Target:</strong> {modalData.user?.username}#{modalData.user?.discriminator || '0000'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Duration</label>
                            <select
                                value={formData.duration || '60'}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="60">1 hour</option>
                                <option value="360">6 hours</option>
                                <option value="720">12 hours</option>
                                <option value="1440">1 day</option>
                                <option value="10080">1 week</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Reason (optional)</label>
                            <textarea
                                value={formData.reason || ''}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Enter reason for timeout..."
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    resize: 'vertical',
                                    minHeight: '60px'
                                }}
                            />
                        </div>
                    </div>
                );
            case 'delete':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Delete Messages</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
                            <strong>Channel:</strong> #{modalData.channel?.name || 'Unknown'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                This will open the message selector where you can choose specific messages to delete.
                            </p>
                        </div>
                    </div>
                );
            case 'bulk-delete':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#d97706' }}>Bulk Delete Messages</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', borderRadius: '6px' }}>
                            <strong>Channel:</strong> #{modalData.channel?.name || 'Unknown'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                This will open the bulk deletion tool with advanced filtering options.
                            </p>
                        </div>
                    </div>
                );
            case 'lock':
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Lock Channel</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', borderRadius: '6px' }}>
                            <strong>Channel:</strong> #{modalData.channel?.name || 'Unknown'}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                This will prevent @everyone from sending messages in this channel.
                            </p>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
                                Users with special permissions will still be able to send messages.
                            </p>
                        </div>
                    </div>
                );
            case 'slowmode':
                const currentSlowmode = modalData.channel?.rateLimitPerUser || 0;
                return (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Manage Slowmode</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
                            <div><strong>Channel:</strong> #{modalData.channel?.name || 'Unknown'}</div>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#3b82f6' }}>
                                Current slowmode: {currentSlowmode === 0 ? 'Disabled' : `${currentSlowmode} seconds`}
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>New Slowmode Duration</label>
                            <select
                                value={formData.duration !== undefined ? formData.duration : currentSlowmode.toString()}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="0">Disabled</option>
                                <option value="5">5 seconds</option>
                                <option value="10">10 seconds</option>
                                <option value="15">15 seconds</option>
                                <option value="30">30 seconds</option>
                                <option value="60">1 minute</option>
                                <option value="120">2 minutes</option>
                                <option value="300">5 minutes</option>
                                <option value="600">10 minutes</option>
                                <option value="900">15 minutes</option>
                                <option value="1800">30 minutes</option>
                                <option value="3600">1 hour</option>
                                <option value="7200">2 hours</option>
                                <option value="21600">6 hours</option>
                            </select>
                        </div>
                        {currentSlowmode > 0 && (
                            <div style={{
                                padding: '8px 12px',
                                background: '#fef3c7',
                                border: '1px solid #fbbf24',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#92400e',
                                marginBottom: '12px'
                            }}>
                                💡 Tip: Select "Disabled" to remove the current slowmode
                            </div>
                        )}
                    </div>
                );
            default:
                return <div>Unknown action</div>;
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={{
                width: '480px',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {renderModalContent()}

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    marginTop: '24px'
                }}>
                    <button
                        onClick={handleClose}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '4px',
                            background: modalType === 'ban' ? '#dc2626' : modalType === 'kick' || modalType === 'timeout' ? '#d97706' : '#3b82f6',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// User Context Menu Modals
const UserTrackingModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    React.useEffect(() => {
        const handleOpenTracking = (e: any) => {
            setUser(e.detail.user);
            setIsOpen(true);
        };

        document.addEventListener('modsuite:open-user-tracking', handleOpenTracking);
        return () => document.removeEventListener('modsuite:open-user-tracking', handleOpenTracking);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setUser(null);
    };

    const handleStartTracking = () => {
        if (user) {
            MessageTracker.startTracking(user.id);
            showToast(`Started tracking messages for ${user.username}`, Toasts.Type.SUCCESS);
        }
        handleClose();
    };

    if (!isOpen || !user) return null;

    const isTracked = MessageTracker.trackedUsers.has(user.id);
    const messages = MessageTracker.getMessages(user.id);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={{
                width: '500px',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '600px',
                overflow: 'hidden'
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Message Tracking</h3>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, color: '#1e40af' }}>
                        {user.username}#{user.discriminator || '0000'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                        ID: {user.id}
                    </div>
                </div>

                {isTracked ? (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                                Tracked Messages: {messages.length}
                            </div>
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                padding: '8px'
                            }}>
                                {messages.length > 0 ? messages.slice(0, 10).map((msg, i) => (
                                    <div key={i} style={{
                                        padding: '4px 0',
                                        borderBottom: i < 9 ? '1px solid #f3f4f6' : 'none',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ color: '#374151' }}>
                                            {msg.content?.substring(0, 100) || '[No content]'}
                                        </div>
                                        <div style={{ color: '#9ca3af', fontSize: '10px' }}>
                                            {new Date(msg.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                                        No messages tracked yet
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    MessageTracker.stopTracking(user.id);
                                    showToast(`Stopped tracking ${user.username}`, Toasts.Type.SUCCESS);
                                    handleClose();
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #dc2626',
                                    borderRadius: '4px',
                                    background: 'white',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                }}
                            >
                                Stop Tracking
                            </button>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                Start tracking this user's messages to monitor their activity.
                            </p>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
                                This will track messages sent in channels where you have moderation permissions.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartTracking}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Start Tracking
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PingHistoryModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [pingHistory, setPingHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const handleOpenPingHistory = (e: any) => {
            setUser(e.detail.user);
            setIsOpen(true);
            loadPingHistory(e.detail.user.id);
        };

        document.addEventListener('modsuite:open-ping-history', handleOpenPingHistory);
        return () => document.removeEventListener('modsuite:open-ping-history', handleOpenPingHistory);
    }, []);

    const loadPingHistory = async (userId: string) => {
        setLoading(true);
        try {
            // Get ping data from the monitoring system
            const userAnalytics = getUserAnalytics(userId);
            if (userAnalytics && userAnalytics.recentPingEvents) {
                // Process ping events to show detailed information
                const processedPings = userAnalytics.recentPingEvents.map((ping: any) => {
                    const channel = ChannelStore.getChannel(ping.channelId);
                    return {
                        id: ping.messageId || ping.timestamp,
                        content: ping.content || 'Message content not available',
                        channel: channel ? channel.name : `Channel ${ping.channelId}`,
                        channelId: ping.channelId,
                        timestamp: ping.timestamp,
                        type: ping.type,
                        messageId: ping.messageId
                    };
                }).sort((a: any, b: any) => b.timestamp - a.timestamp);

                setPingHistory(processedPings);
            } else {
                // Try to get data from the advanced monitoring system
                const allPingData = messageMonitor.getAllPingData();
                const userPingData = allPingData.find(data => data.userId === userId);

                if (userPingData && userPingData.pings) {
                    const processedPings = userPingData.pings.map((ping: any) => {
                        const channel = ChannelStore.getChannel(ping.channelId);
                        return {
                            id: ping.messageId || ping.timestamp,
                            content: ping.content || 'Message content not available',
                            channel: channel ? channel.name : `Channel ${ping.channelId}`,
                            channelId: ping.channelId,
                            timestamp: ping.timestamp,
                            type: ping.type,
                            messageId: ping.messageId
                        };
                    }).sort((a: any, b: any) => b.timestamp - a.timestamp);

                    setPingHistory(processedPings);
                } else {
                    setPingHistory([]);
                }
            }
        } catch (error) {
            console.error('Failed to load ping history:', error);
            setPingHistory([]);
        }
        setLoading(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        setUser(null);
        setPingHistory([]);
    };

    if (!isOpen || !user) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={{
                width: '600px',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '700px',
                overflow: 'hidden'
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#d97706' }}>Ping History</h3>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, color: '#92400e' }}>
                        {user.username}#{user.discriminator || '0000'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>
                        {loading ? 'Loading ping history...' : `${pingHistory.length} messages with @everyone, @here, or role pings`}
                    </div>
                </div>

                <div style={{
                    maxHeight: '450px',
                    overflowY: 'auto',
                    marginBottom: '16px'
                }}>
                    {loading ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#6b7280',
                            fontSize: '14px'
                        }}>
                            Loading ping history...
                        </div>
                    ) : pingHistory.length > 0 ? (
                        pingHistory.map(ping => (
                            <div key={ping.id} style={{
                                padding: '14px',
                                border: '1px solid #fed7aa',
                                borderRadius: '8px',
                                marginBottom: '10px',
                                background: '#fffbeb',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontWeight: 600,
                                            color: '#92400e',
                                            fontSize: '13px'
                                        }}>
                                            #{ping.channel}
                                        </span>
                                        {ping.type && (
                                            <span style={{
                                                fontSize: '10px',
                                                background: '#fbbf24',
                                                color: '#92400e',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 500
                                            }}>
                                                {ping.type}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#d97706' }}>
                                        {new Date(ping.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{
                                    color: '#374151',
                                    fontSize: '13px',
                                    lineHeight: '1.4',
                                    background: '#f9fafb',
                                    padding: '8px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    {ping.content}
                                </div>
                                {ping.messageId && (
                                    <div style={{
                                        fontSize: '10px',
                                        color: '#9ca3af',
                                        marginTop: '6px',
                                        fontFamily: 'monospace'
                                    }}>
                                        Message ID: {ping.messageId}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#9ca3af',
                            fontSize: '14px'
                        }}>
                            <div style={{ marginBottom: '8px' }}>
                                No ping history found for this user
                            </div>
                            <div style={{ fontSize: '12px' }}>
                                This user hasn't used @everyone, @here, or role pings recently, or ping monitoring may not be enabled
                            </div>
                        </div>
                    )}
                </div>

                {!loading && pingHistory.length > 0 && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '10px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#166534'
                    }}>
                        ✅ Showing real ping history from ModSuite monitoring system
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleClose}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Message Selector Modal with Preview
const MessageSelectorModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [channel, setChannel] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        userId: '',
        content: '',
        hasAttachments: false,
        hasEmbeds: false,
        isPinned: false,
        dateFrom: '',
        dateTo: '',
        cssSelector: ''
    });

    React.useEffect(() => {
        const handleOpenSelector = async (e: any) => {
            setChannel(e.detail.channel);
            setIsOpen(true);
            setSelectedMessages(new Set());
            await loadMessages(e.detail.channel.id);
        };

        document.addEventListener('modsuite:open-message-selector', handleOpenSelector);
        return () => document.removeEventListener('modsuite:open-message-selector', handleOpenSelector);
    }, []);

    const loadMessages = async (channelId: string, before?: string) => {
        setLoading(true);
        try {
            const result = await DiscordAPI.getMessages(channelId, 50, before);
            if (result.success) {
                setMessages(prev => before ? [...prev, ...result.messages] : result.messages);
            } else {
                showToast(`Failed to load messages: ${result.error}`, Toasts.Type.FAILURE);
            }
        } catch (error) {
            showToast('Failed to load messages', Toasts.Type.FAILURE);
        }
        setLoading(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        setChannel(null);
        setMessages([]);
        setSelectedMessages(new Set());
        setFilters({
            userId: '',
            content: '',
            hasAttachments: false,
            hasEmbeds: false,
            isPinned: false,
            dateFrom: '',
            dateTo: '',
            cssSelector: ''
        });
    };

    const filteredMessages = React.useMemo(() => {
        return messages.filter(msg => {
            // User filter
            if (filters.userId && !msg.author.id.includes(filters.userId) &&
                !msg.author.username.toLowerCase().includes(filters.userId.toLowerCase())) {
                return false;
            }

            // Content filter
            if (filters.content && !msg.content.toLowerCase().includes(filters.content.toLowerCase())) {
                return false;
            }

            // Attachment filter
            if (filters.hasAttachments && (!msg.attachments || msg.attachments.length === 0)) {
                return false;
            }

            // Embed filter
            if (filters.hasEmbeds && (!msg.embeds || msg.embeds.length === 0)) {
                return false;
            }

            // Pinned filter
            if (filters.isPinned && !msg.pinned) {
                return false;
            }

            // Date filters
            const msgDate = new Date(msg.timestamp);
            if (filters.dateFrom && msgDate < new Date(filters.dateFrom)) {
                return false;
            }
            if (filters.dateTo && msgDate > new Date(filters.dateTo)) {
                return false;
            }

            // CSS Selector filter (simplified)
            if (filters.cssSelector) {
                const selector = filters.cssSelector.toLowerCase();
                if (selector.includes('embed') && (!msg.embeds || msg.embeds.length === 0)) return false;
                if (selector.includes('attachment') && (!msg.attachments || msg.attachments.length === 0)) return false;
                if (selector.includes('bot') && !msg.author.bot) return false;
                if (selector.includes('pinned') && !msg.pinned) return false;
            }

            return true;
        });
    }, [messages, filters]);

    const handleSelectAll = () => {
        if (selectedMessages.size === filteredMessages.length) {
            setSelectedMessages(new Set());
        } else {
            setSelectedMessages(new Set(filteredMessages.map(msg => msg.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedMessages.size === 0) return;

        const confirmed = confirm(`Are you sure you want to delete ${selectedMessages.size} messages? This action cannot be undone.`);
        if (!confirmed) return;

        setLoading(true);
        const messageIds = Array.from(selectedMessages);
        const result = await DiscordAPI.deleteMessages(channel.id, messageIds);

        if (result.success) {
            showToast(`Successfully deleted ${messageIds.length} messages`, Toasts.Type.SUCCESS);
            // Remove deleted messages from local state
            setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
            setSelectedMessages(new Set());
        } else {
            showToast(`Failed to delete messages: ${result.error}`, Toasts.Type.FAILURE);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={{
                width: '900px',
                height: '700px',
                backgroundColor: 'white',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1f2937' }}>Message Selector</h3>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                            #{channel?.name} • {filteredMessages.length} messages • {selectedMessages.size} selected
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Filters */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                        <input
                            type="text"
                            placeholder="Filter by user ID or username"
                            value={filters.userId}
                            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                            style={{
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Filter by content"
                            value={filters.content}
                            onChange={(e) => setFilters(prev => ({ ...prev, content: e.target.value }))}
                            style={{
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="CSS selector (e.g., embed, attachment, bot)"
                            value={filters.cssSelector}
                            onChange={(e) => setFilters(prev => ({ ...prev, cssSelector: e.target.value }))}
                            style={{
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input
                                type="checkbox"
                                checked={filters.hasAttachments}
                                onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                            />
                            Has Attachments
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input
                                type="checkbox"
                                checked={filters.hasEmbeds}
                                onChange={(e) => setFilters(prev => ({ ...prev, hasEmbeds: e.target.checked }))}
                            />
                            Has Embeds
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input
                                type="checkbox"
                                checked={filters.isPinned}
                                onChange={(e) => setFilters(prev => ({ ...prev, isPinned: e.target.checked }))}
                            />
                            Pinned Only
                        </label>
                    </div>
                </div>

                {/* Message List */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <button
                            onClick={handleSelectAll}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            {selectedMessages.size === filteredMessages.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedMessages.size === 0 || loading}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                background: selectedMessages.size > 0 ? '#dc2626' : '#9ca3af',
                                color: 'white',
                                cursor: selectedMessages.size > 0 ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                fontWeight: 500
                            }}
                        >
                            {loading ? 'Deleting...' : `Delete Selected (${selectedMessages.size})`}
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
                        {filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                style={{
                                    padding: '12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    backgroundColor: selectedMessages.has(msg.id) ? '#eff6ff' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => {
                                    const newSelected = new Set(selectedMessages);
                                    if (newSelected.has(msg.id)) {
                                        newSelected.delete(msg.id);
                                    } else {
                                        newSelected.add(msg.id);
                                    }
                                    setSelectedMessages(newSelected);
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedMessages.has(msg.id)}
                                            onChange={() => { }} // Handled by parent click
                                        />
                                        <span style={{ fontWeight: 500, color: '#374151', fontSize: '13px' }}>
                                            {msg.author.username}
                                        </span>
                                        {msg.author.bot && (
                                            <span style={{
                                                background: '#3b82f6',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '10px'
                                            }}>
                                                BOT
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                                    {msg.content || '[No content]'}
                                </div>
                                {(msg.attachments?.length > 0 || msg.embeds?.length > 0) && (
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                                        {msg.attachments?.length > 0 && (
                                            <span style={{ color: '#059669' }}>
                                                {msg.attachments.length} attachment(s)
                                            </span>
                                        )}
                                        {msg.embeds?.length > 0 && (
                                            <span style={{ color: '#7c3aed' }}>
                                                {msg.embeds.length} embed(s)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                Loading messages...
                            </div>
                        )}

                        {!loading && filteredMessages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                No messages match the current filters
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ModSuite components will be rendered via patches

// Simple DOM-based modal functions (keeping for compatibility)
function createModSuiteModal(user?: any) {
    // Trigger React component via event
    const event = new CustomEvent('modsuite:open-panel', { detail: { user } });
    document.dispatchEvent(event);
}

// DOM fallback removed - using React components only



// Context menu patches for user actions
const userContextPatch: NavContextMenuPatchCallback = (children, { user, channel }) => {
    if (!user || !settings.store.enableContextMenu) return;

    const currentChannel = channel || ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (!currentChannel || !hasAnyModPermissions(currentChannel)) return;

    // Add to the end of the children array
    children.push(
        <Menu.MenuSeparator key="ms-separator" />,
        <Menu.MenuItem
            key="ms-track-user"
            id="ms-track-user"
            label="Track Messages"
            action={() => {
                document.dispatchEvent(new CustomEvent('modsuite:open-user-tracking', { detail: { user } }));
            }}
        />,
        <Menu.MenuItem
            key="ms-view-pings"
            id="ms-view-pings"
            label="View Ping History"
            action={() => {
                document.dispatchEvent(new CustomEvent('modsuite:open-ping-history', { detail: { user } }));
            }}
        />,
        <Menu.MenuItem
            key="ms-open-modsuite-user"
            id="ms-open-modsuite-user"
            label="Open ModSuite"
            icon={() => <span style={{ fontSize: '14px' }}>🛠️</span>}
            action={() => {
                createModSuiteModal(user);
                showToast("Opening ModSuite...", Toasts.Type.MESSAGE);
            }}
        />
    );
};

// Channel context menu patch for quick actions
const channelContextPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel || !settings.store.enableContextMenu) return;

    if (!hasAnyModPermissions(channel)) return;

    const group = children.find(child =>
        Array.isArray(child?.props?.children)
    );

    if (group) {
        group.props.children.push(
            <Menu.MenuSeparator key="ms-separator" />,
            <Menu.MenuItem
                key="ms-open-modsuite"
                id="ms-open-modsuite"
                label="Open ModSuite"
                icon={() => <span style={{ fontSize: '14px' }}>🛠️</span>}
                action={() => {
                    createModSuiteModal();
                    showToast("Opening ModSuite...", Toasts.Type.MESSAGE);
                }}
            />
        );
    }
};

// Plugin definition
export default definePlugin({
    name: "ModSuite",
    description: "Comprehensive moderation toolkit with floating button, quick actions, mass deletion, ping monitoring, and enhanced audit logs",
    authors: [Devs.Ven], // Using existing dev for compatibility

    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "channel-context": channelContextPatch,
        "thread-context": channelContextPatch,
    },

    start() {
        console.log("ModSuite plugin started");

        // Make MessageTracker globally available
        (window as any).ModSuiteMessageTracker = MessageTracker;

        // Initialize message monitoring
        initializeMessageMonitoring();

        // Create floating button
        createFloatingButton();

        // Listen for channel changes to update floating button
        this.channelChangeListener = () => updateFloatingButton();
        SelectedChannelStore.addChangeListener(this.channelChangeListener);

        // Show success toast
        showToast("ModSuite plugin loaded successfully!", Toasts.Type.SUCCESS);
    },

    stop() {
        console.log("ModSuite plugin stopped");

        // Stop message monitoring
        checkMonitoringStatus();

        // Remove floating button
        const button = document.getElementById('modsuite-floating-btn');
        if (button) button.remove();

        // Remove channel change listener
        if (this.channelChangeListener) {
            SelectedChannelStore.removeChangeListener(this.channelChangeListener);
        }
    },

    // Patch to inject ModSuite into Discord's UI using a more reliable target
    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "$self.ModSuiteWrapper,"
            }
        }
    ],

    ModSuiteWrapper: ErrorBoundary.wrap(({ children }: { children: any[]; }) => {
        // Add ModSuite components to the children array
        children.push(
            React.createElement(ErrorBoundary, { noop: true, key: "modsuite-components" },
                React.createElement(ModSuitePanel),
                React.createElement(ModerationModal),
                React.createElement(UserTrackingModal),
                React.createElement(PingHistoryModal),
                React.createElement(MessageSelectorModal)
            )
        );

        return React.createElement(React.Fragment, null, children);
    }, { noop: true }),



    // Utility methods for other components to use
    openModPanel() {
        // Method to programmatically open the mod panel
        const event = new CustomEvent('modsuite:open-panel');
        document.dispatchEvent(event);
    },

    closeModPanel() {
        // Method to programmatically close the mod panel
        const event = new CustomEvent('modsuite:close-panel');
        document.dispatchEvent(event);
    },

    trackUser(userId: string) {
        // Method to start tracking a user
        console.log('Tracking user:', userId);
        // TODO: Implement user tracking logic
    },

    getPermissions(channelId?: string) {
        // Utility method to get permissions for a channel
        const channel = channelId ? ChannelStore.getChannel(channelId) :
            ChannelStore.getChannel(SelectedChannelStore.getChannelId());

        return hasAnyModPermissions(channel);
    }
});
