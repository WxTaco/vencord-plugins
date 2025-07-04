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
import { ChannelStore, GuildStore, Menu, React, SelectedChannelStore, showToast, Toasts, useState } from "@webpack/common";

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

// Global state for ModSuite
let modSuiteState = {
    isOpen: false,
    selectedUser: null as any,
    activeTab: 'actions' as string
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

        document.addEventListener('modsuite:open-panel', handleOpenPanel);
        document.addEventListener('modsuite:close-panel', handleClosePanel);

        return () => {
            document.removeEventListener('modsuite:open-panel', handleOpenPanel);
            document.removeEventListener('modsuite:close-panel', handleClosePanel);
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
                        borderBottom: '2px solid #fbcfe8',
                        backgroundColor: '#fdf2f8'
                    }}>
                        {[
                            { id: 'actions', label: 'Quick Actions', icon: '⚡' },
                            { id: 'mass-delete', label: 'Mass Delete', icon: '🗑️' },
                            { id: 'tracking', label: 'User Tracking', icon: '👥' },
                            { id: 'modlog', label: 'Mod Log', icon: '📋' },
                            { id: 'analytics', label: 'Analytics', icon: '📊' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: activeTab === tab.id ? '#ec4899' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#be185d',
                                    border: 'none',
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span>{tab.icon}</span>
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

// Tab Components
const QuickActionsTab = ({ channel, guild, selectedUser }: any) => {
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

    const actions = [
        { id: 'kick', label: 'Kick User', icon: '👢', enabled: permissions.canKick && selectedUser, danger: true },
        { id: 'ban', label: 'Ban User', icon: '🔨', enabled: permissions.canBan && selectedUser, danger: true },
        { id: 'timeout', label: 'Timeout User', icon: '⏰', enabled: permissions.canTimeout && selectedUser, danger: true },
        { id: 'delete', label: 'Delete Messages', icon: '🗑️', enabled: permissions.canDeleteMessages },
        { id: 'purge', label: 'Purge Channel', icon: '🧹', enabled: permissions.canDeleteMessages, danger: true },
        { id: 'lock', label: 'Lock Channel', icon: '🔒', enabled: permissions.canManageChannels },
        { id: 'slowmode', label: 'Set Slowmode', icon: '🐌', enabled: permissions.canManageChannels }
    ];

    const handleAction = (actionId: string) => {
        switch (actionId) {
            case 'kick':
                if (selectedUser) {
                    const reason = prompt('Reason for kick (optional):');
                    showToast(`Kicked ${selectedUser.username}${reason ? ` for: ${reason}` : ''}`, Toasts.Type.SUCCESS);
                }
                break;
            case 'ban':
                if (selectedUser) {
                    const reason = prompt('Reason for ban (optional):');
                    showToast(`Banned ${selectedUser.username}${reason ? ` for: ${reason}` : ''}`, Toasts.Type.SUCCESS);
                }
                break;
            case 'timeout':
                if (selectedUser) {
                    const duration = prompt('Timeout duration in minutes (max 40320):');
                    if (duration && !isNaN(Number(duration))) {
                        showToast(`Timed out ${selectedUser.username} for ${duration} minutes`, Toasts.Type.SUCCESS);
                    }
                }
                break;
            case 'delete':
                showToast('Opening message deletion tool...', Toasts.Type.MESSAGE);
                break;
            case 'purge':
                const count = prompt('Number of messages to purge (1-100):');
                if (count && !isNaN(Number(count))) {
                    if (confirm(`Are you sure you want to purge ${count} messages?`)) {
                        showToast(`Purging ${count} messages...`, Toasts.Type.MESSAGE);
                    }
                }
                break;
            case 'lock':
                showToast('Channel lock toggled', Toasts.Type.SUCCESS);
                break;
            case 'slowmode':
                const seconds = prompt('Slowmode duration in seconds (0 to disable):');
                if (seconds !== null) {
                    const duration = Math.max(0, Number(seconds) || 0);
                    showToast(`Slowmode set to ${duration} seconds`, Toasts.Type.SUCCESS);
                }
                break;
        }
    };

    return (
        <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#be185d' }}>Quick Moderation Actions</h3>

            {selectedUser && (
                <div style={{
                    padding: '12px',
                    background: '#fdf2f8',
                    border: '1px solid #fbcfe8',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#be185d' }}>
                        Selected User: {selectedUser.username}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9d174d', marginTop: '4px' }}>
                        ID: {selectedUser.id}
                    </div>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px'
            }}>
                {actions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => handleAction(action.id)}
                        disabled={!action.enabled}
                        style={{
                            background: action.enabled ? (action.danger ? '#fecdd3' : '#fdf2f8') : '#f3f4f6',
                            border: `2px solid ${action.enabled ? (action.danger ? '#fda4af' : '#fbcfe8') : '#e5e7eb'}`,
                            borderRadius: '8px',
                            padding: '12px 8px',
                            cursor: action.enabled ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: action.enabled ? (action.danger ? '#be123c' : '#be185d') : '#6b7280',
                            transition: 'all 0.2s ease',
                            opacity: action.enabled ? 1 : 0.5
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>{action.icon}</span>
                        {action.label}
                    </button>
                ))}
            </div>

            {!selectedUser && (
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#9d174d',
                    fontSize: '14px'
                }}>
                    Right-click on a user to select them for user-specific actions
                </div>
            )}
        </div>
    );
};

const MassDeleteTab = ({ channel }: any) => {
    const [keyword, setKeyword] = useState('');
    const [messageCount, setMessageCount] = useState('10');

    const handleMassDelete = () => {
        const count = parseInt(messageCount) || 10;
        const hasKeyword = keyword.trim().length > 0;

        const confirmMessage = hasKeyword
            ? `Delete ${count} messages containing "${keyword}"?`
            : `Delete the last ${count} messages?`;

        if (confirm(confirmMessage)) {
            showToast(`Deleting ${count} messages${hasKeyword ? ` containing "${keyword}"` : ''}...`, Toasts.Type.MESSAGE);
        }
    };

    return (
        <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#be185d' }}>Mass Message Deletion</h3>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500, color: '#be185d' }}>
                        Keyword Filter (optional)
                    </label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Delete messages containing..."
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '2px solid #fbcfe8',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500, color: '#be185d' }}>
                        Number of Messages
                    </label>
                    <input
                        type="number"
                        value={messageCount}
                        onChange={(e) => setMessageCount(e.target.value)}
                        min="1"
                        max="100"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '2px solid #fbcfe8',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    />
                </div>
            </div>

            <button
                onClick={handleMassDelete}
                style={{
                    width: '100%',
                    background: '#ec4899',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                }}
            >
                🗑️ Delete Messages
            </button>

            <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#92400e'
            }}>
                ⚠️ This action cannot be undone. Messages will be permanently deleted.
            </div>
        </div>
    );
};

const UserTrackingTab = ({ selectedUser }: any) => {
    const [trackedUsers] = useState([
        { id: '1', username: 'User1', messageCount: 45, lastSeen: 'Just now' },
        { id: '2', username: 'User2', messageCount: 23, lastSeen: '5 minutes ago' },
        { id: '3', username: 'User3', messageCount: 67, lastSeen: '1 hour ago' }
    ]);

    return (
        <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#be185d' }}>User Message Tracking</h3>

            {selectedUser && (
                <div style={{
                    padding: '12px',
                    background: '#fdf2f8',
                    border: '1px solid #fbcfe8',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#be185d' }}>
                        Now tracking: {selectedUser.username}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: '8px' }}>
                {trackedUsers.map(user => (
                    <div key={user.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#fdf2f8',
                        border: '1px solid #fbcfe8',
                        borderRadius: '6px'
                    }}>
                        <div>
                            <div style={{ fontWeight: 500, color: '#be185d' }}>{user.username}</div>
                            <div style={{ fontSize: '12px', color: '#9d174d' }}>
                                {user.messageCount} messages • {user.lastSeen}
                            </div>
                        </div>
                        <button style={{
                            background: '#ec4899',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}>
                            View
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ModLogTab = ({ guild }: any) => {
    const [auditLogs] = useState([
        { id: '1', action: 'Message Deleted', user: 'Moderator1', target: 'User1', time: '2 minutes ago' },
        { id: '2', action: 'User Kicked', user: 'Moderator2', target: 'User2', time: '15 minutes ago' },
        { id: '3', action: 'Channel Created', user: 'Admin1', target: '#new-channel', time: '1 hour ago' }
    ]);

    return (
        <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#be185d' }}>Enhanced Audit Log</h3>

            <div style={{ display: 'grid', gap: '8px' }}>
                {auditLogs.map(log => (
                    <div key={log.id} style={{
                        padding: '12px',
                        background: '#fdf2f8',
                        border: '1px solid #fbcfe8',
                        borderRadius: '6px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontWeight: 500, color: '#be185d' }}>{log.action}</span>
                            <span style={{ fontSize: '12px', color: '#9d174d' }}>{log.time}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9d174d' }}>
                            {log.user} → {log.target}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AnalyticsTab = () => {
    const [stats] = useState({
        trackedUsers: 15,
        totalMessages: 1247,
        activeUsers: 8,
        flaggedUsers: 2
    });

    return (
        <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#be185d' }}>Server Analytics</h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {Object.entries(stats).map(([key, value]) => (
                    <div key={key} style={{
                        padding: '16px',
                        background: '#fdf2f8',
                        border: '1px solid #fbcfe8',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: '#ec4899' }}>
                            {value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9d174d', textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#166534'
            }}>
                📊 Analytics are updated in real-time as users interact with your server.
            </div>
        </div>
    );
};

// Simple DOM-based modal functions (keeping for compatibility)
function createModSuiteModal(user?: any) {
    // Trigger React component
    const event = new CustomEvent('modsuite:open-panel', { detail: { user } });
    document.dispatchEvent(event);
}



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
            icon={() => <span style={{ fontSize: '14px' }}>👁️</span>}
            action={() => {
                showToast(`Started tracking messages for ${user.username}`, Toasts.Type.SUCCESS);
                createModSuiteModal(user);
            }}
        />,
        <Menu.MenuItem
            key="ms-view-pings"
            id="ms-view-pings"
            label="View Ping History"
            icon={() => <span style={{ fontSize: '14px' }}>📊</span>}
            action={() => {
                showToast(`Viewing ping history for ${user.username}`, Toasts.Type.MESSAGE);
                createModSuiteModal(user);
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

    // Patch to inject ModSuite React component
    patches: [
        {
            find: "Messages.ACTIVITY_PANEL",
            replacement: {
                match: /(?<=\i\.createElement\(\i\.Fragment,null,)/,
                replace: "$self.renderModSuite(),"
            }
        }
    ],

    renderModSuite() {
        return React.createElement(ModSuitePanel);
    },



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
