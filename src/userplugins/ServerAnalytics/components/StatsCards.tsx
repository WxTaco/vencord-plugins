/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text } from "@webpack/common";

interface StatsCardsProps {
    totalCommands: number;
    totalModerationActions: number;
    activeUsers: number;
    topCommands: Array<[string, number]>;
}

export function StatsCards({ totalCommands, totalModerationActions, activeUsers, topCommands }: StatsCardsProps) {
    const cards = [
        {
            title: "Total Commands",
            value: totalCommands.toLocaleString(),
            icon: "⚡",
            color: "#f8b4cb"
        },
        {
            title: "Moderation Actions",
            value: totalModerationActions.toLocaleString(),
            icon: "🛡️",
            color: "#ff6b6b"
        },
        {
            title: "Active Users",
            value: activeUsers.toLocaleString(),
            icon: "👥",
            color: "#4ecdc4"
        },
        {
            title: "Top Command",
            value: topCommands[0] ? `/${topCommands[0][0]}` : "None",
            icon: "🏆",
            color: "#ffd93d"
        }
    ];

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
        }}>
            {cards.map((card, index) => (
                <div
                    key={index}
                    style={{
                        padding: "16px",
                        backgroundColor: "rgba(248, 180, 203, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(248, 180, 203, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                        cursor: "default"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(248, 180, 203, 0.15)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(248, 180, 203, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(248, 180, 203, 0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                >
                    <div style={{
                        fontSize: "24px",
                        marginBottom: "8px"
                    }}>
                        {card.icon}
                    </div>
                    
                    <Text variant="heading-lg/bold" style={{ 
                        color: card.color,
                        marginBottom: "4px",
                        fontSize: "20px"
                    }}>
                        {card.value}
                    </Text>
                    
                    <Text variant="text-sm/normal" style={{ 
                        color: "#b4b4b4",
                        fontSize: "12px"
                    }}>
                        {card.title}
                    </Text>
                </div>
            ))}
        </div>
    );
}
