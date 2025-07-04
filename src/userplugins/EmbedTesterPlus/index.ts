/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";
import { ApplicationCommandInputType } from "@api/Commands";
import { EmbedTesterModal } from "./components/EmbedTesterModal";

export default definePlugin({
    name: "EmbedBuilder",
    description: "Embed Builder with visual editor and image generation 🌸",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "embed",
            description: "Open the Embed Builder 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => {
                openEmbedTester();
            }
        },
        {
            name: "embed-builder",
            description: "Open Embed Builder (alias for /embed) 🌸",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => {
                openEmbedTester();
            }
        }
    ],

    start() {
        console.log("EmbedBuilder: Plugin started 🌸");
    },

    stop() {
        console.log("EmbedBuilder: Plugin stopped");
    },

    // Add settings panel button with professional theme
    settingsAboutComponent: () => {
        return React.createElement("div", {
            style: {
                padding: "20px",
                background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
                border: "2px solid #f9a8d4",
                borderRadius: "12px",
                margin: "12px 0"
            }
        }, [
            React.createElement("h3", {
                key: "title",
                style: {
                    margin: "0 0 8px 0",
                    color: "#be185d",
                    fontSize: "18px",
                    fontWeight: "600"
                }
            }, "Embed Builder 🌸"),
            React.createElement("p", {
                key: "desc",
                style: {
                    margin: "0 0 16px 0",
                    color: "#831843",
                    fontSize: "14px",
                    lineHeight: "1.5"
                }
            }, "Beautiful Discord embed builder with visual editor, JSON editor, and image generation capabilities."),
            React.createElement("div", {
                key: "buttons",
                style: { display: "flex", gap: "8px", flexWrap: "wrap" }
            }, [
                React.createElement("button", {
                    key: "btn1",
                    onClick: () => openEmbedTester(),
                    style: {
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #ec4899, #be185d)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        boxShadow: "0 2px 4px rgba(190, 24, 93, 0.3)"
                    }
                }, "Open Embed Builder 🌸"),
                React.createElement("div", {
                    key: "info",
                    style: {
                        fontSize: "12px",
                        color: "#9d174d",
                        marginTop: "4px",
                        fontStyle: "italic"
                    }
                }, "Also available via /embed or /embed-builder commands 🌸")
            ])
        ]);
    }
});

// Function to open the embed tester modal
function openEmbedTester() {
    openModal(props => React.createElement(EmbedTesterModal, props));
}

// Export for use in other components
export { openEmbedTester };
