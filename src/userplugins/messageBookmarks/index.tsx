/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { LinkIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, Menu } from "@webpack/common";

import { BookmarkManagerModal } from "./components/BookmarkManagerModal";
import { addBookmark, removeBookmark, isBookmarked, setShowToasts, initializeCache } from "./storage";
import { Bookmark } from "./types";

const settings = definePluginSettings({
    showInMessageMenu: {
        type: OptionType.BOOLEAN,
        description: "Show bookmark option in message context menu",
        default: true
    },
    defaultFolder: {
        type: OptionType.STRING,
        description: "Default folder for new bookmarks",
        default: "General"
    },
    maxBookmarks: {
        type: OptionType.NUMBER,
        description: "Maximum number of bookmarks (0 = unlimited)",
        default: 1000
    },
    autoAddTags: {
        type: OptionType.BOOLEAN,
        description: "Automatically suggest tags based on message content",
        default: false
    },
    preserveEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Save embed data with bookmarks",
        default: true
    },
    preserveAttachments: {
        type: OptionType.BOOLEAN,
        description: "Save attachment metadata with bookmarks",
        default: true
    },
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show toast notifications when bookmarking",
        default: true
    },
    compactView: {
        type: OptionType.BOOLEAN,
        description: "Use compact view in bookmark list",
        default: false
    }
});

function createBookmarkFromMessage(message: any): Bookmark {
    const channel = ChannelStore.getChannel(message.channel_id);
    const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

    // Auto-generate tags if enabled
    let autoTags: string[] = [];
    if (settings.store.autoAddTags && message.content) {
        const content = message.content.toLowerCase();
        // Simple keyword detection for auto-tagging
        if (content.includes("todo") || content.includes("task")) autoTags.push("todo");
        if (content.includes("important") || content.includes("urgent")) autoTags.push("important");
        if (content.includes("funny") || content.includes("lol") || content.includes("😂")) autoTags.push("funny");
        if (content.includes("resource") || content.includes("link") || content.includes("http")) autoTags.push("resource");
        if (content.includes("meeting") || content.includes("schedule")) autoTags.push("meeting");
    }

    return {
        id: message.id,
        content: message.content || "[No text content]",
        author: {
            id: message.author.id,
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatar: message.author.avatar
        },
        channelId: message.channel_id,
        channelName: channel?.name || "Unknown Channel",
        guildId: guild?.id || null,
        guildName: guild?.name || null,
        timestamp: message.timestamp,
        attachments: settings.store.preserveAttachments ? (message.attachments || []) : [],
        embeds: settings.store.preserveEmbeds ? (message.embeds || []) : [],
        tags: autoTags,
        folder: settings.store.defaultFolder,
        note: "",
        jumpLink: `https://discord.com/channels/${guild?.id || "@me"}/${message.channel_id}/${message.id}`,
        bookmarkedAt: new Date().toISOString()
    };
}

const MessageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message || !settings.store.showInMessageMenu) return;

    const bookmarked = isBookmarked(message.id);

    children.push(
        <Menu.MenuItem
            id="vc-bookmark-message"
            label={bookmarked ? "Remove Bookmark" : "Bookmark Message"}
            action={() => {
                if (bookmarked) {
                    removeBookmark(message.id);
                } else {
                    const bookmark = createBookmarkFromMessage(message);
                    addBookmark(bookmark);
                }
            }}
            icon={LinkIcon}
        />
    );
};

function openBookmarkManager() {
    openModal(props => <BookmarkManagerModal {...props} />);
}

export default definePlugin({
    name: "MessageBookmarks",
    description: "Save and organize Discord messages as bookmarks with tags, folders, search, and export functionality",
    authors: [{ name: "Anonymous", id: 0n }],
    settings,

    contextMenus: {
        "message": MessageContextMenuPatch
    },

    commands: [
        {
            name: "bookmarks",
            description: "Open bookmark manager",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => {
                openBookmarkManager();
            }
        }
    ],

    async start() {
        // Initialize settings
        setShowToasts(settings.store.showToasts);
        // Initialize cache from DataStore
        await initializeCache();
    },

    stop() {
        // Cleanup if needed
    }
});

// Export utilities for other components
export { openBookmarkManager, createBookmarkFromMessage };
