/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState, useEffect } from "@webpack/common";
import { EmbedData, validateEmbed, exportEmbedAsJSON, exportEmbedAsMarkdown } from "../utils/embedUtils";
import { Toasts } from "@webpack/common";

const showToast = (message: string, type: any) => {
    // Fallback toast implementation
    console.log(`Toast: ${message}`);
};

interface EmbedEditorJSONProps {
    embedData: EmbedData;
    onChange: (embed: EmbedData) => void;
    error: string | null;
}

export function EmbedEditorJSON({ embedData, onChange, error }: EmbedEditorJSONProps) {
    const [jsonText, setJsonText] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    // Update JSON text when embedData changes (from GUI)
    useEffect(() => {
        setJsonText(JSON.stringify(embedData, null, 2));
    }, [embedData]);

    const handleJsonChange = (value: string) => {
        setJsonText(value);
        setLocalError(null);

        try {
            const parsed = JSON.parse(value);
            const validation = validateEmbed(parsed);

            if (validation.isValid) {
                onChange(parsed);
            } else {
                setLocalError(validation.error || "Invalid embed data");
            }
        } catch (parseError) {
            setLocalError("Invalid JSON syntax");
        }
    };

    const formatJson = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setJsonText(JSON.stringify(parsed, null, 2));
        } catch {
            setLocalError("Cannot format invalid JSON");
        }
    };

    const minifyJson = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setJsonText(JSON.stringify(parsed));
        } catch {
            setLocalError("Cannot minify invalid JSON");
        }
    };

    const copyJson = () => {
        navigator.clipboard.writeText(jsonText);
        showToast("JSON copied to clipboard!", Toasts.Type.SUCCESS);
    };

    const copyMarkdown = () => {
        try {
            const parsed = JSON.parse(jsonText);
            const markdown = exportEmbedAsMarkdown(parsed);
            navigator.clipboard.writeText(markdown);
            showToast("Markdown copied to clipboard!", Toasts.Type.SUCCESS);
        } catch {
            showToast("Cannot copy invalid JSON as markdown", Toasts.Type.FAILURE);
        }
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();

            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(text);
                setJsonText(JSON.stringify(parsed, null, 2));
                handleJsonChange(JSON.stringify(parsed, null, 2));
                showToast("JSON pasted and parsed!", Toasts.Type.SUCCESS);
                return;
            } catch {
                // Not valid JSON, continue
            }

            // Try to extract embed from Discord message link
            const messageUrlMatch = text.match(/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
            if (messageUrlMatch) {
                showToast("Message link detected, but embed extraction is not implemented yet", Toasts.Type.MESSAGE);
                return;
            }

            // Just paste as-is
            setJsonText(text);
            handleJsonChange(text);
        } catch {
            showToast("Failed to paste from clipboard", Toasts.Type.FAILURE);
        }
    };

    const loadTemplate = (template: string) => {
        let templateData: EmbedData;

        switch (template) {
            case "basic":
                templateData = {
                    title: "Basic Embed",
                    description: "This is a basic embed with title and description.",
                    color: 0x5865f2
                };
                break;
            case "rich":
                templateData = {
                    title: "Rich Embed Example",
                    description: "This embed showcases multiple features including author, fields, and footer.",
                    color: 0x00ff00,
                    author: {
                        name: "Author Name",
                        icon_url: "https://via.placeholder.com/32x32"
                    },
                    fields: [
                        { name: "Field 1", value: "Inline field", inline: true },
                        { name: "Field 2", value: "Another inline field", inline: true },
                        { name: "Field 3", value: "Non-inline field", inline: false }
                    ],
                    footer: {
                        text: "Footer text",
                        icon_url: "https://via.placeholder.com/16x16"
                    },
                    timestamp: new Date().toISOString()
                };
                break;
            case "announcement":
                templateData = {
                    title: "📢 Important Announcement",
                    description: "This is an important server announcement. Please read carefully.",
                    color: 0xff6b6b,
                    author: {
                        name: "Server Staff"
                    },
                    footer: {
                        text: "Posted by ModBot"
                    },
                    timestamp: new Date().toISOString()
                };
                break;
            default:
                return;
        }

        const jsonString = JSON.stringify(templateData, null, 2);
        setJsonText(jsonString);
        handleJsonChange(jsonString);
    };

    const currentError = error || localError;

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <div style={{
                marginBottom: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                padding: "8px",
                background: "#f9f9f9",
                borderRadius: "4px",
                border: "1px solid #e3e5e8"
            }}>
                <button
                    onClick={formatJson}
                    style={{
                        padding: "4px 8px",
                        background: "#5865f2",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                >
                    Format
                </button>
                <button
                    onClick={minifyJson}
                    style={{
                        padding: "4px 8px",
                        background: "#5865f2",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                >
                    Minify
                </button>
                <button
                    onClick={copyJson}
                    style={{
                        padding: "4px 8px",
                        background: "#57f287",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                >
                    Copy JSON
                </button>
                <button
                    onClick={copyMarkdown}
                    style={{
                        padding: "4px 8px",
                        background: "#57f287",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                >
                    Copy MD
                </button>
                <button
                    onClick={pasteFromClipboard}
                    style={{
                        padding: "4px 8px",
                        background: "#faa61a",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer"
                    }}
                >
                    Paste
                </button>
            </div>

            {/* Templates */}
            <div style={{
                marginBottom: "12px",
                padding: "8px",
                background: "#f0f8ff",
                borderRadius: "4px",
                border: "1px solid #b3d9ff"
            }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#4f5660" }}>
                    Quick Templates:
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    <button
                        onClick={() => loadTemplate("basic")}
                        style={{
                            padding: "3px 8px",
                            background: "#e3f2fd",
                            color: "#1976d2",
                            border: "1px solid #bbdefb",
                            borderRadius: "3px",
                            fontSize: "10px",
                            cursor: "pointer"
                        }}
                    >
                        Basic
                    </button>
                    <button
                        onClick={() => loadTemplate("rich")}
                        style={{
                            padding: "3px 8px",
                            background: "#e3f2fd",
                            color: "#1976d2",
                            border: "1px solid #bbdefb",
                            borderRadius: "3px",
                            fontSize: "10px",
                            cursor: "pointer"
                        }}
                    >
                        Rich
                    </button>
                    <button
                        onClick={() => loadTemplate("announcement")}
                        style={{
                            padding: "3px 8px",
                            background: "#e3f2fd",
                            color: "#1976d2",
                            border: "1px solid #bbdefb",
                            borderRadius: "3px",
                            fontSize: "10px",
                            cursor: "pointer"
                        }}
                    >
                        Announcement
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {currentError && (
                <div style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "4px",
                    color: "#dc2626",
                    fontSize: "12px",
                    marginBottom: "12px"
                }}>
                    {currentError}
                </div>
            )}

            {/* JSON Editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <textarea
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    className="embed-textarea"
                    style={{
                        flex: 1,
                        fontSize: "13px",
                        fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
                        lineHeight: "1.6",
                        resize: "none",
                        border: currentError ? "2px solid #ef4444" : undefined,
                        background: currentError ? "#fef2f2" : undefined,
                        minHeight: "500px"
                    }}
                    placeholder="Enter embed JSON here..."
                    spellCheck={false}
                />
            </div>

            {/* Character Count */}
            <div style={{
                marginTop: "8px",
                fontSize: "11px",
                color: "#6b7280",
                textAlign: "right"
            }}>
                {jsonText.length} characters
            </div>
        </div>
    );
}
