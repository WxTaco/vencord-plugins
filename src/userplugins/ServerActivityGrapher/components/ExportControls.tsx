/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState } from "@webpack/common";
import { exportToCSV, exportToPNG, exportToJSON } from "../utils/exportUtils";

interface ExportControlsProps {
    activityData: any;
    guildName: string;
    timeRange: string;
    themeColors: {
        primary: string;
        secondary: string;
        gradient: string;
    };
}

export function ExportControls({ activityData, guildName, timeRange, themeColors }: ExportControlsProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string | null>(null);

    const handleExport = async (format: 'csv' | 'png' | 'json') => {
        setIsExporting(true);
        setExportStatus(null);

        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${guildName.replace(/[^a-zA-Z0-9]/g, '_')}_activity_${timeRange}_${timestamp}`;

            switch (format) {
                case 'csv':
                    await exportToCSV(activityData, filename);
                    setExportStatus('📊 CSV exported successfully!');
                    break;
                case 'png':
                    await exportToPNG(activityData, filename, themeColors);
                    setExportStatus('🖼️ PNG exported successfully!');
                    break;
                case 'json':
                    await exportToJSON(activityData, filename);
                    setExportStatus('📄 JSON exported successfully!');
                    break;
            }
        } catch (error) {
            console.error('Export failed:', error);
            setExportStatus('❌ Export failed. Please try again.');
        }

        setIsExporting(false);
        
        // Clear status after 3 seconds
        setTimeout(() => setExportStatus(null), 3000);
    };

    const buttonStyle = (disabled: boolean = false) => ({
        padding: "10px 16px",
        background: disabled ? "#e0e0e0" : themeColors.gradient,
        color: disabled ? "#999" : "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 2px 4px rgba(79, 195, 247, 0.3)",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1
    });

    return (
        <div style={{
            padding: "20px",
            background: "white",
            border: "2px solid #4fc3f7",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(79, 195, 247, 0.1)"
        }}>
            <h3 style={{ 
                margin: "0 0 16px 0", 
                color: "#0277bd",
                fontSize: "18px",
                fontWeight: "600"
            }}>
                📤 Export Data
            </h3>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "16px"
            }}>
                <div style={{
                    padding: "16px",
                    background: "rgba(79, 195, 247, 0.05)",
                    borderRadius: "8px",
                    border: "1px solid #e3f2fd"
                }}>
                    <h4 style={{ 
                        margin: "0 0 8px 0", 
                        color: "#0277bd",
                        fontSize: "14px",
                        fontWeight: "600"
                    }}>
                        📊 CSV Export
                    </h4>
                    <p style={{ 
                        margin: "0 0 12px 0", 
                        fontSize: "12px", 
                        color: "#666",
                        lineHeight: "1.4"
                    }}>
                        Export raw data for analysis in Excel, Google Sheets, or other tools.
                    </p>
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting || !activityData}
                        style={buttonStyle(isExporting || !activityData)}
                    >
                        {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
                    </button>
                </div>

                <div style={{
                    padding: "16px",
                    background: "rgba(79, 195, 247, 0.05)",
                    borderRadius: "8px",
                    border: "1px solid #e3f2fd"
                }}>
                    <h4 style={{ 
                        margin: "0 0 8px 0", 
                        color: "#0277bd",
                        fontSize: "14px",
                        fontWeight: "600"
                    }}>
                        🖼️ PNG Export
                    </h4>
                    <p style={{ 
                        margin: "0 0 12px 0", 
                        fontSize: "12px", 
                        color: "#666",
                        lineHeight: "1.4"
                    }}>
                        Save charts as high-quality images for presentations or sharing.
                    </p>
                    <button
                        onClick={() => handleExport('png')}
                        disabled={isExporting || !activityData}
                        style={buttonStyle(isExporting || !activityData)}
                    >
                        {isExporting ? "⏳ Exporting..." : "🖼️ Export PNG"}
                    </button>
                </div>

                <div style={{
                    padding: "16px",
                    background: "rgba(79, 195, 247, 0.05)",
                    borderRadius: "8px",
                    border: "1px solid #e3f2fd"
                }}>
                    <h4 style={{ 
                        margin: "0 0 8px 0", 
                        color: "#0277bd",
                        fontSize: "14px",
                        fontWeight: "600"
                    }}>
                        📄 JSON Export
                    </h4>
                    <p style={{ 
                        margin: "0 0 12px 0", 
                        fontSize: "12px", 
                        color: "#666",
                        lineHeight: "1.4"
                    }}>
                        Export structured data for developers or advanced analysis.
                    </p>
                    <button
                        onClick={() => handleExport('json')}
                        disabled={isExporting || !activityData}
                        style={buttonStyle(isExporting || !activityData)}
                    >
                        {isExporting ? "⏳ Exporting..." : "📄 Export JSON"}
                    </button>
                </div>
            </div>

            {/* Export Status */}
            {exportStatus && (
                <div style={{
                    padding: "12px 16px",
                    background: exportStatus.includes('❌') ? "#fef2f2" : "#f0fdf4",
                    border: `1px solid ${exportStatus.includes('❌') ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: "8px",
                    color: exportStatus.includes('❌') ? "#dc2626" : "#166534",
                    fontSize: "13px",
                    fontWeight: "500",
                    textAlign: "center"
                }}>
                    {exportStatus}
                </div>
            )}

            {/* Export Info */}
            <div style={{
                marginTop: "16px",
                padding: "12px",
                background: "rgba(79, 195, 247, 0.1)",
                borderRadius: "8px",
                border: "1px solid #4fc3f7"
            }}>
                <h4 style={{ 
                    margin: "0 0 8px 0", 
                    color: "#0277bd",
                    fontSize: "14px",
                    fontWeight: "600"
                }}>
                    📋 Export Information
                </h4>
                <div style={{ fontSize: "12px", color: "#01579b", lineHeight: "1.4" }}>
                    <div>• <strong>Server:</strong> {guildName}</div>
                    <div>• <strong>Time Range:</strong> {timeRange}</div>
                    <div>• <strong>Generated:</strong> {new Date().toLocaleString()}</div>
                    {activityData?.summary && (
                        <>
                            <div>• <strong>Total Messages:</strong> {activityData.summary.totalMessages}</div>
                            <div>• <strong>Active Users:</strong> {activityData.summary.uniqueUsers}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Data Included */}
            <div style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef"
            }}>
                <h4 style={{ 
                    margin: "0 0 8px 0", 
                    color: "#495057",
                    fontSize: "13px",
                    fontWeight: "600"
                }}>
                    📊 Data Included in Export
                </h4>
                <div style={{ 
                    fontSize: "11px", 
                    color: "#6c757d", 
                    lineHeight: "1.4",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "4px"
                }}>
                    <div>✓ Hourly message counts</div>
                    <div>✓ Daily activity stats</div>
                    <div>✓ Channel breakdown</div>
                    <div>✓ Top active users</div>
                    <div>✓ Ping statistics</div>
                    <div>✓ Join/leave events</div>
                    <div>✓ Summary metrics</div>
                    <div>✓ Time range info</div>
                </div>
            </div>
        </div>
    );
}
