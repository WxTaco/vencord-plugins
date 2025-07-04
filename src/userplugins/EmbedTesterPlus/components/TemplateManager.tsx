/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState } from "@webpack/common";
import { EmbedData } from "../utils/embedUtils";
import { TemplateManager, EmbedTemplate, TEMPLATE_CATEGORIES } from "../utils/templateManager";
import { Toasts } from "@webpack/common";

interface SavedEmbed {
    title?: string;
    description?: string;
    color?: number;
    author?: {
        name?: string;
        icon_url?: string;
        url?: string;
    };
    footer?: {
        text?: string;
        icon_url?: string;
    };
    thumbnail?: {
        url?: string;
    };
    image?: {
        url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    timestamp?: string;
    url?: string;
}

interface SavedEmbeds {
    [embedName: string]: SavedEmbed;
}

interface TemplateManagerProps {
    onSelectTemplate: (template: SavedEmbed | EmbedData) => void;
    currentEmbedData: EmbedData;
    savedEmbeds?: SavedEmbeds;
    onSaveTemplate?: (templateName: string) => Promise<void>;
    botIntegrationEnabled?: boolean;
    saveStatus?: string | null;
    isSaving?: boolean;
}

const showToast = (message: string, type: any) => {
    try {
        Toasts.show({
            message,
            type,
            id: Toasts.genId(),
        });
    } catch {
        console.log(`Toast: ${message}`);
    }
};

export function TemplateManagerComponent({
    onSelectTemplate,
    currentEmbedData,
    savedEmbeds = {},
    onSaveTemplate,
    botIntegrationEnabled = false,
    saveStatus,
    isSaving = false
}: TemplateManagerProps) {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [templates, setTemplates] = useState<EmbedTemplate[]>(TemplateManager.getAllTemplates());
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveTemplateName, setSaveTemplateName] = useState("");
    const [saveTemplateDescription, setSaveTemplateDescription] = useState("");
    const [saveTemplateCategory, setSaveTemplateCategory] = useState(TEMPLATE_CATEGORIES.CUSTOM);
    const [searchQuery, setSearchQuery] = useState("");
    const [showBotTemplates, setShowBotTemplates] = useState(true);

    const refreshTemplates = () => {
        setTemplates(TemplateManager.getAllTemplates());
    };

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredBotTemplates = Object.entries(savedEmbeds).filter(([name, template]) => {
        const matchesSearch = searchQuery === "" ||
            name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const handleSaveToBotAPI = async () => {
        if (!onSaveTemplate || !saveTemplateName.trim()) {
            showToast("Please enter a template name", "error");
            return;
        }

        try {
            await onSaveTemplate(saveTemplateName.trim());
            setSaveTemplateName("");
            setShowSaveDialog(false);
        } catch (error) {
            console.error("Failed to save template:", error);
        }
    };

    const handleSelectTemplate = (template: EmbedTemplate) => {
        onSelectTemplate(template.embedData);
        showToast(`Template "${template.name}" loaded successfully!`, Toasts.Type.SUCCESS);
    };

    const handleSaveTemplate = () => {
        if (!saveTemplateName.trim()) {
            showToast("Please enter a template name", Toasts.Type.FAILURE);
            return;
        }

        try {
            TemplateManager.saveCustomTemplate({
                name: saveTemplateName.trim(),
                description: saveTemplateDescription.trim(),
                category: saveTemplateCategory,
                embedData: currentEmbedData
            });

            refreshTemplates();
            setShowSaveDialog(false);
            setSaveTemplateName("");
            setSaveTemplateDescription("");
            setSaveTemplateCategory(TEMPLATE_CATEGORIES.CUSTOM);
            showToast("Template saved successfully!", Toasts.Type.SUCCESS);
        } catch (error) {
            showToast("Failed to save template", Toasts.Type.FAILURE);
        }
    };

    const handleDeleteTemplate = (template: EmbedTemplate) => {
        if (template.isBuiltIn) {
            showToast("Cannot delete built-in templates", Toasts.Type.FAILURE);
            return;
        }

        if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
            if (TemplateManager.deleteCustomTemplate(template.id)) {
                refreshTemplates();
                showToast("Template deleted successfully", Toasts.Type.SUCCESS);
            } else {
                showToast("Failed to delete template", Toasts.Type.FAILURE);
            }
        }
    };

    const categories = Object.values(TEMPLATE_CATEGORIES);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
                <h3 style={{
                    margin: "0 0 16px 0",
                    color: "#be185d",
                    fontSize: "18px",
                    fontWeight: "600"
                }}>
                    Embed Templates 🌸
                </h3>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="embed-text-input"
                    style={{ marginBottom: "12px" }}
                />

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="embed-select"
                    style={{ marginBottom: "12px" }}
                >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    <button
                        onClick={() => setShowSaveDialog(true)}
                        style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "linear-gradient(135deg, #ec4899, #be185d)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(190, 24, 93, 0.3)"
                        }}
                    >
                        Save Current
                    </button>
                    {botIntegrationEnabled && onSaveTemplate && (
                        <button
                            onClick={() => setShowSaveDialog(true)}
                            disabled={isSaving}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                background: isSaving ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)"
                            }}
                        >
                            {isSaving ? "Saving..." : "Save to Bot"}
                        </button>
                    )}
                    <button
                        onClick={refreshTemplates}
                        style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "linear-gradient(135deg, #f472b6, #ec4899)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(236, 72, 153, 0.3)"
                        }}
                    >
                        Refresh
                    </button>
                </div>

                {/* Bot Integration Status */}
                {saveStatus && (
                    <div style={{
                        padding: "8px 12px",
                        marginBottom: "12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: saveStatus.includes("✅") ? "rgba(16, 185, 129, 0.1)" :
                            saveStatus.includes("❌") ? "rgba(239, 68, 68, 0.1)" :
                                "rgba(59, 130, 246, 0.1)",
                        color: saveStatus.includes("✅") ? "#059669" :
                            saveStatus.includes("❌") ? "#dc2626" :
                                "#2563eb",
                        border: `1px solid ${saveStatus.includes("✅") ? "#10b981" :
                            saveStatus.includes("❌") ? "#ef4444" :
                                "#3b82f6"}`
                    }}>
                        {saveStatus}
                    </div>
                )}

                {/* Bot Templates Toggle */}
                {botIntegrationEnabled && Object.keys(savedEmbeds).length > 0 && (
                    <div style={{
                        marginBottom: "12px",
                        padding: "8px 12px",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid #10b981",
                        borderRadius: "6px"
                    }}>
                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: "#059669",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}>
                            <input
                                type="checkbox"
                                checked={showBotTemplates}
                                onChange={(e) => setShowBotTemplates(e.target.checked)}
                                style={{
                                    accentColor: "#10b981"
                                }}
                            />
                            Show Bot Templates ({Object.keys(savedEmbeds).length})
                        </label>
                    </div>
                )}
            </div>

            {/* Templates List */}
            <div style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid #f9a8d4",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.5)"
            }}
                className="embed-panel-scrollbar"
            >
                {/* Bot Templates Section */}
                {botIntegrationEnabled && showBotTemplates && filteredBotTemplates.length > 0 && (
                    <>
                        <div style={{
                            padding: "12px",
                            background: "rgba(16, 185, 129, 0.1)",
                            borderBottom: "2px solid #10b981",
                            fontWeight: "600",
                            color: "#059669",
                            fontSize: "14px"
                        }}>
                            🤖 Bot Templates
                        </div>
                        {filteredBotTemplates.map(([name, template]) => (
                            <div
                                key={`bot-${name}`}
                                style={{
                                    padding: "12px",
                                    borderBottom: "1px solid #fce7f3",
                                    cursor: "pointer",
                                    transition: "background 0.2s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#f0fdf4"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                onClick={() => onSelectTemplate(template)}
                            >
                                <div style={{
                                    fontWeight: "600",
                                    color: "#059669",
                                    fontSize: "14px",
                                    marginBottom: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                }}>
                                    {name}
                                    <span style={{
                                        fontSize: "10px",
                                        background: "#10b981",
                                        color: "white",
                                        padding: "2px 6px",
                                        borderRadius: "4px"
                                    }}>
                                        Bot
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: "12px",
                                    color: "#065f46",
                                    marginBottom: "4px"
                                }}>
                                    {template.title || "No title"}
                                </div>
                                <div style={{
                                    fontSize: "11px",
                                    color: "#6b7280"
                                }}>
                                    {template.description ? template.description.substring(0, 100) + (template.description.length > 100 ? "..." : "") : "No description"}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Local Templates Section */}
                {filteredTemplates.length === 0 && (!botIntegrationEnabled || !showBotTemplates || filteredBotTemplates.length === 0) ? (
                    <div style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#9d174d",
                        fontSize: "14px"
                    }}>
                        No templates found
                    </div>
                ) : (
                    <>
                        {filteredTemplates.length > 0 && (
                            <>
                                {botIntegrationEnabled && showBotTemplates && filteredBotTemplates.length > 0 && (
                                    <div style={{
                                        padding: "12px",
                                        background: "rgba(236, 72, 153, 0.1)",
                                        borderBottom: "2px solid #ec4899",
                                        fontWeight: "600",
                                        color: "#be185d",
                                        fontSize: "14px"
                                    }}>
                                        📁 Local Templates
                                    </div>
                                )}
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        style={{
                                            padding: "12px",
                                            borderBottom: "1px solid #fce7f3",
                                            cursor: "pointer",
                                            transition: "background 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#fdf2f8"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ flex: 1 }} onClick={() => handleSelectTemplate(template)}>
                                                <div style={{
                                                    fontWeight: "600",
                                                    color: "#be185d",
                                                    fontSize: "14px",
                                                    marginBottom: "4px"
                                                }}>
                                                    {template.name}
                                                    {template.isBuiltIn && (
                                                        <span style={{
                                                            marginLeft: "8px",
                                                            fontSize: "10px",
                                                            background: "#ec4899",
                                                            color: "white",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px"
                                                        }}>
                                                            Built-in
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: "12px",
                                                    color: "#9d174d",
                                                    marginBottom: "4px"
                                                }}>
                                                    {template.description}
                                                </div>
                                                <div style={{
                                                    fontSize: "10px",
                                                    color: "#be185d",
                                                    fontWeight: "500"
                                                }}>
                                                    {template.category}
                                                </div>
                                            </div>

                                            {!template.isBuiltIn && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTemplate(template);
                                                    }}
                                                    style={{
                                                        padding: "4px 8px",
                                                        background: "#ef4444",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        fontSize: "10px",
                                                        cursor: "pointer",
                                                        marginLeft: "8px"
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                )}
                            </div>

                        {/* Save Template Dialog */}
                        {showSaveDialog && (
                            <div style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "rgba(0, 0, 0, 0.5)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1000
                            }}>
                                <div style={{
                                    background: "white",
                                    padding: "24px",
                                    borderRadius: "12px",
                                    border: "2px solid #f9a8d4",
                                    minWidth: "400px",
                                    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)"
                                }}>
                                    <h4 style={{
                                        margin: "0 0 16px 0",
                                        color: "#be185d",
                                        fontSize: "16px",
                                        fontWeight: "600"
                                    }}>
                                        Save Template
                                    </h4>

                                    <div style={{ marginBottom: "12px" }}>
                                        <label style={{
                                            display: "block",
                                            marginBottom: "4px",
                                            color: "#831843",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}>
                                            Template Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={saveTemplateName}
                                            onChange={(e) => setSaveTemplateName(e.target.value)}
                                            placeholder="Enter template name..."
                                            className="embed-text-input"
                                            autoFocus
                                        />
                                    </div>

                                    <div style={{ marginBottom: "12px" }}>
                                        <label style={{
                                            display: "block",
                                            marginBottom: "4px",
                                            color: "#831843",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}>
                                            Description
                                        </label>
                                        <textarea
                                            value={saveTemplateDescription}
                                            onChange={(e) => setSaveTemplateDescription(e.target.value)}
                                            placeholder="Enter template description..."
                                            className="embed-textarea"
                                            style={{ height: "60px" }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: "20px" }}>
                                        <label style={{
                                            display: "block",
                                            marginBottom: "4px",
                                            color: "#831843",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}>
                                            Category
                                        </label>
                                        <select
                                            value={saveTemplateCategory}
                                            onChange={(e) => setSaveTemplateCategory(e.target.value)}
                                            className="embed-select"
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                        <button
                                            onClick={() => setShowSaveDialog(false)}
                                            style={{
                                                padding: "8px 16px",
                                                background: "#e5e7eb",
                                                color: "#374151",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveTemplate}
                                            style={{
                                                padding: "8px 16px",
                                                background: "linear-gradient(135deg, #ec4899, #be185d)",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                boxShadow: "0 2px 4px rgba(190, 24, 93, 0.3)"
                                            }}
                                        >
                                            Save Locally
                                        </button>
                                        {botIntegrationEnabled && onSaveTemplate && (
                                            <button
                                                onClick={handleSaveToBotAPI}
                                                disabled={isSaving}
                                                style={{
                                                    padding: "8px 16px",
                                                    background: isSaving ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    cursor: isSaving ? "not-allowed" : "pointer",
                                                    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)"
                                                }}
                                            >
                                                {isSaving ? "Saving..." : "Save to Bot"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
}
