/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text } from "@webpack/common";

interface ActivityChartProps {
    commandActivity: Array<{
        hour: string;
        command_name: string;
        count: number;
    }>;
    moderationActivity: Array<{
        action: string;
        count: number;
        hour: string;
    }>;
    timeframe: string;
}

export function ActivityChart({ commandActivity, moderationActivity, timeframe }: ActivityChartProps) {
    // Group activity by hour
    const hourlyData = new Map<string, { commands: number; moderation: number }>();
    
    // Process command activity
    commandActivity.forEach(item => {
        const hour = new Date(item.hour).toISOString();
        const existing = hourlyData.get(hour) || { commands: 0, moderation: 0 };
        existing.commands += item.count;
        hourlyData.set(hour, existing);
    });
    
    // Process moderation activity
    moderationActivity.forEach(item => {
        const hour = new Date(item.hour).toISOString();
        const existing = hourlyData.get(hour) || { commands: 0, moderation: 0 };
        existing.moderation += item.count;
        hourlyData.set(hour, existing);
    });
    
    // Sort by time and get recent hours
    const sortedData = Array.from(hourlyData.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-24); // Last 24 hours max
    
    if (sortedData.length === 0) {
        return (
            <div style={{
                padding: "40px",
                textAlign: "center",
                backgroundColor: "rgba(248, 180, 203, 0.05)",
                borderRadius: "8px",
                border: "1px solid rgba(248, 180, 203, 0.1)"
            }}>
                <Text variant="text-md/normal" style={{ color: "#888" }}>
                    No activity data available for the selected timeframe
                </Text>
            </div>
        );
    }
    
    // Find max values for scaling
    const maxCommands = Math.max(...sortedData.map(([, data]) => data.commands));
    const maxModeration = Math.max(...sortedData.map(([, data]) => data.moderation));
    const maxValue = Math.max(maxCommands, maxModeration, 1);
    
    return (
        <div style={{
            padding: "16px",
            backgroundColor: "rgba(248, 180, 203, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(248, 180, 203, 0.1)"
        }}>
            {/* Chart Legend */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginBottom: "16px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: "#f8b4cb",
                        borderRadius: "2px"
                    }} />
                    <Text variant="text-xs/normal" style={{ color: "#b4b4b4" }}>
                        Commands
                    </Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: "#ff6b6b",
                        borderRadius: "2px"
                    }} />
                    <Text variant="text-xs/normal" style={{ color: "#b4b4b4" }}>
                        Moderation
                    </Text>
                </div>
            </div>
            
            {/* Chart Bars */}
            <div style={{
                display: "flex",
                alignItems: "end",
                gap: "4px",
                height: "120px",
                padding: "0 8px"
            }}>
                {sortedData.map(([hour, data], index) => {
                    const commandHeight = maxValue > 0 ? (data.commands / maxValue) * 100 : 0;
                    const moderationHeight = maxValue > 0 ? (data.moderation / maxValue) * 100 : 0;
                    const time = new Date(hour);
                    
                    return (
                        <div
                            key={hour}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: 1,
                                minWidth: "20px"
                            }}
                            title={`${time.toLocaleTimeString()}\nCommands: ${data.commands}\nModeration: ${data.moderation}`}
                        >
                            {/* Bars */}
                            <div style={{
                                display: "flex",
                                alignItems: "end",
                                gap: "1px",
                                height: "100px",
                                marginBottom: "4px"
                            }}>
                                {/* Command bar */}
                                <div style={{
                                    width: "8px",
                                    height: `${commandHeight}%`,
                                    backgroundColor: "#f8b4cb",
                                    borderRadius: "2px 2px 0 0",
                                    minHeight: data.commands > 0 ? "2px" : "0"
                                }} />
                                
                                {/* Moderation bar */}
                                <div style={{
                                    width: "8px",
                                    height: `${moderationHeight}%`,
                                    backgroundColor: "#ff6b6b",
                                    borderRadius: "2px 2px 0 0",
                                    minHeight: data.moderation > 0 ? "2px" : "0"
                                }} />
                            </div>
                            
                            {/* Time label (show every few hours) */}
                            {index % Math.max(1, Math.floor(sortedData.length / 6)) === 0 && (
                                <Text variant="text-xs/normal" style={{ 
                                    color: "#666",
                                    fontSize: "10px",
                                    transform: "rotate(-45deg)",
                                    transformOrigin: "center",
                                    whiteSpace: "nowrap"
                                }}>
                                    {timeframe === "1h" 
                                        ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : time.toLocaleDateString([], { month: 'short', day: 'numeric' })
                                    }
                                </Text>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Summary */}
            <div style={{
                marginTop: "12px",
                textAlign: "center"
            }}>
                <Text variant="text-xs/normal" style={{ color: "#888" }}>
                    Total: {sortedData.reduce((sum, [, data]) => sum + data.commands + data.moderation, 0)} events
                </Text>
            </div>
        </div>
    );
}
