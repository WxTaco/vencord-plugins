/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openUserProfile, insertTextIntoChatInputBox } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { Avatar, Button, Forms, React, SearchableSelect, Text, TextArea, TextInput, useState } from "@webpack/common";

import { Bookmark } from "../types";
import { updateBookmark, getAllFolders, getAllTags, addFolder, addTag } from "../storage";

interface BookmarkEditorProps {
    bookmark: Bookmark;
    onUpdate: () => void;
    onClose: () => void;
}

export function BookmarkEditor({ bookmark, onUpdate, onClose }: BookmarkEditorProps) {
    const [folder, setFolder] = useState(bookmark.folder);
    const [tags, setTags] = useState<string[]>(bookmark.tags);
    const [note, setNote] = useState(bookmark.note);
    const [newTag, setNewTag] = useState("");
    const [newFolder, setNewFolder] = useState("");

    const folders = getAllFolders();
    const allTags = getAllTags();

    const handleSave = () => {
        updateBookmark(bookmark.id, {
            folder,
            tags,
            note
        });
        onUpdate();
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            const updatedTags = [...tags, newTag.trim()];
            setTags(updatedTags);
            addTag(newTag.trim());
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleAddFolder = () => {
        if (newFolder.trim() && !folders.includes(newFolder.trim())) {
            addFolder(newFolder.trim());
            setFolder(newFolder.trim());
            setNewFolder("");
        }
    };

    const handleCopyLink = () => {
        copyWithToast(bookmark.jumpLink, "Message link copied to clipboard!");
    };

    const handleSendToChat = () => {
        insertTextIntoChatInputBox(bookmark.jumpLink + " ");
    };

    const handleAuthorClick = () => {
        openUserProfile(bookmark.author.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const folderOptions = folders.map(f => ({ label: f, value: f }));
    const tagOptions = allTags.map(t => ({ label: t, value: t }));

    return (
        <div className="vc-bookmark-editor">
            <div className="vc-bookmark-editor-header">
                <Forms.FormTitle tag="h3">Edit Bookmark</Forms.FormTitle>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={onClose}
                >
                    ✕
                </Button>
            </div>

            {/* Original Message Preview */}
            <div className="vc-bookmark-preview">
                <div className="vc-bookmark-preview-header">
                    <div className="vc-bookmark-author" onClick={handleAuthorClick}>
                        <Avatar
                            src={bookmark.author.avatar
                                ? `https://cdn.discordapp.com/avatars/${bookmark.author.id}/${bookmark.author.avatar}.png`
                                : undefined
                            }
                            size="SIZE_24"
                        />
                        <div>
                            <Text variant="text-sm/semibold" color="text-normal">
                                {bookmark.author.username}
                            </Text>
                            <Text variant="text-xs/normal" color="text-muted">
                                {formatDate(bookmark.timestamp)}
                            </Text>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.LINK}
                            onClick={handleCopyLink}
                        >
                            Copy Link
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.PRIMARY}
                            onClick={handleSendToChat}
                        >
                            Send to Chat
                        </Button>
                    </div>
                </div>

                <div className="vc-bookmark-preview-content">
                    <Text variant="text-sm/normal" color="text-normal">
                        {bookmark.content}
                    </Text>
                </div>

                {bookmark.attachments.length > 0 && (
                    <div className="vc-bookmark-attachments">
                        <Forms.FormTitle tag="h5">Attachments ({bookmark.attachments.length})</Forms.FormTitle>
                        {bookmark.attachments.map(attachment => (
                            <div key={attachment.id} className="vc-attachment-item">
                                <Text variant="text-xs/normal" color="text-muted">
                                    📎 {attachment.filename}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}

                {bookmark.embeds.length > 0 && (
                    <div className="vc-bookmark-embeds">
                        <Forms.FormTitle tag="h5">Embeds ({bookmark.embeds.length})</Forms.FormTitle>
                        {bookmark.embeds.map((embed, index) => (
                            <div key={index} className="vc-embed-item">
                                <Text variant="text-xs/normal" color="text-muted">
                                    🔗 {embed.title || embed.description || "Embed"}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}

                <div className="vc-bookmark-location">
                    <Text variant="text-xs/normal" color="text-muted">
                        {bookmark.guildName ? `${bookmark.guildName} • ` : ""}
                        #{bookmark.channelName}
                    </Text>
                </div>
            </div>

            {/* Edit Form */}
            <div className="vc-bookmark-form">
                {/* Folder Selection */}
                <div className="vc-form-section">
                    <Forms.FormTitle tag="h5">Folder</Forms.FormTitle>
                    <div className="vc-folder-input">
                        <SearchableSelect
                            options={folderOptions}
                            value={folderOptions.find(opt => opt.value === folder)}
                            onChange={(option: any) => setFolder(option?.value || "")}
                            placeholder="Select or type folder name..."
                        />
                        <div className="vc-new-folder">
                            <TextInput
                                placeholder="New folder name..."
                                value={newFolder}
                                onChange={setNewFolder}
                                onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
                            />
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.BRAND}
                                onClick={handleAddFolder}
                                disabled={!newFolder.trim()}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div className="vc-form-section">
                    <Forms.FormTitle tag="h5">Tags</Forms.FormTitle>
                    <div className="vc-tags-container">
                        <div className="vc-current-tags">
                            {tags.map(tag => (
                                <span key={tag} className="vc-tag">
                                    {tag}
                                    <button
                                        className="vc-tag-remove"
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="vc-add-tag">
                            <TextInput
                                placeholder="Add tag..."
                                value={newTag}
                                onChange={setNewTag}
                                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                            />
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.BRAND}
                                onClick={handleAddTag}
                                disabled={!newTag.trim() || tags.includes(newTag.trim())}
                            >
                                Add
                            </Button>
                        </div>

                        {allTags.length > 0 && (
                            <div className="vc-suggested-tags">
                                <Text variant="text-xs/normal" color="text-muted">
                                    Suggested:
                                </Text>
                                {allTags
                                    .filter(tag => !tags.includes(tag))
                                    .slice(0, 5)
                                    .map(tag => (
                                        <button
                                            key={tag}
                                            className="vc-suggested-tag"
                                            onClick={() => setTags([...tags, tag])}
                                        >
                                            {tag}
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Note */}
                <div className="vc-form-section">
                    <Forms.FormTitle tag="h5">Note</Forms.FormTitle>
                    <TextArea
                        placeholder="Add a note or context for this bookmark..."
                        value={note}
                        onChange={setNote}
                        rows={3}
                    />
                </div>

                {/* Actions */}
                <div className="vc-form-actions">
                    <Button
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.BRAND}
                        onClick={handleSave}
                    >
                        Save Changes
                    </Button>
                    <Button
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.PRIMARY}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
