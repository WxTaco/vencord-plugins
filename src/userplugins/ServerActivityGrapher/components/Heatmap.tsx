/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState, useEffect } from "@webpack/common";
import { ActivityTracker } from "../utils/activityTracker";
import { formatHour, getWeekdayName, getHeatmapData } from "../utils/timeUtils";

interface HeatmapProps {
    guildId: string;
    activityTracker: ActivityTracker;
    days: number;
    themeColors: {
        primary: string;
        secondary: string;
        gradient: string;
    };
}

export function Heatmap({ guildId, activityTracker, days, themeColors }: HeatmapProps) {
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [hoveredCell, setHoveredCell] = useState<any>(null);

    useEffect(() => {
        loadHeatmapData();
    }, [guildId, days]);

    const loadHeatmapData = () => {
        // Use enhanced heatmap data for better precision
        const data = activityTracker.getEnhancedHeatmapData(guildId, days);
        setHeatmapData(data);
    };

    const getIntensityColor = (value: number, maxValue: number) => {
        if (value === 0) return '#f3f4f6';

        const intensity = Math.min(value / maxValue, 1);

        // Create color based on theme
        const baseColor = themeColors.primary;
        const rgb = hexToRgb(baseColor);

        if (rgb) {
            const alpha = 0.2 + (intensity * 0.8); // Range from 0.2 to 1.0
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        }

        return `rgba(41, 182, 246, ${0.2 + intensity * 0.8})`; // Fallback blue
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Group data by day
    const groupedData: { [day: string]: any[]; } = {};
    heatmapData.forEach(item => {
        if (!groupedData[item.day]) {
            groupedData[item.day] = [];
        }
        groupedData[item.day].push(item);
    });

    // Get max value for color scaling
    const maxValue = Math.max(...heatmapData.map(item => item.value), 1);

    // Days of week in order
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Hours array
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div>
            <h3 style={{
                margin: "0 0 20px 0",
                color: "#0277bd",
                fontSize: "18px",
                fontWeight: "600",
                textAlign: "center"
            }}>
                Activity Heatmap - Last {days} Days
            </h3>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "16px",
                background: "#fafafa",
                borderRadius: "8px",
                border: "1px solid #e0e0e0"
            }}>
                {/* Hour labels */}
                <div style={{ display: "flex", gap: "2px", marginLeft: "40px" }}>
                    {hours.filter((_, i) => i % 4 === 0).map(hour => (
                        <div key={hour} style={{
                            width: "60px", // 4 cells * 15px each
                            fontSize: "10px",
                            color: "#666",
                            textAlign: "center"
                        }}>
                            {formatHour(hour)}
                        </div>
                    ))}
                </div>

                {/* Heatmap grid */}
                {daysOfWeek.map(day => {
                    const dayData = groupedData[day] || [];

                    return (
                        <div key={day} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {/* Day label */}
                            <div style={{
                                width: "32px",
                                fontSize: "11px",
                                color: "#666",
                                fontWeight: "500",
                                textAlign: "right"
                            }}>
                                {day}
                            </div>

                            {/* Hour cells */}
                            <div style={{ display: "flex", gap: "2px" }}>
                                {hours.map(hour => {
                                    const cellData = dayData.find(item => item.hour === hour);
                                    const value = cellData?.value || 0;
                                    const color = getIntensityColor(value, maxValue);

                                    return (
                                        <div
                                            key={hour}
                                            style={{
                                                width: "15px",
                                                height: "15px",
                                                backgroundColor: color,
                                                border: "1px solid #e0e0e0",
                                                borderRadius: "2px",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={() => setHoveredCell({
                                                day,
                                                hour,
                                                value,
                                                date: cellData?.date
                                            })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            title={`${day} ${formatHour(hour)}: ${value} messages`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Legend */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "16px",
                    fontSize: "11px",
                    color: "#666"
                }}>
                    <span>Less</span>
                    <div style={{ display: "flex", gap: "2px" }}>
                        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, i) => (
                            <div
                                key={i}
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    backgroundColor: intensity === 0 ? '#f3f4f6' : getIntensityColor(intensity * maxValue, maxValue),
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "2px"
                                }}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>

                {/* Hover tooltip */}
                {hoveredCell && (
                    <div style={{
                        position: "absolute",
                        background: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        pointerEvents: "none",
                        zIndex: 1000,
                        marginTop: "-40px",
                        marginLeft: "50px"
                    }}>
                        <div style={{ fontWeight: "600" }}>
                            {hoveredCell.day} {formatHour(hoveredCell.hour)}
                        </div>
                        <div>
                            {hoveredCell.value} messages
                        </div>
                        {hoveredCell.date && (
                            <div style={{ fontSize: "10px", opacity: 0.8 }}>
                                {new Date(hoveredCell.date).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Activity insights */}
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
                    Activity Insights
                </h4>
                <div style={{ fontSize: "12px", color: "#01579b", lineHeight: "1.4" }}>
                    {maxValue > 0 ? (
                        <>
                            <div>Peak activity: {maxValue} messages in a single hour</div>
                            <div>Darker squares indicate higher message volume</div>
                            <div>Hover over squares to see detailed information</div>
                        </>
                    ) : (
                        <div>No activity data available for the selected time range</div>
                    )}
                </div>
            </div>
        </div>
    );
}
