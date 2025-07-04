/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openUserProfile, insertTextIntoChatInputBox } from "@utils/discord";
import { classes, copyWithToast } from "@utils/misc";
import { Avatar, Button, Forms, React, Text, Tooltip } from "@webpack/common";

import { Bookmark } from "../types.js";
import { removeBookmark } from "../storage.js";

interface BookmarkListProps {
    bookmarks: Bookmark[];
    onSelect: (bookmark: Bookmark) => void;
    selectedBookmark: Bookmark | null;
    onUpdate: () => void;
}

export function BookmarkList({ bookmarks, onSelect, selectedBookmark, onUpdate }: BookmarkListProps) {
    const handleDelete = (bookmark: Bookmark, e: React.MouseEvent) => {
        e.stopPropagation();
        removeBookmark(bookmark.id);
        onUpdate();
    };

    const handleCopyLink = (bookmark: Bookmark, e: React.MouseEvent) => {
        e.stopPropagation();
        copyWithToast(bookmark.jumpLink, "Message link copied to clipboard!");
    };

    const handleSendToChat = (bookmark: Bookmark, e: React.MouseEvent) => {
        e.stopPropagation();
        insertTextIntoChatInputBox(bookmark.jumpLink + " ");
    };

    const handleAuthorClick = (bookmark: Bookmark, e: React.MouseEvent) => {
        e.stopPropagation();
        openUserProfile(bookmark.author.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    if (bookmarks.length === 0) {
        return (
            <div className="vc-bookmark-empty">
                <Text variant="text-md/normal" color="text-muted">
                    No bookmarks found. Right-click on any message to bookmark it!
                </Text>
            </div>
        );
    }

    return (
        <div className="vc-bookmark-list">
            <div className="vc-bookmark-list-header">
                <Text variant="text-sm/semibold" color="text-muted">
                    {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
                </Text>
            </div>

            <div className="vc-bookmark-items">
                {bookmarks.map(bookmark => (
                    <div
                        key={bookmark.id}
                        className={classes(
                            "vc-bookmark-item",
                            selectedBookmark?.id === bookmark.id && "vc-bookmark-item-selected"
                        )}
                        onClick={() => onSelect(bookmark)}
                    >
                        <div className="vc-bookmark-item-header">
                            <div className="vc-bookmark-author" onClick={(e) => handleAuthorClick(bookmark, e)}>
                                <Avatar
                                    src={bookmark.author.avatar
                                        ? `https://cdn.discordapp.com/avatars/${bookmark.author.id}/${bookmark.author.avatar}.png`
                                        : undefined
                                    }
                                    size="SIZE_20"
                                />
                                <Text variant="text-sm/semibold" color="text-normal">
                                    {bookmark.author.username}
                                </Text>
                            </div>

                            <div className="vc-bookmark-actions">
                                <Tooltip text="Copy message link">
                                    {() => (
                                        <Button
                                            size={Button.Sizes.TINY}
                                            color={Button.Colors.LINK}
                                            onClick={(e) => handleCopyLink(bookmark, e)}
                                        >
                                            📋
                                        </Button>
                                    )}
                                </Tooltip>

                                <Tooltip text="Send to chat">
                                    {() => (
                                        <Button
                                            size={Button.Sizes.TINY}
                                            color={Button.Colors.PRIMARY}
                                            onClick={(e) => handleSendToChat(bookmark, e)}
                                        >
                                            💬
                                        </Button>
                                    )}
                                </Tooltip>

                                <Tooltip text="Delete bookmark">
                                    {() => (
                                        <Button
                                            size={Button.Sizes.TINY}
                                            color={Button.Colors.RED}
                                            onClick={(e) => handleDelete(bookmark, e)}
                                        >
                                            🗑️
                                        </Button>
                                    )}
                                </Tooltip>
                            </div>
                        </div>

                        <div className="vc-bookmark-content">
                            <Text variant="text-sm/normal" color="text-normal">
                                {truncateText(bookmark.content)}
                            </Text>
                        </div>

                        {bookmark.attachments.length > 0 && (
                            <div className="vc-bookmark-attachments">
                                <Text variant="text-xs/normal" color="text-muted">
                                    📎 {bookmark.attachments.length} attachment{bookmark.attachments.length !== 1 ? "s" : ""}
                                </Text>
                            </div>
                        )}

                        {bookmark.embeds.length > 0 && (
                            <div className="vc-bookmark-embeds">
                                <Text variant="text-xs/normal" color="text-muted">
                                    🔗 {bookmark.embeds.length} embed{bookmark.embeds.length !== 1 ? "s" : ""}
                                </Text>
                            </div>
                        )}

                        <div className="vc-bookmark-meta">
                            <div className="vc-bookmark-location">
                                <Text variant="text-xs/normal" color="text-muted">
                                    {bookmark.guildName ? `${bookmark.guildName} • ` : ""}
                                    #{bookmark.channelName}
                                </Text>
                            </div>

                            <div className="vc-bookmark-folder">
                                <Text variant="text-xs/normal" color="text-muted">
                                    📁 {bookmark.folder}
                                </Text>
                            </div>
                        </div>

                        {bookmark.tags.length > 0 && (
                            <div className="vc-bookmark-tags">
                                {bookmark.tags.map(tag => (
                                    <span key={tag} className="vc-bookmark-tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {bookmark.note && (
                            <div className="vc-bookmark-note">
                                <Text variant="text-xs/normal" color="text-muted">
                                    💭 {truncateText(bookmark.note, 50)}
                                </Text>
                            </div>
                        )}

                        <div className="vc-bookmark-timestamp">
                            <Text variant="text-xs/normal" color="text-muted">
                                Bookmarked {formatDate(bookmark.bookmarkedAt)}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
