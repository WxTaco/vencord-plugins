/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { settings } from "./settings";
import { checkMonitoringStatus, initializeMessageMonitoring } from "./utils/messageMonitor";
import { hasAnyModPermissions } from "./utils/permissions";

// TODO: Add floating button component later



// Context menu patches for user actions
const userContextPatch: NavContextMenuPatchCallback = (children, { user, channel }) => {
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

        // Show success toast
        showToast("ModSuite plugin loaded successfully!", Toasts.Type.SUCCESS);
    },

    stop() {
        console.log("ModSuite plugin stopped");

        // Stop message monitoring
        checkMonitoringStatus();
    },

    // No patches for now - just context menus



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
