/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms, React, SearchableSelect, TextInput, useEffect, useState } from "@webpack/common";

import { BookmarkFilter, Bookmark } from "../types";
import { getAllBookmarks, getAllFolders, getAllTags, searchBookmarks, getBookmarkStats } from "../storage";
import { BookmarkList } from "./BookmarkList";
import { BookmarkEditor } from "./BookmarkEditor";
import { ExportImportPanel } from "./ExportImportPanel";

interface BookmarkManagerModalProps extends ModalProps {
    initialFilter?: BookmarkFilter;
}

export function BookmarkManagerModal({ onClose, ...props }: BookmarkManagerModalProps) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
    const [filter, setFilter] = useState<BookmarkFilter>({});
    const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
    const [activeTab, setActiveTab] = useState<"bookmarks" | "export" | "stats">("bookmarks");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const folders = getAllFolders();
    const tags = getAllTags();
    const stats = getBookmarkStats();

    // Load bookmarks on mount
    useEffect(() => {
        const allBookmarks = getAllBookmarks();
        setBookmarks(allBookmarks);
        setFilteredBookmarks(allBookmarks);
    }, []);

    // Apply filters when they change
    useEffect(() => {
        const currentFilter: BookmarkFilter = {
            search: searchQuery || undefined,
            folder: selectedFolder || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined
        };

        const filtered = searchBookmarks(currentFilter);
        setFilteredBookmarks(filtered);
        setFilter(currentFilter);
    }, [searchQuery, selectedFolder, selectedTags, bookmarks]);

    const handleBookmarkUpdate = () => {
        // Refresh bookmarks after update
        const allBookmarks = getAllBookmarks();
        setBookmarks(allBookmarks);
        setSelectedBookmark(null);
    };

    const handleBookmarkSelect = (bookmark: Bookmark) => {
        setSelectedBookmark(bookmark);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedFolder("");
        setSelectedTags([]);
    };

    const folderOptions = folders.map(folder => ({
        label: folder,
        value: folder
    }));

    const tagOptions = tags.map(tag => ({
        label: tag,
        value: tag
    }));

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">Message Bookmarks</Forms.FormTitle>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent className="vc-bookmark-manager">
                {/* Tab Navigation */}
                <div className="vc-bookmark-tabs">
                    <Button
                        size={Button.Sizes.SMALL}
                        color={activeTab === "bookmarks" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={() => setActiveTab("bookmarks")}
                    >
                        Bookmarks ({stats.total})
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={activeTab === "export" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={() => setActiveTab("export")}
                    >
                        Export/Import
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={activeTab === "stats" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={() => setActiveTab("stats")}
                    >
                        Statistics
                    </Button>
                </div>

                {activeTab === "bookmarks" && (
                    <div className="vc-bookmark-content">
                        {/* Search and Filter Panel */}
                        <div className="vc-bookmark-filters">
                            <div className="vc-bookmark-search">
                                <TextInput
                                    placeholder="Search bookmarks..."
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                />
                            </div>

                            <div className="vc-bookmark-filter-row">
                                <div className="vc-bookmark-filter-item">
                                    <Forms.FormTitle tag="h5">Folder</Forms.FormTitle>
                                    <SearchableSelect
                                        options={[{ label: "All Folders", value: "" }, ...folderOptions]}
                                        value={[{ label: "All Folders", value: "" }, ...folderOptions].find(opt => opt.value === selectedFolder)}
                                        onChange={(option: any) => setSelectedFolder(option?.value || "")}
                                        placeholder="Select folder..."
                                    />
                                </div>

                                <div className="vc-bookmark-filter-item">
                                    <Forms.FormTitle tag="h5">Tags</Forms.FormTitle>
                                    <SearchableSelect
                                        options={tagOptions}
                                        value={selectedTags.map(tag => tagOptions.find(opt => opt.value === tag)).filter(Boolean) as any}
                                        onChange={(options: any) => setSelectedTags(Array.isArray(options) ? options.map((opt: any) => opt.value) : [])}
                                        placeholder="Select tags..."
                                        multi
                                    />
                                </div>

                                <Button
                                    size={Button.Sizes.SMALL}
                                    color={Button.Colors.PRIMARY}
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="vc-bookmark-main">
                            <div className="vc-bookmark-list-container">
                                <BookmarkList
                                    bookmarks={filteredBookmarks}
                                    onSelect={handleBookmarkSelect}
                                    selectedBookmark={selectedBookmark}
                                    onUpdate={handleBookmarkUpdate}
                                />
                            </div>

                            {selectedBookmark && (
                                <div className="vc-bookmark-editor-container">
                                    <BookmarkEditor
                                        bookmark={selectedBookmark}
                                        onUpdate={handleBookmarkUpdate}
                                        onClose={() => setSelectedBookmark(null)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "export" && (
                    <ExportImportPanel onUpdate={handleBookmarkUpdate} />
                )}

                {activeTab === "stats" && (
                    <div className="vc-bookmark-stats">
                        <Forms.FormTitle tag="h3">Bookmark Statistics</Forms.FormTitle>

                        <div className="vc-stats-grid">
                            <div className="vc-stats-card">
                                <Forms.FormTitle tag="h4">Total Bookmarks</Forms.FormTitle>
                                <div className="vc-stats-number">{stats.total}</div>
                            </div>

                            <div className="vc-stats-card">
                                <Forms.FormTitle tag="h4">Folders ({Object.keys(stats.folders).length})</Forms.FormTitle>
                                <div className="vc-stats-list">
                                    {Object.entries(stats.folders)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([folder, count]) => (
                                            <div key={folder} className="vc-stats-item">
                                                <span>{folder}</span>
                                                <span>{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="vc-stats-card">
                                <Forms.FormTitle tag="h4">Top Tags</Forms.FormTitle>
                                <div className="vc-stats-list">
                                    {Object.entries(stats.tags)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([tag, count]) => (
                                            <div key={tag} className="vc-stats-item">
                                                <span>{tag}</span>
                                                <span>{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="vc-stats-card">
                                <Forms.FormTitle tag="h4">Top Authors</Forms.FormTitle>
                                <div className="vc-stats-list">
                                    {Object.entries(stats.authors)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([author, count]) => (
                                            <div key={author} className="vc-stats-item">
                                                <span>{author}</span>
                                                <span>{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}