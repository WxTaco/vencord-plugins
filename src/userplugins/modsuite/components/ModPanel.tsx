/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ChannelStore, GuildStore, React, SelectedChannelStore, useEffect, useState } from "@webpack/common";

import { settings } from "../settings";
import { ModAction, ModPanelProps } from "../types";
import { getPermissionLevel } from "../utils/permissions";
import { Analytics } from "./Analytics";
import { MassDeleter } from "./MassDeleter";
import { ModlogViewer } from "./ModlogViewer";
import { PingMonitor } from "./PingMonitor";
import { QuickActions } from "./QuickActions";
import { UserTracker } from "./UserTracker";

const cl = classNameFactory("ms-");

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

export const ModPanel = ({
    channel,
    guild,
    isVisible,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'actions' | 'mass-delete' | 'tracking' | 'modlog' | 'analytics'>('actions');
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Update channel/guild when selection changes
    const [currentChannel, setCurrentChannel] = useState(channel);
    const [currentGuild, setCurrentGuild] = useState(guild);

    useEffect(() => {
        const updateChannel = () => {
            const channelId = SelectedChannelStore.getChannelId();
            const newChannel = ChannelStore.getChannel(channelId);
            const newGuild = newChannel?.guild_id ? GuildStore.getGuild(newChannel.guild_id) : undefined;

            setCurrentChannel(newChannel);
            setCurrentGuild(newGuild);
        };

        if (isVisible) {
            updateChannel();
            const unsubscribe = SelectedChannelStore.addChangeListener(updateChannel);
            return unsubscribe;
        }
    }, [isVisible]);

    const handleAction = (action: ModAction, data?: any) => {
        console.log('Action executed:', action.type, data);
        // Handle action completion, maybe show notification
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible || !currentChannel) return null;

    const permissionLevel = getPermissionLevel(currentChannel);
    const channelName = currentChannel.name || 'Direct Message';
    const guildName = currentGuild?.name || 'Direct Message';

    return (
        <ErrorBoundary noop>
            <div
                className={cl("mod-panel-backdrop")}
                onClick={handleBackdropClick}
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
            >
                <div className={cl("mod-panel")}>
                    <div className={cl("mod-panel-header")}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                ModSuite - {channelName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {guildName} • {permissionLevel}
                            </div>
                        </div>
                        <button
                            className={cl("mod-panel-close")}
                            onClick={onClose}
                            aria-label="Close ModSuite panel"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    <div className={cl("mod-panel-content")}>
                        {/* Tab Navigation */}
                        <div className={cl("tab-nav")} style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '16px',
                            borderBottom: '2px solid var(--ms-pink-200)',
                            paddingBottom: '8px'
                        }}>
                            {[
                                { id: 'actions', label: 'Quick Actions', enabled: settings.store.enableQuickActions },
                                { id: 'mass-delete', label: 'Mass Delete', enabled: settings.store.enableMassDeleter },
                                { id: 'tracking', label: 'User Tracking', enabled: settings.store.enableUserTracking },
                                { id: 'modlog', label: 'Mod Log', enabled: settings.store.enableModlogEnhancer },
                                { id: 'analytics', label: 'Analytics', enabled: true }
                            ].filter(tab => tab.enabled).map(tab => (
                                <button
                                    key={tab.id}
                                    className={cl("tab-button", { active: activeTab === tab.id })}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        background: activeTab === tab.id ? 'var(--ms-pink-500)' : 'var(--ms-pink-100)',
                                        color: activeTab === tab.id ? 'white' : 'var(--ms-pink-800)',
                                        border: 'none',
                                        borderRadius: 'var(--ms-border-radius)',
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'var(--ms-transition)'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'actions' && settings.store.enableQuickActions && (
                            <div>
                                <h3 style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '14px',
                                    color: 'var(--ms-pink-800)'
                                }}>
                                    Quick Moderation Actions
                                </h3>
                                <QuickActions
                                    channel={currentChannel}
                                    guild={currentGuild}
                                    user={selectedUser}
                                    onAction={handleAction}
                                />

                                {selectedUser && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: 'var(--ms-pink-50)',
                                        borderRadius: 'var(--ms-border-radius)',
                                        border: '1px solid var(--ms-pink-200)'
                                    }}>
                                        <div style={{ fontSize: '12px', color: 'var(--ms-pink-700)' }}>
                                            Selected User: {selectedUser.username}
                                        </div>
                                        <button
                                            className={cl("button", "small", "secondary")}
                                            onClick={() => setSelectedUser(null)}
                                            style={{ marginTop: '6px' }}
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'mass-delete' && settings.store.enableMassDeleter && (
                            <MassDeleter
                                channel={currentChannel}
                                onClose={() => setActiveTab('actions')}
                            />
                        )}

                        {activeTab === 'tracking' && settings.store.enableUserTracking && (
                            <div>
                                <UserTracker
                                    userId={selectedUser?.id}
                                    onUserSelect={(userId) => setSelectedUser({ id: userId })}
                                />

                                {settings.store.enablePingMonitor && (
                                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--ms-pink-200)' }}>
                                        <PingMonitor
                                            userId={selectedUser?.id}
                                            onThresholdExceeded={(userId, data) => {
                                                console.log('Threshold exceeded:', userId, data);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'modlog' && settings.store.enableModlogEnhancer && (
                            <ModlogViewer guild={currentGuild} />
                        )}

                        {activeTab === 'analytics' && (
                            <Analytics userId={selectedUser?.id} />
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};
