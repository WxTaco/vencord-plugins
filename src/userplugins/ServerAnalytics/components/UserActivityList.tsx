/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, UserStore } from "@webpack/common";

interface UserActivityListProps {
    userActivity: Array<{
        user_id: string;
        activity_score: number;
    }>;
    guildId: string;
}

export function UserActivityList({ userActivity, guildId }: UserActivityListProps) {
    if (userActivity.length === 0) {
        return (
            <div style={{
                padding: "20px",
                textAlign: "center",
                backgroundColor: "rgba(248, 180, 203, 0.05)",
                borderRadius: "8px",
                border: "1px solid rgba(248, 180, 203, 0.1)"
            }}>
                <Text variant="text-md/normal" style={{ color: "#888" }}>
                    No user activity data available
                </Text>
            </div>
        );
    }

    const getRankEmoji = (index: number) => {
        switch (index) {
            case 0: return "🥇";
            case 1: return "🥈";
            case 2: return "🥉";
            default: return "🏅";
        }
    };

    const getActivityLevel = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return { level: "Very High", color: "#ff6b6b" };
        if (percentage >= 60) return { level: "High", color: "#ffd93d" };
        if (percentage >= 40) return { level: "Medium", color: "#4ecdc4" };
        if (percentage >= 20) return { level: "Low", color: "#95a5a6" };
        return { level: "Very Low", color: "#7f8c8d" };
    };

    const maxScore = Math.max(...userActivity.map(u => u.activity_score));

    return (
        <div style={{
            backgroundColor: "rgba(248, 180, 203, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(248, 180, 203, 0.1)",
            overflow: "hidden"
        }}>
            {userActivity.slice(0, 10).map((user, index) => {
                const discordUser = UserStore.getUser(user.user_id);
                const activityInfo = getActivityLevel(user.activity_score, maxScore);
                const percentage = maxScore > 0 ? (user.activity_score / maxScore) * 100 : 0;

                return (
                    <div
                        key={user.user_id}
                        style={{
                            padding: "12px 16px",
                            borderBottom: index < userActivity.length - 1 ? "1px solid rgba(248, 180, 203, 0.1)" : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(248, 180, 203, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        {/* Rank */}
                        <div style={{
                            fontSize: "18px",
                            minWidth: "24px",
                            textAlign: "center"
                        }}>
                            {getRankEmoji(index)}
                        </div>

                        {/* User Avatar */}
                        <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#36393f",
                            backgroundImage: discordUser?.avatar 
                                ? `url(https://cdn.discordapp.com/avatars/${user.user_id}/${discordUser.avatar}.png?size=64)`
                                : `url(https://cdn.discordapp.com/embed/avatars/${parseInt(user.user_id) % 5}.png)`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            border: "2px solid #f8b4cb",
                            flexShrink: 0
                        }} />

                        {/* User Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                <Text variant="text-sm/semibold" style={{ 
                                    color: "#f8b4cb",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}>
                                    {discordUser?.globalName || discordUser?.username || "Unknown User"}
                                </Text>
                                
                                <Text variant="text-xs/normal" style={{ 
                                    color: "#888",
                                    fontSize: "10px"
                                }}>
                                    #{index + 1}
                                </Text>
                            </div>

                            {discordUser?.username && discordUser.globalName && (
                                <Text variant="text-xs/normal" style={{ 
                                    color: "#666",
                                    fontSize: "10px"
                                }}>
                                    @{discordUser.username}
                                </Text>
                            )}
                        </div>

                        {/* Activity Score */}
                        <div style={{ 
                            textAlign: "right",
                            minWidth: "80px"
                        }}>
                            <Text variant="text-sm/bold" style={{ 
                                color: activityInfo.color,
                                display: "block"
                            }}>
                                {user.activity_score.toLocaleString()}
                            </Text>
                            
                            <Text variant="text-xs/normal" style={{ 
                                color: "#888",
                                fontSize: "10px"
                            }}>
                                {activityInfo.level}
                            </Text>
                        </div>

                        {/* Activity Bar */}
                        <div style={{
                            width: "60px",
                            height: "6px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: "3px",
                            overflow: "hidden",
                            flexShrink: 0
                        }}>
                            <div style={{
                                width: `${percentage}%`,
                                height: "100%",
                                backgroundColor: activityInfo.color,
                                borderRadius: "3px",
                                transition: "width 0.3s ease"
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
