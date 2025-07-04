/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

interface ActivityChartProps {
    data: any[];
    timeRange: string;
    themeColors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        textMuted: string;
    };
}

export function ActivityChart({ data, timeRange, themeColors }: ActivityChartProps) {
    const maxMessages = Math.max(...data.map(d => d.messages), 1);
    const maxUsers = Math.max(...data.map(d => d.users), 1);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (timeRange === "24h") {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const chartHeight = 300;
    const chartWidth = 600;
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    return (
        <div style={{ width: "100%", overflowX: "auto" }}>
            {/* Summary Stats */}
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                gap: "16px", 
                marginBottom: "24px" 
            }}>
                <div style={{
                    background: "rgba(79, 195, 247, 0.1)",
                    border: "1px solid #4fc3f7",
                    borderRadius: "8px",
                    padding: "16px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: themeColors.primary }}>
                        {data.reduce((sum, d) => sum + d.messages, 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: themeColors.textMuted }}>
                        Total Messages
                    </div>
                </div>
                
                <div style={{
                    background: "rgba(2, 119, 189, 0.1)",
                    border: "1px solid #0277bd",
                    borderRadius: "8px",
                    padding: "16px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: themeColors.secondary }}>
                        {Math.max(...data.map(d => d.users))}
                    </div>
                    <div style={{ fontSize: "12px", color: themeColors.textMuted }}>
                        Peak Users
                    </div>
                </div>
                
                <div style={{
                    background: "rgba(79, 195, 247, 0.1)",
                    border: "1px solid #4fc3f7",
                    borderRadius: "8px",
                    padding: "16px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: themeColors.primary }}>
                        {Math.round(data.reduce((sum, d) => sum + d.messages, 0) / data.length)}
                    </div>
                    <div style={{ fontSize: "12px", color: themeColors.textMuted }}>
                        Avg Messages/Day
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ 
                background: "white", 
                borderRadius: "8px", 
                padding: "20px",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
                <h4 style={{ 
                    margin: "0 0 16px 0", 
                    color: themeColors.text,
                    fontSize: "16px",
                    fontWeight: "600"
                }}>
                    Message Activity Over Time
                </h4>
                
                <svg width={chartWidth} height={chartHeight} style={{ overflow: "visible" }}>
                    {/* Background */}
                    <rect 
                        x={padding.left} 
                        y={padding.top} 
                        width={innerWidth} 
                        height={innerHeight}
                        fill="#fafafa"
                        stroke="#e0e0e0"
                    />
                    
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                        <g key={ratio}>
                            <line
                                x1={padding.left}
                                y1={padding.top + innerHeight * ratio}
                                x2={padding.left + innerWidth}
                                y2={padding.top + innerHeight * ratio}
                                stroke="#e0e0e0"
                                strokeDasharray="2,2"
                            />
                            <text
                                x={padding.left - 10}
                                y={padding.top + innerHeight * ratio + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill={themeColors.textMuted}
                            >
                                {Math.round(maxMessages * (1 - ratio))}
                            </text>
                        </g>
                    ))}
                    
                    {/* Bars */}
                    {data.map((item, index) => {
                        const barWidth = innerWidth / data.length * 0.8;
                        const barHeight = (item.messages / maxMessages) * innerHeight;
                        const x = padding.left + (index * innerWidth / data.length) + (innerWidth / data.length - barWidth) / 2;
                        const y = padding.top + innerHeight - barHeight;
                        
                        return (
                            <g key={index}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={`url(#gradient-${index})`}
                                    stroke={themeColors.primary}
                                    strokeWidth="1"
                                />
                                <defs>
                                    <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={themeColors.primary} stopOpacity="0.8" />
                                        <stop offset="100%" stopColor={themeColors.secondary} stopOpacity="0.6" />
                                    </linearGradient>
                                </defs>
                                
                                {/* Value label on top of bar */}
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 5}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill={themeColors.text}
                                    fontWeight="500"
                                >
                                    {item.messages}
                                </text>
                            </g>
                        );
                    })}
                    
                    {/* X-axis labels */}
                    {data.map((item, index) => {
                        const x = padding.left + (index * innerWidth / data.length) + (innerWidth / data.length) / 2;
                        const y = padding.top + innerHeight + 20;
                        
                        return (
                            <text
                                key={index}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                fontSize="10"
                                fill={themeColors.textMuted}
                                transform={`rotate(-45, ${x}, ${y})`}
                            >
                                {formatDate(item.date)}
                            </text>
                        );
                    })}
                    
                    {/* Axis labels */}
                    <text
                        x={padding.left / 2}
                        y={padding.top + innerHeight / 2}
                        textAnchor="middle"
                        fontSize="12"
                        fill={themeColors.text}
                        fontWeight="600"
                        transform={`rotate(-90, ${padding.left / 2}, ${padding.top + innerHeight / 2})`}
                    >
                        Messages
                    </text>
                    
                    <text
                        x={padding.left + innerWidth / 2}
                        y={chartHeight - 10}
                        textAnchor="middle"
                        fontSize="12"
                        fill={themeColors.text}
                        fontWeight="600"
                    >
                        Time Period
                    </text>
                </svg>
            </div>

            {/* Activity Heatmap */}
            <div style={{ 
                marginTop: "24px",
                background: "white", 
                borderRadius: "8px", 
                padding: "20px",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
                <h4 style={{ 
                    margin: "0 0 16px 0", 
                    color: themeColors.text,
                    fontSize: "16px",
                    fontWeight: "600"
                }}>
                    Activity Heatmap
                </h4>
                
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: `repeat(${Math.min(data.length, 7)}, 1fr)`, 
                    gap: "4px",
                    maxWidth: "400px"
                }}>
                    {data.slice(0, 7).map((item, index) => {
                        const intensity = item.messages / maxMessages;
                        const opacity = Math.max(0.1, intensity);
                        
                        return (
                            <div
                                key={index}
                                style={{
                                    aspectRatio: "1",
                                    background: themeColors.primary,
                                    opacity: opacity,
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    color: "white",
                                    fontWeight: "600",
                                    minHeight: "40px"
                                }}
                                title={`${formatDate(item.date)}: ${item.messages} messages`}
                            >
                                {item.messages}
                            </div>
                        );
                    })}
                </div>
                
                <div style={{ 
                    marginTop: "12px", 
                    fontSize: "11px", 
                    color: themeColors.textMuted 
                }}>
                    Darker squares indicate higher activity
                </div>
            </div>
        </div>
    );
}
