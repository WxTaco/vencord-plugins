/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { React, useState } from "@webpack/common";
import { EmbedPreview } from "./EmbedPreview";
import { EmbedEditorGUI } from "./EmbedEditorGUI";
import { EmbedEditorJSON } from "./EmbedEditorJSON";
import { TimestampTool } from "./TimestampTool";
import { defaultEmbed, validateEmbed } from "../utils/embedUtils";

export function EmbedTesterModal(props: ModalProps) {
    const [embedData, setEmbedData] = useState(defaultEmbed);
    const [activeTab, setActiveTab] = useState<"gui" | "json" | "timestamp">("gui");
    const [darkMode, setDarkMode] = useState(true);
    const [jsonError, setJsonError] = useState<string | null>(null);

    const handleEmbedChange = (newEmbed: any) => {
        const validation = validateEmbed(newEmbed);
        if (validation.isValid) {
            setEmbedData(newEmbed);
            setJsonError(null);
        } else {
            setJsonError(validation.error || "Invalid embed data");
        }
    };

    const tabStyle = (isActive: boolean) => ({
        padding: "8px 16px",
        background: isActive ? "#5865f2" : "transparent",
        color: isActive ? "white" : "#4f5660",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        marginRight: "4px"
    });

    return (
        <ModalRoot {...props} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <h2 style={{ margin: 0, color: "#060607", fontSize: "20px", fontWeight: "600" }}>
                        Embed Tester+
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#4f5660" }}>
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={(e) => setDarkMode(e.target.checked)}
                            />
                            Dark Preview
                        </label>
                        <ModalCloseButton />
                    </div>
                </div>
            </ModalHeader>
            
            <ModalContent style={{ padding: "16px", maxHeight: "80vh", overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Tab Navigation */}
                    <div style={{ marginBottom: "16px", borderBottom: "1px solid #e3e5e8", paddingBottom: "8px" }}>
                        <button
                            onClick={() => setActiveTab("gui")}
                            style={tabStyle(activeTab === "gui")}
                        >
                            Visual Editor
                        </button>
                        <button
                            onClick={() => setActiveTab("json")}
                            style={tabStyle(activeTab === "json")}
                        >
                            JSON Editor
                        </button>
                        <button
                            onClick={() => setActiveTab("timestamp")}
                            style={tabStyle(activeTab === "timestamp")}
                        >
                            Timestamp Tool
                        </button>
                    </div>

                    {/* Error Display */}
                    {jsonError && (
                        <div style={{
                            padding: "8px 12px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "4px",
                            color: "#dc2626",
                            fontSize: "12px",
                            marginBottom: "16px"
                        }}>
                            Error: {jsonError}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div style={{ 
                        display: "flex", 
                        gap: "16px", 
                        height: "600px",
                        overflow: "hidden"
                    }}>
                        {/* Left Panel - Editor */}
                        <div style={{ 
                            flex: "1", 
                            minWidth: "400px",
                            overflow: "auto",
                            border: "1px solid #e3e5e8",
                            borderRadius: "8px",
                            padding: "16px"
                        }}>
                            {activeTab === "gui" && (
                                <EmbedEditorGUI 
                                    embedData={embedData}
                                    onChange={handleEmbedChange}
                                />
                            )}
                            {activeTab === "json" && (
                                <EmbedEditorJSON 
                                    embedData={embedData}
                                    onChange={handleEmbedChange}
                                    error={jsonError}
                                />
                            )}
                            {activeTab === "timestamp" && (
                                <TimestampTool />
                            )}
                        </div>

                        {/* Right Panel - Preview */}
                        <div style={{ 
                            flex: "1", 
                            minWidth: "400px",
                            overflow: "auto",
                            border: "1px solid #e3e5e8",
                            borderRadius: "8px",
                            padding: "16px"
                        }}>
                            <h3 style={{ 
                                margin: "0 0 16px 0", 
                                fontSize: "16px", 
                                fontWeight: "600",
                                color: "#060607"
                            }}>
                                Live Preview
                            </h3>
                            <EmbedPreview 
                                embedData={embedData}
                                darkMode={darkMode}
                            />
                        </div>
                    </div>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
