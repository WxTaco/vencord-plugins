/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";
import { FluxDispatcher } from "@webpack/common";
import { SelectedGuildStore } from "@webpack/common";
import { GraphPanel } from "./components/GraphPanel";
import { ActivityTracker } from "./utils/activityTracker";
import { settings } from "./settings";

// Global activity tracker instance
let activityTracker: ActivityTracker;

export default definePlugin({
    name: "ServerActivityGrapher",
    description: "Track and visualize Discord server activity with charts, heatmaps, and exportable analytics",
    authors: [{ name: "taco.ot", id: 905201724539666503n }],
    dependencies: ["CommandsAPI"],

    settings,

    commands: [
        {
            name: "activity",
            description: "Open the Server Activity Grapher",
            execute: () => {
                openActivityGrapher();
                return { content: "" }; // Prevent message from being sent
            }
        },
        {
            name: "server-stats",
            description: "View server activity statistics (alias)",
            execute: () => {
                openActivityGrapher();
                return { content: "" }; // Prevent message from being sent
            }
        }
    ],

    start() {
        console.log("ServerActivityGrapher: Plugin started");

        // Initialize activity tracker
        activityTracker = new ActivityTracker();

        // Hook into message events
        this.messageCreateHandler = this.handleMessageCreate.bind(this);
        this.guildMemberAddHandler = this.handleGuildMemberAdd.bind(this);
        this.guildMemberRemoveHandler = this.handleGuildMemberRemove.bind(this);

        FluxDispatcher.subscribe("MESSAGE_CREATE", this.messageCreateHandler);
        FluxDispatcher.subscribe("GUILD_MEMBER_ADD", this.guildMemberAddHandler);
        FluxDispatcher.subscribe("GUILD_MEMBER_REMOVE", this.guildMemberRemoveHandler);

        // Make tracker globally available
        (window as any).ServerActivityTracker = activityTracker;
    },

    stop() {
        console.log("ServerActivityGrapher: Plugin stopped");

        // Cleanup event listeners
        if (this.messageCreateHandler) {
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.messageCreateHandler);
        }
        if (this.guildMemberAddHandler) {
            FluxDispatcher.unsubscribe("GUILD_MEMBER_ADD", this.guildMemberAddHandler);
        }
        if (this.guildMemberRemoveHandler) {
            FluxDispatcher.unsubscribe("GUILD_MEMBER_REMOVE", this.guildMemberRemoveHandler);
        }

        // Save data before stopping
        if (activityTracker) {
            activityTracker.saveData();
        }

        // Cleanup global reference
        delete (window as any).ServerActivityTracker;
    },

    handleMessageCreate(event: any) {
        if (!event.message || !settings.store.enableMessageTracking) return;

        const message = event.message;
        const guildId = SelectedGuildStore.getGuildId();

        if (!guildId) return; // Only track guild messages

        // Track message
        activityTracker.trackMessage({
            guildId,
            channelId: message.channel_id,
            userId: message.author.id,
            username: message.author.username,
            timestamp: Date.now(),
            content: message.content || '',
            hasAttachment: (message.attachments && message.attachments.length > 0),
            hasEmbed: (message.embeds && message.embeds.length > 0),
            mentionsEveryone: message.mention_everyone,
            mentionsHere: message.content?.includes('@here'),
            roleMentions: message.mention_roles || [],
            userMentions: message.mentions || []
        });
    },

    handleGuildMemberAdd(event: any) {
        if (!settings.store.enableJoinLeaveTracking) return;

        const guildId = event.guildId;
        const user = event.user;

        if (guildId && user) {
            activityTracker.trackJoinLeave({
                guildId,
                userId: user.id,
                username: user.username,
                type: 'join',
                timestamp: Date.now()
            });
        }
    },

    handleGuildMemberRemove(event: any) {
        if (!settings.store.enableJoinLeaveTracking) return;

        const guildId = event.guildId;
        const user = event.user;

        if (guildId && user) {
            activityTracker.trackJoinLeave({
                guildId,
                userId: user.id,
                username: user.username,
                type: 'leave',
                timestamp: Date.now()
            });
        }
    },

    // Settings panel component
    settingsAboutComponent: () => {
        return React.createElement("div", {
            style: {
                padding: "20px",
                background: "linear-gradient(135deg, #e0f2fe, #b3e5fc)",
                border: "2px solid #4fc3f7",
                borderRadius: "12px",
                margin: "12px 0"
            }
        }, [
            React.createElement("h3", {
                key: "title",
                style: {
                    margin: "0 0 8px 0",
                    color: "#0277bd",
                    fontSize: "18px",
                    fontWeight: "600"
                }
            }, "Server Activity Grapher"),
            React.createElement("p", {
                key: "desc",
                style: {
                    margin: "0 0 16px 0",
                    color: "#01579b",
                    fontSize: "14px",
                    lineHeight: "1.5"
                }
            }, "Professional Discord server analytics with interactive charts, heatmaps, and comprehensive data export capabilities."),
            React.createElement("div", {
                key: "buttons",
                style: { display: "flex", gap: "8px", flexWrap: "wrap" }
            }, [
                React.createElement("button", {
                    key: "btn1",
                    onClick: () => openActivityGrapher(),
                    style: {
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #29b6f6, #0277bd)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        boxShadow: "0 2px 4px rgba(2, 119, 189, 0.3)"
                    }
                }, "Open Activity Grapher"),
                React.createElement("div", {
                    key: "info",
                    style: {
                        fontSize: "12px",
                        color: "#0277bd",
                        marginTop: "4px",
                        fontStyle: "italic"
                    }
                }, "Also available via /activity or /server-stats commands")
            ])
        ]);
    }
});

// Function to open the activity grapher modal
function openActivityGrapher() {
    const currentGuildId = SelectedGuildStore.getGuildId();

    if (!currentGuildId) {
        console.warn("ServerActivityGrapher: No guild selected");
        return;
    }

    openModal(props => React.createElement(GraphPanel, {
        ...props,
        guildId: currentGuildId,
        activityTracker
    }));
}

// Export for use in other components
export { openActivityGrapher, activityTracker };
