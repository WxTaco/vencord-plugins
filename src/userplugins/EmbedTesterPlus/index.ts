/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";
import { EmbedTesterModal } from "./components/EmbedTesterModal";

export default definePlugin({
    name: "EmbedTesterPlus",
    description: "Full-featured embed preview tool with visual builder and JSON editor",
    authors: [Devs.Ven], // Replace with your dev info

    start() {
        console.log("EmbedTesterPlus: Plugin started");
    },

    stop() {
        console.log("EmbedTesterPlus: Plugin stopped");
    },

    // Add settings panel button
    settingsAboutComponent: () => {
        return React.createElement("div", {
            style: {
                padding: "16px",
                background: "#f0f0f0",
                borderRadius: "8px",
                margin: "8px 0"
            }
        }, [
            React.createElement("h3", {
                key: "title",
                style: { margin: "0 0 8px 0", color: "#333" }
            }, "Embed Tester+"),
            React.createElement("p", {
                key: "desc",
                style: { margin: "0 0 12px 0", color: "#666", fontSize: "14px" }
            }, "Create and preview Discord embeds with a visual builder and JSON editor."),
            React.createElement("button", {
                key: "btn",
                onClick: () => openEmbedTester(),
                style: {
                    padding: "8px 16px",
                    background: "#5865f2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                }
            }, "Open Embed Tester")
        ]);
    }
});

// Function to open the embed tester modal
function openEmbedTester() {
    openModal(props => React.createElement(EmbedTesterModal, props));
}

// Export for use in other components
export { openEmbedTester };
