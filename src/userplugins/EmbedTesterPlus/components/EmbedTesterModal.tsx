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
import { generateEmbedImage, downloadEmbedImage, copyEmbedImageToClipboard } from "../utils/imageGenerator";

export function EmbedTesterModal(props: ModalProps) {
    const [embedData, setEmbedData] = useState(defaultEmbed);
    const [activeTab, setActiveTab] = useState<"gui" | "json" | "timestamp">("gui");
    const [darkMode, setDarkMode] = useState(true);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const handleEmbedChange = (newEmbed: any) => {
        const validation = validateEmbed(newEmbed);
        if (validation.isValid) {
            setEmbedData(newEmbed);
            setJsonError(null);
        } else {
            setJsonError(validation.error || "Invalid embed data");
        }
    };

    const handleGenerateImage = async () => {
        setIsGeneratingImage(true);
        try {
            const imageDataUrl = await generateEmbedImage(embedData, darkMode);
            downloadEmbedImage(imageDataUrl, `embed-${Date.now()}.png`);
        } catch (error) {
            console.error('Failed to generate image:', error);
        }
        setIsGeneratingImage(false);
    };

    const handleCopyImage = async () => {
        setIsGeneratingImage(true);
        try {
            const imageDataUrl = await generateEmbedImage(embedData, darkMode);
            const success = await copyEmbedImageToClipboard(imageDataUrl);
            if (success) {
                // Show success feedback
                console.log('Image copied to clipboard!');
            }
        } catch (error) {
            console.error('Failed to copy image:', error);
        }
        setIsGeneratingImage(false);
    };

    const tabStyle = (isActive: boolean) => ({
        padding: "10px 18px",
        background: isActive ? "linear-gradient(135deg, #ec4899, #be185d)" : "transparent",
        color: isActive ? "white" : "#831843",
        border: isActive ? "none" : "2px solid #f9a8d4",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        marginRight: "8px",
        transition: "all 0.2s ease",
        boxShadow: isActive ? "0 2px 4px rgba(190, 24, 93, 0.3)" : "none"
    });

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
                    borderBottom: "2px solid #f9a8d4",
                    padding: "16px 20px",
                    borderRadius: "8px 8px 0 0"
                }}>
                    <h2 style={{
                        margin: 0,
                        color: "#be185d",
                        fontSize: "22px",
                        fontWeight: "700",
                        textShadow: "0 1px 2px rgba(190, 24, 93, 0.1)"
                    }}>
                        Embed Builder 🌸
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "14px",
                            color: "#831843",
                            fontWeight: "500"
                        }}>
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={(e) => setDarkMode(e.target.checked)}
                                style={{
                                    accentColor: "#ec4899",
                                    transform: "scale(1.1)"
                                }}
                            />
                            Dark Preview
                        </label>
                        <ModalCloseButton onClick={props.onClose} />
                    </div>
                </div>
            </ModalHeader>

            <ModalContent style={{
                padding: "24px",
                maxHeight: "85vh",
                overflow: "hidden",
                background: "linear-gradient(135deg, #fefcff, #fdf2f8)",
                minWidth: "1200px",
                minHeight: "700px"
            }}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Tab Navigation */}
                    <div style={{
                        marginBottom: "20px",
                        borderBottom: "2px solid #f9a8d4",
                        paddingBottom: "12px",
                        background: "rgba(249, 168, 212, 0.1)",
                        borderRadius: "8px 8px 0 0",
                        padding: "12px"
                    }}>
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
                            padding: "12px 16px",
                            background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                            border: "2px solid #fca5a5",
                            borderRadius: "8px",
                            color: "#dc2626",
                            fontSize: "13px",
                            marginBottom: "16px",
                            fontWeight: "500"
                        }}>
                            Error: {jsonError}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div style={{
                        display: "flex",
                        gap: "24px",
                        height: "650px",
                        overflow: "hidden"
                    }}>
                        {/* Left Panel - Editor */}
                        <div style={{
                            flex: "1",
                            minWidth: "500px",
                            overflow: "auto",
                            border: "2px solid #f9a8d4",
                            borderRadius: "12px",
                            padding: "24px",
                            background: "rgba(255, 255, 255, 0.9)",
                            boxShadow: "0 4px 6px rgba(190, 24, 93, 0.1)"
                        }}
                            className="embed-panel-scrollbar"
                        >
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
                            minWidth: "500px",
                            overflow: "auto",
                            border: "2px solid #f9a8d4",
                            borderRadius: "12px",
                            padding: "24px",
                            background: "rgba(255, 255, 255, 0.9)",
                            boxShadow: "0 4px 6px rgba(190, 24, 93, 0.1)"
                        }}
                            className="embed-panel-scrollbar"
                        >
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "16px"
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: "18px",
                                    fontWeight: "700",
                                    color: "#be185d",
                                    textShadow: "0 1px 2px rgba(190, 24, 93, 0.1)"
                                }}>
                                    Live Preview
                                </h3>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={handleCopyImage}
                                        disabled={isGeneratingImage}
                                        style={{
                                            padding: "6px 12px",
                                            background: isGeneratingImage ? "#d1d5db" : "linear-gradient(135deg, #f472b6, #ec4899)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            cursor: isGeneratingImage ? "not-allowed" : "pointer",
                                            boxShadow: "0 2px 4px rgba(236, 72, 153, 0.3)"
                                        }}
                                    >
                                        {isGeneratingImage ? "Processing..." : "Copy Image"}
                                    </button>
                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage}
                                        style={{
                                            padding: "6px 12px",
                                            background: isGeneratingImage ? "#d1d5db" : "linear-gradient(135deg, #ec4899, #be185d)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            cursor: isGeneratingImage ? "not-allowed" : "pointer",
                                            boxShadow: "0 2px 4px rgba(190, 24, 93, 0.3)"
                                        }}
                                    >
                                        {isGeneratingImage ? "Processing..." : "Save Image"}
                                    </button>
                                </div>
                            </div>
                            <EmbedPreview
                                embedData={embedData}
                                darkMode={darkMode}
                            />
                        </div>
                    </div>
                </div>
            </ModalContent>

            {/* Custom Scrollbar and Enhanced Styling */}
            <style>{`
                .embed-panel-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }

                .embed-panel-scrollbar::-webkit-scrollbar-track {
                    background: linear-gradient(135deg, #fdf2f8, #fce7f3);
                    border-radius: 6px;
                    border: 1px solid #f9a8d4;
                }

                .embed-panel-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #ec4899, #be185d);
                    border-radius: 6px;
                    border: 2px solid #fdf2f8;
                }

                .embed-panel-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #be185d, #9d174d);
                }

                .embed-panel-scrollbar::-webkit-scrollbar-corner {
                    background: #fdf2f8;
                }

                /* Enhanced input styling */
                .embed-text-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #f9a8d4;
                    border-radius: 8px;
                    fontSize: 14px;
                    fontFamily: inherit;
                    background: rgba(255, 255, 255, 0.95);
                    color: #831843;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1);
                }

                .embed-text-input:focus {
                    outline: none;
                    border-color: #ec4899;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
                    background: rgba(255, 255, 255, 1);
                }

                .embed-text-input:hover {
                    border-color: #f472b6;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15);
                }

                /* Enhanced textarea styling */
                .embed-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #f9a8d4;
                    border-radius: 8px;
                    fontSize: 14px;
                    fontFamily: inherit;
                    background: rgba(255, 255, 255, 0.95);
                    color: #831843;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1);
                    resize: vertical;
                    min-height: 80px;
                }

                .embed-textarea:focus {
                    outline: none;
                    border-color: #ec4899;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
                    background: rgba(255, 255, 255, 1);
                }

                .embed-textarea:hover {
                    border-color: #f472b6;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15);
                }

                /* Enhanced select styling */
                .embed-select {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #f9a8d4;
                    border-radius: 8px;
                    fontSize: 14px;
                    fontFamily: inherit;
                    background: rgba(255, 255, 255, 0.95);
                    color: #831843;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1);
                    cursor: pointer;
                }

                .embed-select:focus {
                    outline: none;
                    border-color: #ec4899;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
                    background: rgba(255, 255, 255, 1);
                }

                .embed-select:hover {
                    border-color: #f472b6;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15);
                }
            `}</style>
        </ModalRoot>
    );
}
