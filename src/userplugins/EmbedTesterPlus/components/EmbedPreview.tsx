/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";
import { EmbedData, decimalToHex } from "../utils/embedUtils";

interface EmbedPreviewProps {
    embedData: EmbedData;
    darkMode: boolean;
}

export function EmbedPreview({ embedData, darkMode }: EmbedPreviewProps) {
    const theme = darkMode ? {
        background: "#2f3136",
        text: "#dcddde",
        textMuted: "#b9bbbe",
        border: "#202225",
        accent: "#4f545c"
    } : {
        background: "#ffffff",
        text: "#2e3338",
        textMuted: "#747f8d",
        border: "#e3e5e8",
        accent: "#f2f3f5"
    };

    const embedStyle: React.CSSProperties = {
        maxWidth: "520px",
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: "4px",
        padding: "16px",
        borderLeft: embedData.color ? `4px solid ${decimalToHex(embedData.color)}` : `4px solid #5865f2`,
        fontFamily: "Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: "14px",
        lineHeight: "1.375"
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch {
            return timestamp;
        }
    };

    return (
        <div style={{
            background: theme.accent,
            padding: "16px",
            borderRadius: "8px",
            minHeight: "200px"
        }}>
            <div style={embedStyle}>
                {/* Author */}
                {embedData.author && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                        fontSize: "12px",
                        fontWeight: "500"
                    }}>
                        {embedData.author.icon_url && (
                            <img
                                src={embedData.author.icon_url}
                                alt="Author icon"
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    marginRight: "8px"
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                        {embedData.author.url ? (
                            <a
                                href={embedData.author.url}
                                style={{
                                    color: theme.text,
                                    textDecoration: "none"
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {embedData.author.name}
                            </a>
                        ) : (
                            <span style={{ color: theme.text }}>
                                {embedData.author.name}
                            </span>
                        )}
                    </div>
                )}

                {/* Title */}
                {embedData.title && (
                    <div style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: "8px",
                        lineHeight: "1.25"
                    }}>
                        {embedData.url ? (
                            <a
                                href={embedData.url}
                                style={{
                                    color: "#00b0f4",
                                    textDecoration: "none"
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {embedData.title}
                            </a>
                        ) : (
                            embedData.title
                        )}
                    </div>
                )}

                {/* Description */}
                {embedData.description && (
                    <div style={{
                        color: theme.text,
                        marginBottom: "8px",
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word"
                    }}>
                        {embedData.description}
                    </div>
                )}

                {/* Fields */}
                {embedData.fields && embedData.fields.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "8px",
                        marginBottom: "8px"
                    }}>
                        {embedData.fields.map((field, index) => (
                            <div
                                key={index}
                                style={{
                                    gridColumn: field.inline ? "auto" : "1 / -1"
                                }}
                            >
                                <div style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: theme.text,
                                    marginBottom: "2px"
                                }}>
                                    {field.name}
                                </div>
                                <div style={{
                                    fontSize: "14px",
                                    color: theme.text,
                                    whiteSpace: "pre-wrap",
                                    wordWrap: "break-word"
                                }}>
                                    {field.value}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Image */}
                {embedData.image?.url && (
                    <div style={{ marginBottom: "8px" }}>
                        <img
                            src={embedData.image.url}
                            alt="Embed image"
                            style={{
                                maxWidth: "100%",
                                height: "auto",
                                borderRadius: "4px"
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                )}

                {/* Thumbnail */}
                {embedData.thumbnail?.url && (
                    <div style={{
                        float: "right",
                        marginLeft: "16px",
                        marginBottom: "8px"
                    }}>
                        <img
                            src={embedData.thumbnail.url}
                            alt="Embed thumbnail"
                            style={{
                                maxWidth: "80px",
                                maxHeight: "80px",
                                borderRadius: "4px"
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                )}

                {/* Footer */}
                {(embedData.footer || embedData.timestamp) && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: "12px",
                        color: theme.textMuted,
                        marginTop: "8px",
                        clear: "both"
                    }}>
                        {embedData.footer?.icon_url && (
                            <img
                                src={embedData.footer.icon_url}
                                alt="Footer icon"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    marginRight: "8px"
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                        {embedData.footer?.text && (
                            <span>{embedData.footer.text}</span>
                        )}
                        {embedData.footer?.text && embedData.timestamp && (
                            <span style={{ margin: "0 4px" }}>•</span>
                        )}
                        {embedData.timestamp && (
                            <span>{formatTimestamp(embedData.timestamp)}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
