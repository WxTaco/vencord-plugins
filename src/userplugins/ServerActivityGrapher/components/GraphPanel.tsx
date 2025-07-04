/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { React, useState, useEffect } from "@webpack/common";
import { GuildStore, ChannelStore } from "@webpack/common";
import { ActivityTracker } from "../utils/activityTracker";
import { getTimeRanges, formatHour, formatDate } from "../utils/timeUtils";
import { Heatmap } from "./Heatmap";
import { ExportControls } from "./ExportControls";
import { settings } from "../settings";

interface GraphPanelProps extends ModalProps {
    guildId: string;
    activityTracker: ActivityTracker;
}

export function GraphPanel({ guildId, activityTracker, ...props }: GraphPanelProps) {
    const [timeRange, setTimeRange] = useState(settings.store.defaultTimeRange);
    const [selectedChannel, setSelectedChannel] = useState<string>("all");
    const [chartType, setChartType] = useState<"bar" | "line" | "heatmap">("bar");
    const [activityData, setActivityData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    const guild = GuildStore.getGuild(guildId);
    const channels = guild ? Object.values(ChannelStore.getGuildChannels(guildId)) : [];
    const textChannels = channels.filter((ch: any) => ch.type === 0); // Text channels only

    useEffect(() => {
        loadActivityData();
    }, [guildId, timeRange, selectedChannel]);

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadActivityData();
            setLastUpdate(Date.now());
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, guildId, timeRange, selectedChannel]);

    // Listen for new messages to trigger updates
    useEffect(() => {
        const handleNewMessage = () => {
            if (autoRefresh) {
                // Debounced update - only update if last update was more than 5 seconds ago
                const now = Date.now();
                if (now - lastUpdate > 5000) {
                    loadActivityData();
                    setLastUpdate(now);
                }
            }
        };

        // Listen for activity tracker updates
        const checkForUpdates = setInterval(() => {
            if (autoRefresh && activityTracker) {
                const guildData = activityTracker.getGuildData(guildId);
                if (guildData && guildData.lastSaved > lastUpdate) {
                    loadActivityData();
                    setLastUpdate(Date.now());
                }
            }
        }, 5000);

        return () => clearInterval(checkForUpdates);
    }, [autoRefresh, lastUpdate, guildId, activityTracker]);

    const loadActivityData = () => {
        setLoading(true);

        try {
            const timeRanges = getTimeRanges();
            const range = timeRanges[timeRange];
            const days = Math.ceil((range.end - range.start) / (24 * 60 * 60 * 1000));

            const hourlyData = activityTracker.getHourlyActivity(guildId, days);
            const dailyData = activityTracker.getDailyActivity(guildId, days);
            const channelData = activityTracker.getChannelActivity(guildId, days);
            const topUsers = activityTracker.getTopUsers(guildId, days, 10);
            const pingStats = activityTracker.getPingStats(guildId, days);
            const joinLeaveStats = activityTracker.getJoinLeaveStats(guildId, days);
            const summaryStats = activityTracker.getSummaryStats(guildId, days);
            const trendAnalysis = activityTracker.getTrendAnalysis(guildId, days);
            const activityPatterns = activityTracker.getActivityPatterns(guildId, Math.max(days, 30));
            const growthMetrics = activityTracker.getGrowthMetrics(guildId, Math.max(days, 30));

            setActivityData({
                hourly: hourlyData,
                daily: dailyData,
                channels: channelData,
                topUsers,
                pings: pingStats,
                joinLeave: joinLeaveStats,
                summary: summaryStats,
                trends: trendAnalysis,
                patterns: activityPatterns,
                growth: growthMetrics,
                timeRange: range,
                days
            });
        } catch (error) {
            console.error("Failed to load activity data:", error);
        }

        setLoading(false);
    };

    const getChartData = () => {
        if (!activityData) return { labels: [], data: [] };

        if (chartType === "bar" || chartType === "line") {
            if (timeRange === "24h" || timeRange === "6h" || timeRange === "1h") {
                // Show hourly data
                const labels = Object.keys(activityData.hourly)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(hour => formatHour(parseInt(hour)));
                const data = Object.keys(activityData.hourly)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(hour => activityData.hourly[hour] || 0);
                return { labels, data };
            } else {
                // Show daily data
                const labels = Object.keys(activityData.daily)
                    .sort()
                    .map(date => formatDate(date));
                const data = Object.keys(activityData.daily)
                    .sort()
                    .map(date => activityData.daily[date] || 0);
                return { labels, data };
            }
        }

        return { labels: [], data: [] };
    };

    const getThemeColors = () => {
        const theme = settings.store.chartTheme;
        const themes = {
            blue: { primary: "#29b6f6", secondary: "#0277bd", gradient: "linear-gradient(135deg, #29b6f6, #0277bd)" },
            purple: { primary: "#ab47bc", secondary: "#6a1b9a", gradient: "linear-gradient(135deg, #ab47bc, #6a1b9a)" },
            green: { primary: "#66bb6a", secondary: "#2e7d32", gradient: "linear-gradient(135deg, #66bb6a, #2e7d32)" },
            orange: { primary: "#ff9800", secondary: "#e65100", gradient: "linear-gradient(135deg, #ff9800, #e65100)" },
            pink: { primary: "#ec4899", secondary: "#be185d", gradient: "linear-gradient(135deg, #ec4899, #be185d)" }
        };
        return themes[theme as keyof typeof themes] || themes.blue;
    };

    const chartData = getChartData();
    const themeColors = getThemeColors();

    return (
        <ModalRoot {...props} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
                    borderBottom: "2px solid #4fc3f7",
                    padding: "16px 20px",
                    borderRadius: "8px 8px 0 0"
                }}>
                    <h2 style={{
                        margin: 0,
                        color: "#0277bd",
                        fontSize: "22px",
                        fontWeight: "700",
                        textShadow: "0 1px 2px rgba(2, 119, 189, 0.1)"
                    }}>
                        📊 Server Activity - {guild?.name || "Unknown Server"}
                    </h2>
                    <ModalCloseButton onClick={props.onClose} />
                </div>
            </ModalHeader>

            <ModalContent style={{
                padding: "20px",
                maxHeight: "80vh",
                overflow: "auto",
                background: "linear-gradient(135deg, #fafafa, #f5f5f5)"
            }}>
                {/* Controls */}
                <div style={{
                    display: "flex",
                    gap: "16px",
                    marginBottom: "20px",
                    padding: "16px",
                    background: "rgba(79, 195, 247, 0.1)",
                    borderRadius: "12px",
                    border: "1px solid #4fc3f7",
                    flexWrap: "wrap"
                }}>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#0277bd"
                        }}>
                            Time Range
                        </label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "2px solid #4fc3f7",
                                borderRadius: "6px",
                                fontSize: "14px",
                                background: "white",
                                color: "#0277bd"
                            }}
                        >
                            {Object.entries(getTimeRanges()).map(([key, range]) => (
                                <option key={key} value={key}>{range.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#0277bd"
                        }}>
                            Channel
                        </label>
                        <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "2px solid #4fc3f7",
                                borderRadius: "6px",
                                fontSize: "14px",
                                background: "white",
                                color: "#0277bd"
                            }}
                        >
                            <option value="all">All Channels</option>
                            {textChannels.map((channel: any) => (
                                <option key={channel.id} value={channel.id}>
                                    #{channel.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#0277bd"
                        }}>
                            Chart Type
                        </label>
                        <select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value as any)}
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "2px solid #4fc3f7",
                                borderRadius: "6px",
                                fontSize: "14px",
                                background: "white",
                                color: "#0277bd"
                            }}
                        >
                            <option value="bar">📊 Bar Chart</option>
                            <option value="line">📈 Line Chart</option>
                            <option value="heatmap">🔥 Heatmap</option>
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#0277bd"
                        }}>
                            Auto-Refresh
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                            <label style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                color: "#0277bd",
                                fontWeight: "500",
                                cursor: "pointer"
                            }}>
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    style={{
                                        accentColor: "#29b6f6",
                                        transform: "scale(1.1)"
                                    }}
                                />
                                🔄 Live Updates
                            </label>
                        </div>
                        <div style={{
                            fontSize: "10px",
                            color: "#666",
                            marginTop: "4px",
                            fontStyle: "italic"
                        }}>
                            Last: {new Date(lastUpdate).toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        color: "#0277bd",
                        fontSize: "16px"
                    }}>
                        📊 Loading activity data...
                    </div>
                ) : (
                    <div>
                        {/* Chart Area */}
                        <div style={{
                            marginBottom: "24px",
                            padding: "20px",
                            background: "white",
                            border: "2px solid #4fc3f7",
                            borderRadius: "12px",
                            boxShadow: "0 4px 6px rgba(79, 195, 247, 0.1)"
                        }}>
                            {chartType === "heatmap" ? (
                                <Heatmap
                                    guildId={guildId}
                                    activityTracker={activityTracker}
                                    days={activityData?.days || 7}
                                    themeColors={themeColors}
                                />
                            ) : (
                                <div>
                                    <h3 style={{
                                        margin: "0 0 16px 0",
                                        color: "#0277bd",
                                        fontSize: "18px",
                                        fontWeight: "600"
                                    }}>
                                        {chartType === "bar" ? "📊" : "📈"} Message Activity
                                    </h3>

                                    {/* Enhanced chart visualization */}
                                    <div style={{ height: "320px", position: "relative" }}>
                                        {chartType === "line" ? (
                                            // Line chart
                                            <svg width="100%" height="300" style={{ overflow: "visible" }}>
                                                <defs>
                                                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor={themeColors.primary} stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor={themeColors.primary} stopOpacity="0.1" />
                                                    </linearGradient>
                                                </defs>
                                                {chartData.data.length > 1 && (() => {
                                                    const maxValue = Math.max(...chartData.data, 1);
                                                    const width = 100 / chartData.data.length;

                                                    // Create path for line
                                                    let pathData = "";
                                                    let areaData = "";

                                                    chartData.data.forEach((value, index) => {
                                                        const x = (index / (chartData.data.length - 1)) * 100;
                                                        const y = 100 - ((value / maxValue) * 90);

                                                        if (index === 0) {
                                                            pathData += `M ${x} ${y}`;
                                                            areaData += `M ${x} 100 L ${x} ${y}`;
                                                        } else {
                                                            pathData += ` L ${x} ${y}`;
                                                            areaData += ` L ${x} ${y}`;
                                                        }

                                                        if (index === chartData.data.length - 1) {
                                                            areaData += ` L ${x} 100 Z`;
                                                        }
                                                    });

                                                    return (
                                                        <>
                                                            {/* Area fill */}
                                                            <path
                                                                d={areaData}
                                                                fill="url(#lineGradient)"
                                                                style={{
                                                                    animation: "fadeIn 0.8s ease-in-out",
                                                                    transformOrigin: "bottom"
                                                                }}
                                                            />
                                                            {/* Line */}
                                                            <path
                                                                d={pathData}
                                                                fill="none"
                                                                stroke={themeColors.primary}
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                style={{
                                                                    animation: "drawLine 1.2s ease-in-out",
                                                                    strokeDasharray: "1000",
                                                                    strokeDashoffset: "1000"
                                                                }}
                                                            />
                                                            {/* Data points */}
                                                            {chartData.data.map((value, index) => {
                                                                const x = (index / (chartData.data.length - 1)) * 100;
                                                                const y = 100 - ((value / maxValue) * 90);

                                                                return (
                                                                    <circle
                                                                        key={index}
                                                                        cx={`${x}%`}
                                                                        cy={`${y}%`}
                                                                        r="4"
                                                                        fill={themeColors.secondary}
                                                                        stroke="white"
                                                                        strokeWidth="2"
                                                                        style={{
                                                                            animation: `popIn 0.6s ease-in-out ${index * 0.1}s both`,
                                                                            cursor: "pointer"
                                                                        }}
                                                                    >
                                                                        <title>{`${chartData.labels[index]}: ${value} messages`}</title>
                                                                    </circle>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                        ) : (
                                            // Enhanced bar chart
                                            <div style={{ height: "300px", display: "flex", alignItems: "end", gap: "4px" }}>
                                                {chartData.data.map((value, index) => {
                                                    const maxValue = Math.max(...chartData.data, 1);
                                                    const height = (value / maxValue) * 280;

                                                    return (
                                                        <div key={index} style={{
                                                            flex: 1,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            position: "relative"
                                                        }}>
                                                            {/* Value label */}
                                                            <div style={{
                                                                fontSize: "10px",
                                                                color: "#0277bd",
                                                                fontWeight: "600",
                                                                opacity: value > 0 ? 1 : 0,
                                                                transition: "opacity 0.3s ease"
                                                            }}>
                                                                {value}
                                                            </div>

                                                            {/* Bar */}
                                                            <div
                                                                style={{
                                                                    width: "100%",
                                                                    height: `${height}px`,
                                                                    background: themeColors.gradient,
                                                                    borderRadius: "6px 6px 0 0",
                                                                    minHeight: value > 0 ? "3px" : "0px",
                                                                    position: "relative",
                                                                    cursor: "pointer",
                                                                    transition: "all 0.3s ease",
                                                                    animation: `growUp 0.8s ease-out ${index * 0.05}s both`,
                                                                    boxShadow: value > 0 ? "0 2px 4px rgba(79, 195, 247, 0.3)" : "none"
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.transform = "scaleY(1.05)";
                                                                    e.currentTarget.style.filter = "brightness(1.1)";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.transform = "scaleY(1)";
                                                                    e.currentTarget.style.filter = "brightness(1)";
                                                                }}
                                                                title={`${chartData.labels[index]}: ${value} messages`}
                                                            />

                                                            {/* Label */}
                                                            <div style={{
                                                                fontSize: "9px",
                                                                color: "#666",
                                                                transform: "rotate(-45deg)",
                                                                transformOrigin: "center",
                                                                whiteSpace: "nowrap",
                                                                marginTop: "8px",
                                                                fontWeight: "500"
                                                            }}>
                                                                {chartData.labels[index]}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Chart animations */}
                                        <style>{`
                                            @keyframes growUp {
                                                from {
                                                    height: 0px;
                                                    opacity: 0;
                                                }
                                                to {
                                                    opacity: 1;
                                                }
                                            }

                                            @keyframes drawLine {
                                                to {
                                                    stroke-dashoffset: 0;
                                                }
                                            }

                                            @keyframes popIn {
                                                from {
                                                    transform: scale(0);
                                                    opacity: 0;
                                                }
                                                to {
                                                    transform: scale(1);
                                                    opacity: 1;
                                                }
                                            }

                                            @keyframes fadeIn {
                                                from {
                                                    opacity: 0;
                                                    transform: scaleY(0);
                                                }
                                                to {
                                                    opacity: 1;
                                                    transform: scaleY(1);
                                                }
                                            }
                                        `}</style>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary Stats */}
                        {activityData?.summary && (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "16px",
                                marginBottom: "24px"
                            }}>
                                <div style={{
                                    padding: "16px",
                                    background: "white",
                                    border: "2px solid #4fc3f7",
                                    borderRadius: "12px",
                                    textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#0277bd" }}>
                                        {activityData.summary.totalMessages}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                        Total Messages
                                    </div>
                                    {activityData.trends && (
                                        <div style={{
                                            fontSize: "10px",
                                            color: activityData.trends.change.messagesPercent > 0 ? "#4caf50" : activityData.trends.change.messagesPercent < 0 ? "#f44336" : "#666",
                                            marginTop: "2px",
                                            fontWeight: "600"
                                        }}>
                                            {activityData.trends.change.messagesPercent > 0 ? "↗" : activityData.trends.change.messagesPercent < 0 ? "↘" : "→"}
                                            {Math.abs(activityData.trends.change.messagesPercent).toFixed(1)}%
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    padding: "16px",
                                    background: "white",
                                    border: "2px solid #4fc3f7",
                                    borderRadius: "12px",
                                    textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#0277bd" }}>
                                        {activityData.summary.uniqueUsers}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                        Active Users
                                    </div>
                                    {activityData.trends && (
                                        <div style={{
                                            fontSize: "10px",
                                            color: activityData.trends.change.usersPercent > 0 ? "#4caf50" : activityData.trends.change.usersPercent < 0 ? "#f44336" : "#666",
                                            marginTop: "2px",
                                            fontWeight: "600"
                                        }}>
                                            {activityData.trends.change.usersPercent > 0 ? "↗" : activityData.trends.change.usersPercent < 0 ? "↘" : "→"}
                                            {Math.abs(activityData.trends.change.usersPercent).toFixed(1)}%
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    padding: "16px",
                                    background: "white",
                                    border: "2px solid #4fc3f7",
                                    borderRadius: "12px",
                                    textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#0277bd" }}>
                                        {activityData.summary.mostActiveHour ? formatHour(activityData.summary.mostActiveHour.hour) : "N/A"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                        Most Active Hour
                                    </div>
                                    {activityData.patterns && (
                                        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                                            Quiet: {formatHour(activityData.patterns.quiet.hour.time)}
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    padding: "16px",
                                    background: "white",
                                    border: "2px solid #4fc3f7",
                                    borderRadius: "12px",
                                    textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#0277bd" }}>
                                        {Math.round(activityData.summary.averagePerDay)}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                        Avg Messages/Day
                                    </div>
                                    {activityData.growth && (
                                        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                                            Next week: ~{activityData.growth.projections.messagesNextWeek}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Trend Analysis */}
                        {activityData?.trends && (
                            <div style={{
                                marginBottom: "24px",
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
                                    📈 Trend Analysis - {timeRange.toUpperCase()} vs Previous Period
                                </h3>

                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                    gap: "16px"
                                }}>
                                    <div style={{
                                        padding: "16px",
                                        background: "rgba(79, 195, 247, 0.05)",
                                        borderRadius: "8px",
                                        border: "1px solid #e3f2fd"
                                    }}>
                                        <h4 style={{ margin: "0 0 8px 0", color: "#0277bd", fontSize: "14px" }}>
                                            📊 Activity Trend
                                        </h4>
                                        <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                                            <div>Current: {activityData.trends.current.messages} messages</div>
                                            <div>Previous: {activityData.trends.previous.messages} messages</div>
                                            <div style={{
                                                color: activityData.trends.change.messagesPercent > 0 ? "#4caf50" : activityData.trends.change.messagesPercent < 0 ? "#f44336" : "#666",
                                                fontWeight: "600",
                                                marginTop: "4px"
                                            }}>
                                                {activityData.trends.change.messages > 0 ? "+" : ""}{activityData.trends.change.messages} messages
                                                ({activityData.trends.change.messagesPercent > 0 ? "+" : ""}{activityData.trends.change.messagesPercent.toFixed(1)}%)
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: "16px",
                                        background: "rgba(79, 195, 247, 0.05)",
                                        borderRadius: "8px",
                                        border: "1px solid #e3f2fd"
                                    }}>
                                        <h4 style={{ margin: "0 0 8px 0", color: "#0277bd", fontSize: "14px" }}>
                                            👥 User Engagement
                                        </h4>
                                        <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                                            <div>Current: {activityData.trends.current.users} active users</div>
                                            <div>Previous: {activityData.trends.previous.users} active users</div>
                                            <div style={{
                                                color: activityData.trends.change.usersPercent > 0 ? "#4caf50" : activityData.trends.change.usersPercent < 0 ? "#f44336" : "#666",
                                                fontWeight: "600",
                                                marginTop: "4px"
                                            }}>
                                                {activityData.trends.change.users > 0 ? "+" : ""}{activityData.trends.change.users} users
                                                ({activityData.trends.change.usersPercent > 0 ? "+" : ""}{activityData.trends.change.usersPercent.toFixed(1)}%)
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: "16px",
                                        background: "rgba(79, 195, 247, 0.05)",
                                        borderRadius: "8px",
                                        border: "1px solid #e3f2fd"
                                    }}>
                                        <h4 style={{ margin: "0 0 8px 0", color: "#0277bd", fontSize: "14px" }}>
                                            📊 Overall Trend
                                        </h4>
                                        <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "8px" }}>
                                            <span style={{
                                                color: activityData.trends.trend === 'increasing' ? "#4caf50" :
                                                    activityData.trends.trend === 'decreasing' ? "#f44336" : "#ff9800",
                                                textTransform: "capitalize"
                                            }}>
                                                {activityData.trends.trend === 'increasing' ? "📈 Increasing" :
                                                    activityData.trends.trend === 'decreasing' ? "📉 Decreasing" : "📊 Stable"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                                            Server activity is {activityData.trends.trend}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Export Controls */}
                        <ExportControls
                            activityData={activityData}
                            guildName={guild?.name || "Unknown"}
                            timeRange={timeRange}
                            themeColors={themeColors}
                        />
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}
