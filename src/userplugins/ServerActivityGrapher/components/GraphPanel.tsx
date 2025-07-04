/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { React, useState, useEffect } from "@webpack/common";
import { GuildStore, ChannelStore } from "@webpack/common";
import { ActivityChart } from "./ActivityChart";
import { ExportControls } from "./ExportControls";
import { HistoryFetcher } from "../utils/historyFetcher";

interface GraphPanelProps {
    guildId: string;
    onClose: () => void;
}

export function GraphPanel({ guildId, onClose, ...props }: GraphPanelProps & any) {
    const [timeRange, setTimeRange] = useState("7d");
    const [selectedChannel, setSelectedChannel] = useState("all");
    const [activityData, setActivityData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [historyProgress, setHistoryProgress] = useState<{ current: number; total: number; channel: string } | null>(null);
    const [isHistoryFetching, setIsHistoryFetching] = useState(false);

    const guild = GuildStore.getGuild(guildId);
    const channels = Object.values(ChannelStore.getGuildChannels(guildId) || {})
        .filter((channel: any) => channel.type === 0) // Text channels only
        .sort((a: any, b: any) => a.position - b.position);

    const historyFetcher = React.useMemo(() => new HistoryFetcher(guildId), [guildId]);

    useEffect(() => {
        loadActivityData();
    }, [timeRange, selectedChannel, guildId]);

    const loadActivityData = () => {
        setIsLoading(true);
        // Simulate loading activity data
        setTimeout(() => {
            const mockData = generateMockData();
            setActivityData(mockData);
            setIsLoading(false);
        }, 500);
    };

    const generateMockData = () => {
        const data = [];
        const now = new Date();
        const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                messages: Math.floor(Math.random() * 100) + 10,
                users: Math.floor(Math.random() * 20) + 5,
                channels: selectedChannel === "all" ? channels.length : 1
            });
        }
        
        return data;
    };

    const handleHistoryFetch = async () => {
        setIsHistoryFetching(true);
        setHistoryProgress({ current: 0, total: channels.length, channel: "Starting..." });

        try {
            await historyFetcher.fetchHistory({
                days: parseInt(timeRange.replace(/\D/g, '')) || 7,
                onProgress: (progress) => {
                    setHistoryProgress(progress);
                }
            });
            
            // Reload activity data after fetching
            loadActivityData();
        } catch (error) {
            console.error("History fetch failed:", error);
        } finally {
            setIsHistoryFetching(false);
            setHistoryProgress(null);
        }
    };

    const themeColors = {
        primary: "#4fc3f7",
        secondary: "#0277bd",
        background: "#e3f2fd",
        text: "#0277bd",
        textMuted: "#546e7a"
    };

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    width: "100%",
                    background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
                    borderBottom: "2px solid #4fc3f7",
                    padding: "20px 24px",
                    borderRadius: "8px 8px 0 0"
                }}>
                    <h2 style={{ 
                        margin: 0, 
                        color: "#0277bd", 
                        fontSize: "24px", 
                        fontWeight: "700",
                        textShadow: "0 1px 2px rgba(2, 119, 189, 0.1)"
                    }}>
                        Server Activity Analytics - {guild?.name || "Unknown Server"}
                    </h2>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>

            <ModalContent 
                className="activity-panel-scrollbar"
                style={{ 
                    padding: "24px", 
                    maxHeight: "85vh", 
                    overflow: "auto",
                    background: "linear-gradient(135deg, #fafafa, #f5f5f5)",
                    minWidth: "1200px",
                    minHeight: "700px"
                }}>
                
                <div style={{ display: "flex", gap: "24px", height: "100%" }}>
                    {/* Left Panel - Controls */}
                    <div style={{ 
                        width: "300px",
                        background: "rgba(255, 255, 255, 0.9)",
                        border: "2px solid #4fc3f7",
                        borderRadius: "12px",
                        padding: "24px",
                        boxShadow: "0 4px 6px rgba(79, 195, 247, 0.1)",
                        height: "fit-content"
                    }}>
                        <h3 style={{ 
                            margin: "0 0 20px 0", 
                            color: "#0277bd", 
                            fontSize: "18px",
                            fontWeight: "600"
                        }}>
                            Analytics Controls
                        </h3>

                        {/* Time Range */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "8px", 
                                color: "#0277bd", 
                                fontSize: "14px",
                                fontWeight: "500"
                            }}>
                                Time Range
                            </label>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="activity-select"
                            >
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                            </select>
                        </div>

                        {/* Channel Filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "8px", 
                                color: "#0277bd", 
                                fontSize: "14px",
                                fontWeight: "500"
                            }}>
                                Channel Filter
                            </label>
                            <select
                                value={selectedChannel}
                                onChange={(e) => setSelectedChannel(e.target.value)}
                                className="activity-select"
                            >
                                <option value="all">All Channels</option>
                                {channels.map((channel: any) => (
                                    <option key={channel.id} value={channel.id}>
                                        #{channel.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* History Fetching */}
                        <div style={{ marginBottom: "20px" }}>
                            <h4 style={{ 
                                margin: "0 0 12px 0", 
                                color: "#0277bd", 
                                fontSize: "16px",
                                fontWeight: "600"
                            }}>
                                History Fetching
                            </h4>
                            
                            {historyProgress && (
                                <div style={{ 
                                    marginBottom: "12px",
                                    padding: "12px",
                                    background: "#e3f2fd",
                                    borderRadius: "8px",
                                    border: "1px solid #4fc3f7"
                                }}>
                                    <div style={{ fontSize: "12px", color: "#0277bd", marginBottom: "4px" }}>
                                        {historyProgress.current}/{historyProgress.total} channels
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#546e7a" }}>
                                        {historyProgress.channel}
                                    </div>
                                    <div style={{ 
                                        width: "100%", 
                                        height: "4px", 
                                        background: "#bbdefb", 
                                        borderRadius: "2px",
                                        marginTop: "8px"
                                    }}>
                                        <div style={{ 
                                            width: `${(historyProgress.current / historyProgress.total) * 100}%`, 
                                            height: "100%", 
                                            background: "#4fc3f7", 
                                            borderRadius: "2px",
                                            transition: "width 0.3s ease"
                                        }} />
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={handleHistoryFetch}
                                disabled={isHistoryFetching}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    background: isHistoryFetching ? "#bbdefb" : "linear-gradient(135deg, #4fc3f7, #0277bd)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: isHistoryFetching ? "not-allowed" : "pointer",
                                    boxShadow: "0 2px 4px rgba(79, 195, 247, 0.3)",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {isHistoryFetching ? "Fetching..." : "Fetch History"}
                            </button>
                        </div>

                        {/* Export Controls */}
                        <ExportControls 
                            activityData={activityData}
                            guildName={guild?.name || "Unknown"}
                            timeRange={timeRange}
                            themeColors={themeColors}
                        />
                    </div>

                    {/* Right Panel - Chart */}
                    <div style={{ 
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.9)",
                        border: "2px solid #4fc3f7",
                        borderRadius: "12px",
                        padding: "24px",
                        boxShadow: "0 4px 6px rgba(79, 195, 247, 0.1)",
                        overflow: "auto"
                    }}
                    className="activity-panel-scrollbar"
                    >
                        <h3 style={{ 
                            margin: "0 0 20px 0", 
                            color: "#0277bd", 
                            fontSize: "18px",
                            fontWeight: "600"
                        }}>
                            Activity Overview
                        </h3>

                        {isLoading ? (
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "center", 
                                alignItems: "center", 
                                height: "400px",
                                color: "#0277bd",
                                fontSize: "16px"
                            }}>
                                Loading analytics...
                            </div>
                        ) : (
                            <ActivityChart 
                                data={activityData}
                                timeRange={timeRange}
                                themeColors={themeColors}
                            />
                        )}
                    </div>
                </div>
            </ModalContent>
            
            {/* Custom Scrollbar and Enhanced Styling */}
            <style>{`
                /* Custom scrollbar styling for activity panels */
                .activity-panel-scrollbar::-webkit-scrollbar,
                .activity-panel-scrollbar *::-webkit-scrollbar {
                    width: 14px;
                    height: 14px;
                }
                
                .activity-panel-scrollbar::-webkit-scrollbar-track,
                .activity-panel-scrollbar *::-webkit-scrollbar-track {
                    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                    border-radius: 8px;
                    border: 1px solid #4fc3f7;
                    margin: 2px;
                }
                
                .activity-panel-scrollbar::-webkit-scrollbar-thumb,
                .activity-panel-scrollbar *::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #4fc3f7, #0277bd);
                    border-radius: 8px;
                    border: 2px solid #e3f2fd;
                    box-shadow: 0 2px 4px rgba(79, 195, 247, 0.2);
                }
                
                .activity-panel-scrollbar::-webkit-scrollbar-thumb:hover,
                .activity-panel-scrollbar *::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #0277bd, #01579b);
                    box-shadow: 0 4px 8px rgba(79, 195, 247, 0.3);
                }
                
                .activity-panel-scrollbar::-webkit-scrollbar-corner,
                .activity-panel-scrollbar *::-webkit-scrollbar-corner {
                    background: #e3f2fd;
                    border-radius: 8px;
                }
                
                /* Enhanced select styling */
                .activity-select {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 2px solid #4fc3f7 !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    font-family: inherit !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #0277bd !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 2px 4px rgba(79, 195, 247, 0.1) !important;
                    cursor: pointer !important;
                    box-sizing: border-box !important;
                    font-weight: 500 !important;
                }
                
                .activity-select:focus {
                    outline: none !important;
                    border-color: #0277bd !important;
                    box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.1) !important;
                    background: rgba(255, 255, 255, 1) !important;
                }
                
                .activity-select:hover {
                    border-color: #29b6f6 !important;
                    box-shadow: 0 4px 8px rgba(79, 195, 247, 0.15) !important;
                }
                
                /* Force scrollbar styling on the modal content */
                [class*="activity-panel-scrollbar"] {
                    scrollbar-width: thin;
                    scrollbar-color: #4fc3f7 #e3f2fd;
                }
            `}</style>
        </ModalRoot>
    );
}
