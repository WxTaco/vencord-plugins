/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms, React, Text, TextArea, useState, showToast, Toasts } from "@webpack/common";

import { exportBookmarks, importBookmarks, clearAllBookmarks, getAllBookmarks } from "../storage";
import { BookmarkExportData, Bookmark } from "../types";

interface ExportImportPanelProps {
    onUpdate: () => void;
}

export function ExportImportPanel({ onUpdate }: ExportImportPanelProps) {
    const [importData, setImportData] = useState("");
    const [exportFormat, setExportFormat] = useState<"json" | "markdown">("json");

    const handleExportJSON = () => {
        try {
            const data = exportBookmarks();
            const jsonString = JSON.stringify(data, null, 2);

            // Create and download file
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookmarks-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast("Bookmarks exported to JSON!", Toasts.Type.SUCCESS);
        } catch (error) {
            console.error("Export failed:", error);
            showToast("Failed to export bookmarks!", Toasts.Type.FAILURE);
        }
    };

    const handleExportMarkdown = () => {
        try {
            const data = exportBookmarks();
            let markdown = `# Discord Message Bookmarks\n\n`;
            markdown += `Exported on: ${new Date().toLocaleDateString()}\n`;
            markdown += `Total bookmarks: ${data.bookmarks.length}\n\n`;

            // Group by folder
            const bookmarksByFolder = data.bookmarks.reduce((acc: Record<string, typeof data.bookmarks>, bookmark) => {
                if (!acc[bookmark.folder]) acc[bookmark.folder] = [];
                acc[bookmark.folder].push(bookmark);
                return acc;
            }, {});

            Object.entries(bookmarksByFolder).forEach(([folder, bookmarks]) => {
                markdown += `## ${folder}\n\n`;

                (bookmarks as typeof data.bookmarks).forEach(bookmark => {
                    markdown += `### ${bookmark.author.username} - ${new Date(bookmark.timestamp).toLocaleDateString()}\n\n`;
                    markdown += `**Channel:** ${bookmark.guildName ? `${bookmark.guildName} • ` : ""}#${bookmark.channelName}\n\n`;

                    if (bookmark.content) {
                        markdown += `**Message:**\n${bookmark.content}\n\n`;
                    }

                    if (bookmark.tags.length > 0) {
                        markdown += `**Tags:** ${bookmark.tags.join(", ")}\n\n`;
                    }

                    if (bookmark.note) {
                        markdown += `**Note:** ${bookmark.note}\n\n`;
                    }

                    if (bookmark.attachments.length > 0) {
                        markdown += `**Attachments:**\n`;
                        bookmark.attachments.forEach(att => {
                            markdown += `- ${att.filename}\n`;
                        });
                        markdown += `\n`;
                    }

                    markdown += `**Link:** ${bookmark.jumpLink}\n\n`;
                    markdown += `---\n\n`;
                });
            });

            // Create and download file
            const blob = new Blob([markdown], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookmarks-${new Date().toISOString().split("T")[0]}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast("Bookmarks exported to Markdown!", Toasts.Type.SUCCESS);
        } catch (error) {
            console.error("Export failed:", error);
            showToast("Failed to export bookmarks!", Toasts.Type.FAILURE);
        }
    };

    const handleImport = () => {
        if (!importData.trim()) {
            showToast("Please paste bookmark data to import!", Toasts.Type.FAILURE);
            return;
        }

        try {
            const data: BookmarkExportData = JSON.parse(importData);
            importBookmarks(data);
            setImportData("");
            onUpdate();
        } catch (error) {
            console.error("Import failed:", error);
            showToast("Invalid bookmark data format!", Toasts.Type.FAILURE);
        }
    };

    const handleClearAll = () => {
        if (confirm("Are you sure you want to delete ALL bookmarks? This cannot be undone!")) {
            clearAllBookmarks();
            onUpdate();
        }
    };

    const bookmarkCount = getAllBookmarks().length;

    return (
        <div className="vc-export-import-panel">
            <div className="vc-export-section">
                <Forms.FormTitle tag="h3">Export Bookmarks</Forms.FormTitle>
                <Text variant="text-sm/normal" color="text-muted">
                    Export your bookmarks to save them or transfer to another device.
                </Text>

                <div className="vc-export-options">
                    <div className="vc-export-format">
                        <Forms.FormTitle tag="h5">Format</Forms.FormTitle>
                        <div className="vc-radio-group">
                            <label className="vc-radio-option">
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    value="json"
                                    checked={exportFormat === "json"}
                                    onChange={(e) => setExportFormat(e.target.value as "json")}
                                />
                                <span>JSON (for re-importing)</span>
                            </label>
                            <label className="vc-radio-option">
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    value="markdown"
                                    checked={exportFormat === "markdown"}
                                    onChange={(e) => setExportFormat(e.target.value as "markdown")}
                                />
                                <span>Markdown (for reading)</span>
                            </label>
                        </div>
                    </div>

                    <div className="vc-export-actions">
                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={Button.Colors.BRAND}
                            onClick={exportFormat === "json" ? handleExportJSON : handleExportMarkdown}
                            disabled={bookmarkCount === 0}
                        >
                            Export {bookmarkCount} Bookmark{bookmarkCount !== 1 ? "s" : ""}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="vc-import-section">
                <Forms.FormTitle tag="h3">Import Bookmarks</Forms.FormTitle>
                <Text variant="text-sm/normal" color="text-muted">
                    Import bookmarks from a previously exported JSON file. Duplicate bookmarks will be skipped.
                </Text>

                <div className="vc-import-form">
                    <Forms.FormTitle tag="h5">Paste JSON Data</Forms.FormTitle>
                    <TextArea
                        placeholder="Paste your exported bookmark JSON data here..."
                        value={importData}
                        onChange={setImportData}
                        rows={8}
                    />

                    <div className="vc-import-actions">
                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={Button.Colors.GREEN}
                            onClick={handleImport}
                            disabled={!importData.trim()}
                        >
                            Import Bookmarks
                        </Button>

                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={Button.Colors.PRIMARY}
                            onClick={() => setImportData("")}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            <div className="vc-danger-section">
                <Forms.FormTitle tag="h3">Danger Zone</Forms.FormTitle>
                <Text variant="text-sm/normal" color="text-muted">
                    Permanently delete all bookmarks. This action cannot be undone!
                </Text>

                <Button
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.RED}
                    onClick={handleClearAll}
                    disabled={bookmarkCount === 0}
                >
                    Delete All {bookmarkCount} Bookmark{bookmarkCount !== 1 ? "s" : ""}
                </Button>
            </div>
        </div>
    );
}
