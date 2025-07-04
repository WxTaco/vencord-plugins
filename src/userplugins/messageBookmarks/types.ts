/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface BookmarkAuthor {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
}

export interface BookmarkAttachment {
    id: string;
    filename: string;
    url: string;
    proxy_url: string;
    size: number;
    width?: number;
    height?: number;
    content_type?: string;
}

export interface BookmarkEmbed {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: {
        text: string;
        icon_url?: string;
    };
    image?: {
        url: string;
        width?: number;
        height?: number;
    };
    thumbnail?: {
        url: string;
        width?: number;
        height?: number;
    };
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export interface Bookmark {
    id: string; // Message ID
    content: string;
    author: BookmarkAuthor;
    channelId: string;
    channelName: string;
    guildId: string | null;
    guildName: string | null;
    timestamp: string;
    attachments: BookmarkAttachment[];
    embeds: BookmarkEmbed[];
    tags: string[];
    folder: string;
    note: string;
    jumpLink: string;
    bookmarkedAt: string;
}

export interface BookmarkFilter {
    search?: string;
    tags?: string[];
    folder?: string;
    author?: string;
    guild?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

export interface BookmarkExportData {
    version: string;
    exportedAt: string;
    bookmarks: Bookmark[];
    folders: string[];
    tags: string[];
}

export interface BookmarkStats {
    total: number;
    folders: Record<string, number>;
    tags: Record<string, number>;
    authors: Record<string, number>;
    guilds: Record<string, number>;
}
