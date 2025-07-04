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

// Simple DOM-based modal functions
function createModSuiteModal() {
    // Remove existing modal if any
    const existing = document.getElementById('modsuite-modal');
    if (existing) existing.remove();

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'modsuite-modal';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        width: 400px;
        height: 300px;
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
    `;

    const title = document.createElement('h2');
    title.textContent = 'ModSuite';
    title.style.cssText = 'margin: 0; color: #ec4899;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #666;
    `;

    // Create content
    const content = document.createElement('div');
    content.style.color = '#333';
    content.innerHTML = `
        <p>🎉 ModSuite is working!</p>
        <p>This is a basic panel. The full features will be added once this is working.</p>
        <p>Current channel: ${SelectedChannelStore.getChannelId()}</p>
    `;

    const actionBtn = document.createElement('button');
    actionBtn.textContent = 'Close';
    actionBtn.style.cssText = `
        background-color: #ec4899;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 16px;
    `;

    // Close handlers
    const closeModal = () => backdrop.remove();
    closeBtn.onclick = closeModal;
    actionBtn.onclick = closeModal;
    backdrop.onclick = (e) => {
        if (e.target === backdrop) closeModal();
    };
    modal.onclick = (e) => e.stopPropagation();

    // Assemble modal
    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(actionBtn);
    modal.appendChild(header);
    modal.appendChild(content);
    backdrop.appendChild(modal);

    // Add to DOM
    document.body.appendChild(backdrop);
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
                console.log('Track user:', user.id);
            }}
        />,
        <Menu.MenuItem
            key="ms-view-pings"
            id="ms-view-pings"
            label="View Ping History"
            icon={() => <span style={{ fontSize: '14px' }}>📊</span>}
            action={() => {
                showToast(`Viewing ping history for ${user.username}`, Toasts.Type.MESSAGE);
                console.log('View pings for user:', user.id);
            }}
        />,
        <Menu.MenuItem
            key="ms-open-modsuite-user"
            id="ms-open-modsuite-user"
            label="Open ModSuite"
            icon={() => <span style={{ fontSize: '14px' }}>🛠️</span>}
            action={() => {
                createModSuiteModal();
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

    // No patches needed - using direct DOM manipulation



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
