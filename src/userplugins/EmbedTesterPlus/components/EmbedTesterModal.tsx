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
import { TemplateManagerComponent } from "./TemplateManager";
import { defaultEmbed, validateEmbed, EmbedData } from "../utils/embedUtils";
import { generateEmbedImage, downloadEmbedImage, copyEmbedImageToClipboard } from "../utils/imageGenerator";
import { SavedEmbed, VencordStorage } from "../utils/VencordStorage";
import { ApiIntegration } from "../utils/apiIntegration";
import { TemplateManager } from "../utils/templateManager";

interface SavedEmbeds {
    [embedName: string]: SavedEmbed;
}

interface EnhancedModalProps extends ModalProps {
    guildId?: string;
    channelId?: string;
    userId?: string;
    action?: string;
    initialEmbed?: SavedEmbed | null;
    savedEmbeds?: SavedEmbeds;
    onSave?: (name: string, embed: SavedEmbed) => Promise<boolean>;
    botIntegrationEnabled?: boolean;
}

// Convert SavedEmbed to EmbedData format
function convertSavedEmbedToEmbedData(savedEmbed: SavedEmbed): EmbedData {
    return {
        ...savedEmbed,
        footer: savedEmbed.footer ? {
            text: savedEmbed.footer.text || "",
            icon_url: savedEmbed.footer.icon_url
        } : undefined,
        image: savedEmbed.image ? {
            url: savedEmbed.image.url || ""
        } : undefined,
        thumbnail: savedEmbed.thumbnail ? {
            url: savedEmbed.thumbnail.url || ""
        } : undefined,
        author: savedEmbed.author ? {
            name: savedEmbed.author.name || "",
            url: savedEmbed.author.url,
            icon_url: savedEmbed.author.icon_url
        } : undefined
    } as EmbedData;
}

// Convert EmbedData to SavedEmbed format
function convertEmbedDataToSavedEmbed(embedData: EmbedData): SavedEmbed {
    return {
        ...embedData,
        footer: embedData.footer ? {
            text: embedData.footer.text,
            icon_url: embedData.footer.icon_url
        } : undefined,
        image: embedData.image ? {
            url: embedData.image.url
        } : undefined,
        thumbnail: embedData.thumbnail ? {
            url: embedData.thumbnail.url
        } : undefined,
        author: embedData.author ? {
            name: embedData.author.name,
            url: embedData.author.url,
            icon_url: embedData.author.icon_url
        } : undefined
    };
}

export function EmbedTesterModal(props: EnhancedModalProps) {
    const {
        guildId,
        channelId,
        userId,
        action = "create",
        initialEmbed,
        savedEmbeds = {},
        onSave,
        botIntegrationEnabled = false,
        ...modalProps
    } = props;

    const [embedData, setEmbedData] = useState<EmbedData>(
        initialEmbed ? convertSavedEmbedToEmbedData(initialEmbed) : defaultEmbed
    );
    const [activeTab, setActiveTab] = useState<"gui" | "json" | "timestamp" | "templates">(
        action === "load" && initialEmbed ? "gui" : "gui"
    );
    const [darkMode, setDarkMode] = useState(true);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [localTemplates, setLocalTemplates] = useState<any[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    const handleEmbedChange = (newEmbed: any) => {
        const validation = validateEmbed(newEmbed);
        if (validation.isValid) {
            setEmbedData(newEmbed);
            setJsonError(null);
        } else {
            setJsonError(validation.error || "Invalid embed data");
        }
    };

    // Load local templates on component mount
    React.useEffect(() => {
        const loadLocalTemplates = async () => {
            setIsLoadingTemplates(true);
            try {
                const templates = await TemplateManager.getAllTemplates();
                setLocalTemplates(templates);
            } catch (error) {
                console.error("Failed to load local templates:", error);
            } finally {
                setIsLoadingTemplates(false);
            }
        };

        loadLocalTemplates();
    }, []);

    const handleSaveTemplate = async (templateName: string) => {
        if (!onSave || !guildId) {
            setSaveStatus("❌ Bot integration not available");
            return;
        }

        setIsSaving(true);
        setSaveStatus("💾 Saving template...");

        try {
            const savedEmbed = convertEmbedDataToSavedEmbed(embedData);
            const success = await onSave(templateName, savedEmbed);

            if (success) {
                setSaveStatus(`✅ Template "${templateName}" saved successfully!`);
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                setSaveStatus("❌ Failed to save template");
                setTimeout(() => setSaveStatus(null), 3000);
            }
        } catch (error) {
            console.error("Save error:", error);
            setSaveStatus("❌ Error saving template");
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLocalTemplate = async (templateName: string, category: string = "Custom Templates") => {
        setIsSaving(true);
        setSaveStatus("💾 Saving local template...");

        try {
            const template = await TemplateManager.saveCustomTemplate({
                name: templateName,
                description: `Custom template created on ${new Date().toLocaleDateString()}`,
                category,
                embedData
            });

            if (template) {
                setSaveStatus(`✅ Local template "${templateName}" saved successfully!`);
                // Reload templates
                const updatedTemplates = await TemplateManager.getAllTemplates();
                setLocalTemplates(updatedTemplates);
                // Mark as recently used
                await TemplateManager.markAsRecentlyUsed(template.id);
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                setSaveStatus("❌ Failed to save local template");
                setTimeout(() => setSaveStatus(null), 3000);
            }
        } catch (error) {
            console.error("Save local template error:", error);
            setSaveStatus("❌ Error saving local template");
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncTemplates = async () => {
        if (!guildId) {
            setSyncStatus("❌ Guild ID not available");
            return;
        }

        setIsSyncing(true);
        setSyncStatus("🔄 Syncing templates with API...");

        try {
            const result = await ApiIntegration.syncTemplates(guildId);

            if (result.success) {
                setSyncStatus(`✅ Synced ${result.synced} templates successfully!`);
                setTimeout(() => setSyncStatus(null), 3000);
            } else {
                setSyncStatus(`❌ Sync failed: ${result.errors.join(', ')}`);
                setTimeout(() => setSyncStatus(null), 5000);
            }
        } catch (error) {
            console.error("Sync error:", error);
            setSyncStatus("❌ Error during sync");
            setTimeout(() => setSyncStatus(null), 3000);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAddToFavorites = async (templateId: string) => {
        try {
            const success = await TemplateManager.addToFavorites(templateId);
            if (success) {
                setSaveStatus("⭐ Added to favorites!");
                setTimeout(() => setSaveStatus(null), 2000);
            }
        } catch (error) {
            console.error("Failed to add to favorites:", error);
        }
    };

    const handleLoadTemplate = async (template: SavedEmbed, templateId?: string) => {
        const convertedEmbed = convertSavedEmbedToEmbedData(template);
        setEmbedData(convertedEmbed);
        setActiveTab("gui");

        // Mark as recently used if we have a template ID
        if (templateId) {
            try {
                await TemplateManager.markAsRecentlyUsed(templateId);
            } catch (error) {
                console.error("Failed to mark template as recently used:", error);
            }
        }
    };

    const handleLoadLocalTemplate = async (templateId: string) => {
        try {
            const template = await TemplateManager.getTemplateById(templateId);
            if (template) {
                setEmbedData(template.embedData);
                setActiveTab("gui");
                await TemplateManager.markAsRecentlyUsed(templateId);
                setSaveStatus(`📖 Loaded template: ${template.name}`);
                setTimeout(() => setSaveStatus(null), 2000);
            }
        } catch (error) {
            console.error("Failed to load local template:", error);
            setSaveStatus("❌ Failed to load template");
            setTimeout(() => setSaveStatus(null), 3000);
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
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
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

            <ModalContent
                className="embed-panel-scrollbar"
                style={{
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
                        <button
                            onClick={() => setActiveTab("templates")}
                            style={tabStyle(activeTab === "templates")}
                        >
                            Templates
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

                            {activeTab === "templates" && (
                                <TemplateManagerComponent
                                    onSelectTemplate={handleLoadTemplate}
                                    currentEmbedData={embedData}
                                    savedEmbeds={savedEmbeds}
                                    onSaveTemplate={handleSaveTemplate}
                                    botIntegrationEnabled={botIntegrationEnabled}
                                    saveStatus={saveStatus}
                                    isSaving={isSaving}
                                />
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
                /* Apply scrollbar styling to all scrollable areas */
                .embed-panel-scrollbar::-webkit-scrollbar,
                .embed-panel-scrollbar *::-webkit-scrollbar {
                    width: 14px;
                    height: 14px;
                }

                .embed-panel-scrollbar::-webkit-scrollbar-track,
                .embed-panel-scrollbar *::-webkit-scrollbar-track {
                    background: linear-gradient(135deg, #fdf2f8, #fce7f3);
                    border-radius: 8px;
                    border: 1px solid #f9a8d4;
                    margin: 2px;
                }

                .embed-panel-scrollbar::-webkit-scrollbar-thumb,
                .embed-panel-scrollbar *::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #ec4899, #be185d);
                    border-radius: 8px;
                    border: 2px solid #fdf2f8;
                    box-shadow: 0 2px 4px rgba(190, 24, 93, 0.2);
                }

                .embed-panel-scrollbar::-webkit-scrollbar-thumb:hover,
                .embed-panel-scrollbar *::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #be185d, #9d174d);
                    box-shadow: 0 4px 8px rgba(190, 24, 93, 0.3);
                }

                .embed-panel-scrollbar::-webkit-scrollbar-corner,
                .embed-panel-scrollbar *::-webkit-scrollbar-corner {
                    background: #fdf2f8;
                    border-radius: 8px;
                }

                /* Enhanced input styling with !important to override any conflicts */
                .embed-text-input {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 2px solid #f9a8d4 !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    font-family: inherit !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #831843 !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1) !important;
                    box-sizing: border-box !important;
                }

                .embed-text-input:focus {
                    outline: none !important;
                    border-color: #ec4899 !important;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1) !important;
                    background: rgba(255, 255, 255, 1) !important;
                }

                .embed-text-input:hover {
                    border-color: #f472b6 !important;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15) !important;
                }

                /* Enhanced textarea styling with !important to override any conflicts */
                .embed-textarea {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 2px solid #f9a8d4 !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    font-family: inherit !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #831843 !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1) !important;
                    resize: vertical !important;
                    min-height: 80px !important;
                    box-sizing: border-box !important;
                }

                .embed-textarea:focus {
                    outline: none !important;
                    border-color: #ec4899 !important;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1) !important;
                    background: rgba(255, 255, 255, 1) !important;
                }

                .embed-textarea:hover {
                    border-color: #f472b6 !important;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15) !important;
                }

                /* Enhanced select styling with !important to override any conflicts */
                .embed-select {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 2px solid #f9a8d4 !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    font-family: inherit !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #831843 !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 2px 4px rgba(249, 168, 212, 0.1) !important;
                    cursor: pointer !important;
                    box-sizing: border-box !important;
                }

                .embed-select:focus {
                    outline: none !important;
                    border-color: #ec4899 !important;
                    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1) !important;
                    background: rgba(255, 255, 255, 1) !important;
                }

                .embed-select:hover {
                    border-color: #f472b6 !important;
                    box-shadow: 0 4px 8px rgba(249, 168, 212, 0.15) !important;
                }

                /* Force scrollbar styling on the modal content */
                [class*="embed-panel-scrollbar"] {
                    scrollbar-width: thin;
                    scrollbar-color: #ec4899 #fdf2f8;
                }
            `}</style>
        </ModalRoot>
    );
}
