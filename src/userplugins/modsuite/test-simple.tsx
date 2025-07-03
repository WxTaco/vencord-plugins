/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    testSetting: {
        type: OptionType.BOOLEAN,
        description: "Test setting for ModSuite",
        default: true,
    }
});

// Simple context menu patch to test if the plugin is working
const userContextPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user) return;

    children.push(
        <Menu.MenuSeparator key="modsuite-separator" />,
        <Menu.MenuItem
            key="modsuite-test"
            id="modsuite-test"
            label="ModSuite Test"
            icon={() => <span style={{ fontSize: '14px' }}>🛠️</span>}
            action={() => {
                showToast(`ModSuite is working! User: ${user.username}`, Toasts.Type.SUCCESS);
            }}
        />
    );
};

export default definePlugin({
    name: "ModSuite-Test",
    description: "Simple test version of ModSuite to verify plugin loading",
    authors: [Devs.Ven],
    
    settings,
    
    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
    },

    start() {
        console.log("ModSuite test plugin started!");
        showToast("ModSuite test plugin loaded successfully!", Toasts.Type.SUCCESS);
    },

    stop() {
        console.log("ModSuite test plugin stopped!");
    }
});
