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
import { ChannelStore, Menu, React, SelectedChannelStore, showToast, Toasts, useState } from "@webpack/common";

// import { FloatingButtonManager } from "./components/FloatingButton";
// import { ModPanel } from "./components/ModPanel";
import { settings } from "./settings";
import { checkMonitoringStatus, initializeMessageMonitoring } from "./utils/messageMonitor";
import { hasAnyModPermissions } from "./utils/permissions";

const cl = classNameFactory("ms-");

// Global state for ModSuite panel
let modSuitePanelOpen = false;

// Simple ModSuite Panel Component
const SimpleModSuitePanel = () => {
    const [isPanelOpen, setIsPanelOpen] = useState(modSuitePanelOpen);

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        modSuitePanelOpen = false;
    };

    // Listen for external panel open requests
    React.useEffect(() => {
        const handleOpenPanel = () => {
            setIsPanelOpen(true);
            modSuitePanelOpen = true;
        };

        document.addEventListener('modsuite:open-panel', handleOpenPanel);
        return () => document.removeEventListener('modsuite:open-panel', handleOpenPanel);
    }, []);

    if (!isPanelOpen) return null;

    return (
        <ErrorBoundary noop>
            <div style={{
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
            }} onClick={handleClosePanel}>
                <div style={{
                    width: '400px',
                    height: '300px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #eee'
                    }}>
                        <h2 style={{ margin: 0, color: '#ec4899' }}>ModSuite</h2>
                        <button
                            onClick={handleClosePanel}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '18px',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <div style={{ color: '#333' }}>
                        <p>🎉 ModSuite is working!</p>
                        <p>This is a basic panel. The full features will be added once this is working.</p>
                        <p>Current channel: {SelectedChannelStore.getChannelId()}</p>
                        <button
                            onClick={handleClosePanel}
                            style={{
                                backgroundColor: '#ec4899',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginTop: '16px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};



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
                    // Trigger panel open event
                    document.dispatchEvent(new CustomEvent('modsuite:open-panel'));
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

        // Show success toast
        showToast("ModSuite plugin loaded successfully!", Toasts.Type.SUCCESS);
    },

    stop() {
        console.log("ModSuite plugin stopped");

        // Stop message monitoring
        checkMonitoringStatus();
    },

    // Patch to inject ModSuite into Discord's app
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
        return React.createElement(SimpleModSuitePanel);
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
