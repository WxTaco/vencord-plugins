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
import { ChannelStore, GuildStore, Menu, React, ReactDOM, SelectedChannelStore, showToast, Toasts, useState } from "@webpack/common";

import { FloatingButtonManager } from "./components/FloatingButton";
import { ModPanel } from "./components/ModPanel";
import { settings } from "./settings";
import { checkMonitoringStatus, initializeMessageMonitoring } from "./utils/messageMonitor";
import { hasAnyModPermissions } from "./utils/permissions";

const cl = classNameFactory("ms-");

// Main ModSuite Manager Component
const ModSuiteManager = () => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [currentChannel, setCurrentChannel] = useState(() => {
        const channelId = SelectedChannelStore.getChannelId();
        return ChannelStore.getChannel(channelId);
    });
    const [currentGuild, setCurrentGuild] = useState(() => {
        return currentChannel?.guild_id ? GuildStore.getGuild(currentChannel.guild_id) : undefined;
    });

    const handleTogglePanel = () => {
        // Update current channel/guild when opening panel
        if (!isPanelOpen) {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : undefined;

            setCurrentChannel(channel);
            setCurrentGuild(guild);
        }

        setIsPanelOpen(!isPanelOpen);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
    };

    return (
        <ErrorBoundary noop>
            <div className={cl("container")}>
                {settings.store.showFloatingButton && (
                    <FloatingButtonManager onToggle={handleTogglePanel} />
                )}

                <ModPanel
                    channel={currentChannel}
                    guild={currentGuild}
                    isVisible={isPanelOpen}
                    onClose={handleClosePanel}
                />
            </div>
        </ErrorBoundary>
    );
};

// Context menu patches for user actions
const userContextPatch: NavContextMenuPatchCallback = (children, { user, channel, guild }) => {
    if (!user || !settings.store.enableContextMenu) return;

    const currentChannel = channel || ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (!currentChannel || !hasAnyModPermissions(currentChannel)) return;

    const group = children.find(child =>
        Array.isArray(child?.props?.children) &&
        child.props.children.some((c: any) => c?.props?.id === "user-profile")
    );

    if (group) {
        group.props.children.push(
            <Menu.MenuSeparator key="ms-separator" />,
            <Menu.MenuItem
                key="ms-track-user"
                id="ms-track-user"
                label="Track Messages"
                icon={() => <span style={{ fontSize: '14px' }}>👁️</span>}
                action={() => {
                    showToast(`Started tracking messages for ${user.username}`, Toasts.Type.SUCCESS);
                    // In a real implementation, this would start message tracking
                    console.log('Track user:', user.id);
                }}
                disabled={!settings.store.enableUserTracking}
            />,
            <Menu.MenuItem
                key="ms-view-pings"
                id="ms-view-pings"
                label="View Ping History"
                icon={() => <span style={{ fontSize: '14px' }}>📊</span>}
                action={() => {
                    showToast(`Viewing ping history for ${user.username}`, Toasts.Type.MESSAGE);
                    // In a real implementation, this would open ping history
                    console.log('View pings for user:', user.id);
                }}
                disabled={!settings.store.enablePingMonitor}
            />
        );
    }
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
                    // TODO: Open ModSuite panel for this channel
                    console.log('Open ModSuite for channel:', channel.id);
                }}
            />
        );
    }
};

// Plugin definition
export default definePlugin({
    name: "ModSuite",
    description: "Comprehensive moderation toolkit with floating button, quick actions, mass deletion, ping monitoring, and enhanced audit logs",
    authors: [{ name: "ModSuite", id: 0n }], // Replace with actual author info

    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "channel-context": channelContextPatch,
        "thread-context": channelContextPatch,
    },

    start() {
        console.log("ModSuite plugin started");

        // Initialize any necessary state or listeners
        this.initializePlugin();

        // Initialize message monitoring
        initializeMessageMonitoring();
    },

    stop() {
        console.log("ModSuite plugin stopped");

        // Cleanup any listeners or state
        this.cleanupPlugin();

        // Stop message monitoring
        checkMonitoringStatus();
    },

    initializePlugin() {
        // Add the ModSuite manager to the DOM
        const container = document.createElement('div');
        container.id = 'modsuite-root';
        document.body.appendChild(container);

        // Render the ModSuite manager
        ReactDOM.render(<ModSuiteManager />, container);

        this.container = container;
    },

    cleanupPlugin() {
        // Cleanup React root and container
        if (this.container) {
            ReactDOM.unmountComponentAtNode(this.container);
            this.container.remove();
            this.container = null;
        }
    },

    // Plugin patches for integrating with Discord
    patches: [
        // Patch to inject our styles
        {
            find: "document.head.appendChild",
            replacement: {
                match: /document\.head\.appendChild\((\i)\)/,
                replace: "$&;$self.injectStyles?.($1)"
            },
            predicate: () => settings.store.useCustomTheme
        }
    ],

    injectStyles(element: HTMLElement) {
        // Inject our custom styles if needed
        if (element?.tagName === 'STYLE' && settings.store.useCustomTheme) {
            // Add any dynamic style injection here if needed
        }
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
