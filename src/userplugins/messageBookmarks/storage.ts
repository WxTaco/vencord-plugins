/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { showToast, Toasts } from "@webpack/common";

import { Bookmark, BookmarkFilter, BookmarkStats, BookmarkExportData } from "./types.js";

// Import settings to check if toasts should be shown
let showToastsEnabled = true;
export function setShowToasts(enabled: boolean) {
    showToastsEnabled = enabled;
}

function maybeShowToast(message: string, type: any) {
    if (showToastsEnabled) {
        showToast(message, type);
    }
}

const BOOKMARKS_KEY = "MessageBookmarks_bookmarks";
const FOLDERS_KEY = "MessageBookmarks_folders";
const TAGS_KEY = "MessageBookmarks_tags";

// In-memory cache with DataStore persistence
let bookmarksCache: Bookmark[] | null = null;
let foldersCache: string[] | null = null;
let tagsCache: string[] | null = null;

// Initialize cache from DataStore
export async function initializeCache() {
    if (bookmarksCache === null) {
        bookmarksCache = await DataStore.get(BOOKMARKS_KEY) ?? [];
        console.log("MessageBookmarks: Loaded", bookmarksCache.length, "bookmarks from DataStore");
    }
    if (foldersCache === null) {
        foldersCache = await DataStore.get(FOLDERS_KEY) ?? ["General"];
    }
    if (tagsCache === null) {
        tagsCache = await DataStore.get(TAGS_KEY) ?? [];
    }
}

// Synchronous storage functions using cache
function getFromStorage<T>(key: string, defaultValue: T): T {
    if (key === BOOKMARKS_KEY) return (bookmarksCache ?? defaultValue) as T;
    if (key === FOLDERS_KEY) return (foldersCache ?? defaultValue) as T;
    if (key === TAGS_KEY) return (tagsCache ?? defaultValue) as T;
    return defaultValue;
}

function setToStorage<T>(key: string, value: T): void {
    if (key === BOOKMARKS_KEY) {
        bookmarksCache = value as Bookmark[];
        DataStore.set(key, value).catch(error => console.error("Failed to save bookmarks to DataStore:", error));
    } else if (key === FOLDERS_KEY) {
        foldersCache = value as string[];
        DataStore.set(key, value).catch(error => console.error("Failed to save folders to DataStore:", error));
    } else if (key === TAGS_KEY) {
        tagsCache = value as string[];
        DataStore.set(key, value).catch(error => console.error("Failed to save tags to DataStore:", error));
    }
}

// Storage functions
export function getAllBookmarks(): Bookmark[] {
    return getFromStorage(BOOKMARKS_KEY, []);
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
    setToStorage(BOOKMARKS_KEY, bookmarks);
}

export function addBookmark(bookmark: Bookmark): void {
    const bookmarks = getAllBookmarks();

    // Check if already bookmarked
    if (bookmarks.some(b => b.id === bookmark.id)) {
        maybeShowToast("Message is already bookmarked!", Toasts.Type.MESSAGE);
        return;
    }

    bookmarks.unshift(bookmark); // Add to beginning
    saveBookmarks(bookmarks);

    // Update folders and tags
    addFolder(bookmark.folder);
    bookmark.tags.forEach((tag: string) => addTag(tag));

    maybeShowToast("Message bookmarked!", Toasts.Type.SUCCESS);
}

export function removeBookmark(messageId: string): void {
    const bookmarks = getAllBookmarks();
    const filtered = bookmarks.filter(b => b.id !== messageId);

    if (filtered.length === bookmarks.length) {
        maybeShowToast("Bookmark not found!", Toasts.Type.FAILURE);
        return;
    }

    saveBookmarks(filtered);
    maybeShowToast("Bookmark removed!", Toasts.Type.SUCCESS);
}

export function updateBookmark(messageId: string, updates: Partial<Bookmark>): void {
    const bookmarks = getAllBookmarks();
    const index = bookmarks.findIndex(b => b.id === messageId);

    if (index === -1) {
        maybeShowToast("Bookmark not found!", Toasts.Type.FAILURE);
        return;
    }

    bookmarks[index] = { ...bookmarks[index], ...updates };
    saveBookmarks(bookmarks);

    // Update folders and tags if changed
    if (updates.folder) addFolder(updates.folder);
    if (updates.tags) updates.tags.forEach((tag: string) => addTag(tag));

    maybeShowToast("Bookmark updated!", Toasts.Type.SUCCESS);
}

export function getBookmark(messageId: string): Bookmark | null {
    const bookmarks = getAllBookmarks();
    return bookmarks.find(b => b.id === messageId) ?? null;
}

export function isBookmarked(messageId: string): boolean {
    return getBookmark(messageId) !== null;
}

// Folder management
export function getAllFolders(): string[] {
    return getFromStorage(FOLDERS_KEY, ["General"]);
}

export function addFolder(folder: string): void {
    if (!folder.trim()) return;

    const folders = getAllFolders();
    if (!folders.includes(folder)) {
        folders.push(folder);
        folders.sort();
        setToStorage(FOLDERS_KEY, folders);
    }
}

export function removeFolder(folder: string): void {
    const folders = getAllFolders().filter(f => f !== folder);
    setToStorage(FOLDERS_KEY, folders);

    // Move bookmarks from deleted folder to "General"
    const bookmarks = getAllBookmarks();
    const updated = bookmarks.map(b =>
        b.folder === folder ? { ...b, folder: "General" } : b
    );
    saveBookmarks(updated);
}

export function renameFolder(oldName: string, newName: string): void {
    if (!newName.trim() || oldName === newName) return;

    const folders = getAllFolders();
    const index = folders.indexOf(oldName);
    if (index !== -1) {
        folders[index] = newName;
        folders.sort();
        setToStorage(FOLDERS_KEY, folders);

        // Update bookmarks
        const bookmarks = getAllBookmarks();
        const updated = bookmarks.map(b =>
            b.folder === oldName ? { ...b, folder: newName } : b
        );
        saveBookmarks(updated);
    }
}

// Tag management
export function getAllTags(): string[] {
    return getFromStorage(TAGS_KEY, []);
}

export function addTag(tag: string): void {
    if (!tag.trim()) return;

    const tags = getAllTags();
    if (!tags.includes(tag)) {
        tags.push(tag);
        tags.sort();
        setToStorage(TAGS_KEY, tags);
    }
}

export function removeTag(tag: string): void {
    const tags = getAllTags().filter(t => t !== tag);
    setToStorage(TAGS_KEY, tags);

    // Remove tag from all bookmarks
    const bookmarks = getAllBookmarks();
    const updated = bookmarks.map(b => ({
        ...b,
        tags: b.tags.filter(t => t !== tag)
    }));
    saveBookmarks(updated);
}

// Search and filter
export function searchBookmarks(filter: BookmarkFilter): Bookmark[] {
    let bookmarks = getAllBookmarks();

    if (filter.search) {
        const search = filter.search.toLowerCase();
        bookmarks = bookmarks.filter(b =>
            b.content.toLowerCase().includes(search) ||
            b.author.username.toLowerCase().includes(search) ||
            b.note.toLowerCase().includes(search) ||
            b.tags.some(tag => tag.toLowerCase().includes(search)) ||
            b.channelName.toLowerCase().includes(search) ||
            (b.guildName && b.guildName.toLowerCase().includes(search))
        );
    }

    if (filter.folder) {
        bookmarks = bookmarks.filter(b => b.folder === filter.folder);
    }

    if (filter.tags && filter.tags.length > 0) {
        bookmarks = bookmarks.filter(b =>
            filter.tags!.every(tag => b.tags.includes(tag))
        );
    }

    if (filter.author) {
        bookmarks = bookmarks.filter(b =>
            b.author.username.toLowerCase().includes(filter.author!.toLowerCase())
        );
    }

    if (filter.guild) {
        bookmarks = bookmarks.filter(b =>
            b.guildName && b.guildName.toLowerCase().includes(filter.guild!.toLowerCase())
        );
    }

    if (filter.dateFrom) {
        bookmarks = bookmarks.filter(b =>
            new Date(b.timestamp) >= filter.dateFrom!
        );
    }

    if (filter.dateTo) {
        bookmarks = bookmarks.filter(b =>
            new Date(b.timestamp) <= filter.dateTo!
        );
    }

    return bookmarks;
}

// Statistics
export function getBookmarkStats(): BookmarkStats {
    const bookmarks = getAllBookmarks();

    const stats: BookmarkStats = {
        total: bookmarks.length,
        folders: {},
        tags: {},
        authors: {},
        guilds: {}
    };

    bookmarks.forEach(bookmark => {
        // Count folders
        stats.folders[bookmark.folder] = (stats.folders[bookmark.folder] || 0) + 1;

        // Count tags
        bookmark.tags.forEach(tag => {
            stats.tags[tag] = (stats.tags[tag] || 0) + 1;
        });

        // Count authors
        const authorKey = `${bookmark.author.username}#${bookmark.author.discriminator}`;
        stats.authors[authorKey] = (stats.authors[authorKey] || 0) + 1;

        // Count guilds
        if (bookmark.guildName) {
            stats.guilds[bookmark.guildName] = (stats.guilds[bookmark.guildName] || 0) + 1;
        }
    });

    return stats;
}

// Export/Import
export function exportBookmarks(): BookmarkExportData {
    return {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        bookmarks: getAllBookmarks(),
        folders: getAllFolders(),
        tags: getAllTags()
    };
}

export function importBookmarks(data: BookmarkExportData): void {
    try {
        // Validate data structure
        if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
            throw new Error("Invalid bookmark data format");
        }

        // Import folders and tags first
        if (data.folders) {
            data.folders.forEach(folder => addFolder(folder));
        }

        if (data.tags) {
            data.tags.forEach(tag => addTag(tag));
        }

        // Import bookmarks
        const existingBookmarks = getAllBookmarks();
        const existingIds = new Set(existingBookmarks.map(b => b.id));

        let importedCount = 0;
        data.bookmarks.forEach(bookmark => {
            if (!existingIds.has(bookmark.id)) {
                existingBookmarks.push(bookmark);
                importedCount++;
            }
        });

        saveBookmarks(existingBookmarks);
        maybeShowToast(`Imported ${importedCount} bookmarks!`, Toasts.Type.SUCCESS);

    } catch (error) {
        console.error("Failed to import bookmarks:", error);
        maybeShowToast("Failed to import bookmarks!", Toasts.Type.FAILURE);
    }
}

// Clear all data
export function clearAllBookmarks(): void {
    setToStorage(BOOKMARKS_KEY, []);
    maybeShowToast("All bookmarks cleared!", Toasts.Type.SUCCESS);
}
