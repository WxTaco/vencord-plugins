/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms, Text, Tooltip, useEffect, useState } from "@webpack/common";

import { ActivityChart } from "./ActivityChart.js";
import { StatsCards } from "./StatsCards.js";
import { UserActivityList } from "./UserActivityList.js";

interface AnalyticsData {
    success: boolean;
    timeframe: string;
    data: {
        commandActivity: Array<{
            hour: string;
            command_name: string;
            count: number;
        }>;
        userActivity: Array<{
            user_id: string;
            activity_score: number;
        }>;
        moderationActivity: Array<{
            action: string;
            count: number;
            hour: string;
        }>;
        lastUpdated: string;
    };
}

interface AnalyticsModalProps extends ModalProps {
    guildId: string;
    timeframe: string;
    data: AnalyticsData;
    onRefresh: () => Promise<AnalyticsData | null>;
}

export function AnalyticsModal({ guildId, timeframe, data, onRefresh, ...props }: AnalyticsModalProps) {
    const [currentData, setCurrentData] = useState(data);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const newData = await onRefresh();
            if (newData) {
                setCurrentData(newData);
            }
        } catch (error) {
            console.error("Failed to refresh analytics:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const getTimeframeName = (tf: string) => {
        switch (tf) {
            case "1h": return "Last Hour";
            case "24h": return "Last 24 Hours";
            case "7d": return "Last 7 Days";
            default: return "Last 24 Hours";
        }
    };

    // Calculate summary stats
    const totalCommands = currentData.data.commandActivity.reduce((sum, item) => sum + item.count, 0);
    const totalModerationActions = currentData.data.moderationActivity.reduce((sum, item) => sum + item.count, 0);
    const activeUsers = currentData.data.userActivity.length;

    // Get top commands
    const commandCounts = currentData.data.commandActivity.reduce((acc, item) => {
        acc[item.command_name] = (acc[item.command_name] || 0) + item.count;
        return acc;
    }, {} as Record<string, number>);

    const topCommands = Object.entries(commandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ color: "#f8b4cb" }}>
                    🌸 Server Analytics
                </Text>
                <Text variant="text-sm/normal" style={{ color: "#b4b4b4", marginTop: "4px" }}>
                    {getTimeframeName(selectedTimeframe)} • Last updated: {new Date(currentData.data.lastUpdated).toLocaleTimeString()}
                </Text>
                <ModalCloseButton />
            </ModalHeader>

            <ModalContent style={{ padding: "16px", maxHeight: "70vh", overflowY: "auto" }}>
                {/* Header Controls */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    padding: "12px",
                    backgroundColor: "rgba(248, 180, 203, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(248, 180, 203, 0.2)"
                }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {["1h", "24h", "7d"].map(tf => (
                            <Button
                                key={tf}
                                size={Button.Sizes.SMALL}
                                color={selectedTimeframe === tf ? Button.Colors.BRAND : Button.Colors.SECONDARY}
                                onClick={() => setSelectedTimeframe(tf)}
                                style={{
                                    backgroundColor: selectedTimeframe === tf ? "#f8b4cb" : "transparent",
                                    color: selectedTimeframe === tf ? "#000" : "#f8b4cb",
                                    border: "1px solid #f8b4cb"
                                }}
                            >
                                {getTimeframeName(tf)}
                            </Button>
                        ))}
                    </div>

                    <Tooltip text="Refresh analytics data">
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.SECONDARY}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            style={{
                                backgroundColor: "transparent",
                                color: "#f8b4cb",
                                border: "1px solid #f8b4cb"
                            }}
                        >
                            {isRefreshing ? "🔄" : "↻"} Refresh
                        </Button>
                    </Tooltip>
                </div>

                {/* Stats Cards */}
                <StatsCards
                    totalCommands={totalCommands}
                    totalModerationActions={totalModerationActions}
                    activeUsers={activeUsers}
                    topCommands={topCommands}
                />

                {/* Activity Chart */}
                <div style={{ marginBottom: "20px" }}>
                    <Forms.FormTitle style={{ color: "#f8b4cb", marginBottom: "12px" }}>
                        📊 Activity Timeline
                    </Forms.FormTitle>
                    <ActivityChart
                        commandActivity={currentData.data.commandActivity}
                        moderationActivity={currentData.data.moderationActivity}
                        timeframe={selectedTimeframe}
                    />
                </div>

                {/* User Activity */}
                <div style={{ marginBottom: "20px" }}>
                    <Forms.FormTitle style={{ color: "#f8b4cb", marginBottom: "12px" }}>
                        👑 Most Active Users
                    </Forms.FormTitle>
                    <UserActivityList
                        userActivity={currentData.data.userActivity}
                        guildId={guildId}
                    />
                </div>

                {/* Top Commands */}
                <div>
                    <Forms.FormTitle style={{ color: "#f8b4cb", marginBottom: "12px" }}>
                        🔥 Popular Commands
                    </Forms.FormTitle>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px"
                    }}>
                        {topCommands.map(([command, count], index) => (
                            <div
                                key={command}
                                style={{
                                    padding: "12px",
                                    backgroundColor: "rgba(248, 180, 203, 0.1)",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(248, 180, 203, 0.2)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div>
                                    <Text variant="text-sm/semibold" style={{ color: "#f8b4cb" }}>
                                        #{index + 1} /{command}
                                    </Text>
                                </div>
                                <Text variant="text-sm/normal" style={{ color: "#b4b4b4" }}>
                                    {count} uses
                                </Text>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "rgba(248, 180, 203, 0.05)",
                    borderRadius: "8px",
                    textAlign: "center"
                }}>
                    <Text variant="text-xs/normal" style={{ color: "#888" }}>
                        Analytics powered by your bot's API • Data refreshes automatically every 30 seconds
                    </Text>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
