/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { settings } from "../settings";

export interface MessageEvent {
    guildId: string;
    channelId: string;
    userId: string;
    username: string;
    timestamp: number;
    content: string;
    hasAttachment: boolean;
    hasEmbed: boolean;
    mentionsEveryone: boolean;
    mentionsHere: boolean;
    roleMentions: string[];
    userMentions: any[];
}

export interface JoinLeaveEvent {
    guildId: string;
    userId: string;
    username: string;
    type: 'join' | 'leave';
    timestamp: number;
}

export interface ActivityData {
    messages: MessageEvent[];
    joinLeave: JoinLeaveEvent[];
    hourlyStats: { [hour: string]: number; };
    dailyStats: { [date: string]: number; };
    channelStats: { [channelId: string]: number; };
    userStats: { [userId: string]: number; };
    pingStats: {
        everyone: number;
        here: number;
        roles: { [roleId: string]: number; };
    };
    lastSaved: number;
}

export class ActivityTracker {
    private data: { [guildId: string]: ActivityData; } = {};
    private saveTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.loadData();
        this.startAutoSave();
    }

    async loadData() {
        try {
            const savedData = await DataStore.get("ServerActivityGrapher_data");
            if (savedData) {
                this.data = savedData;
                console.log("ServerActivityGrapher: Loaded existing data");
            }
        } catch (error) {
            console.error("ServerActivityGrapher: Failed to load data:", error);
        }
    }

    async saveData() {
        try {
            // Clean old data if maxDataDays is set
            const maxDays = settings.store.maxDataDays;
            if (maxDays > 0) {
                this.cleanOldData(maxDays);
            }

            await DataStore.set("ServerActivityGrapher_data", this.data);

            // Update last saved timestamp for all guilds
            Object.keys(this.data).forEach(guildId => {
                this.data[guildId].lastSaved = Date.now();
            });

            console.log("ServerActivityGrapher: Data saved successfully");
        } catch (error) {
            console.error("ServerActivityGrapher: Failed to save data:", error);
        }
    }

    private cleanOldData(maxDays: number) {
        const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000);

        Object.keys(this.data).forEach(guildId => {
            const guildData = this.data[guildId];

            // Clean messages
            guildData.messages = guildData.messages.filter(msg => msg.timestamp > cutoffTime);

            // Clean join/leave events
            guildData.joinLeave = guildData.joinLeave.filter(event => event.timestamp > cutoffTime);

            // Clean daily stats
            Object.keys(guildData.dailyStats).forEach(date => {
                const dateTime = new Date(date).getTime();
                if (dateTime < cutoffTime) {
                    delete guildData.dailyStats[date];
                }
            });
        });
    }

    private startAutoSave() {
        const interval = settings.store.autoSaveInterval * 60 * 1000; // Convert to milliseconds

        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }

        this.saveTimer = setInterval(() => {
            this.saveData();
        }, interval);
    }

    private ensureGuildData(guildId: string) {
        if (!this.data[guildId]) {
            this.data[guildId] = {
                messages: [],
                joinLeave: [],
                hourlyStats: {},
                dailyStats: {},
                channelStats: {},
                userStats: {},
                pingStats: {
                    everyone: 0,
                    here: 0,
                    roles: {}
                },
                lastSaved: Date.now()
            };
        }
    }

    trackMessage(message: MessageEvent) {
        // Skip bot messages if disabled
        if (!settings.store.trackBotMessages && message.userId.endsWith('bot')) {
            return;
        }

        this.ensureGuildData(message.guildId);
        const guildData = this.data[message.guildId];

        // Add to messages array
        guildData.messages.push(message);

        // Update hourly stats
        const hour = new Date(message.timestamp).getHours();
        const hourKey = `${hour}`;
        guildData.hourlyStats[hourKey] = (guildData.hourlyStats[hourKey] || 0) + 1;

        // Update daily stats
        const date = new Date(message.timestamp).toISOString().split('T')[0];
        guildData.dailyStats[date] = (guildData.dailyStats[date] || 0) + 1;

        // Update channel stats
        guildData.channelStats[message.channelId] = (guildData.channelStats[message.channelId] || 0) + 1;

        // Update user stats
        guildData.userStats[message.userId] = (guildData.userStats[message.userId] || 0) + 1;

        // Track pings if enabled
        if (settings.store.enablePingTracking) {
            if (message.mentionsEveryone) {
                guildData.pingStats.everyone++;
            }
            if (message.mentionsHere) {
                guildData.pingStats.here++;
            }
            message.roleMentions.forEach(roleId => {
                guildData.pingStats.roles[roleId] = (guildData.pingStats.roles[roleId] || 0) + 1;
            });
        }

        // Keep only recent messages in memory (last 1000 per guild)
        if (guildData.messages.length > 1000) {
            guildData.messages = guildData.messages.slice(-1000);
        }
    }

    trackJoinLeave(event: JoinLeaveEvent) {
        this.ensureGuildData(event.guildId);
        const guildData = this.data[event.guildId];

        guildData.joinLeave.push(event);

        // Keep only recent join/leave events (last 500 per guild)
        if (guildData.joinLeave.length > 500) {
            guildData.joinLeave = guildData.joinLeave.slice(-500);
        }
    }

    getGuildData(guildId: string): ActivityData | null {
        return this.data[guildId] || null;
    }

    getHourlyActivity(guildId: string, days: number = 7): { [hour: string]: number; } {
        const guildData = this.data[guildId];
        if (!guildData) return {};

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const hourlyData: { [hour: string]: number; } = {};

        // Initialize all hours
        for (let i = 0; i < 24; i++) {
            hourlyData[i.toString()] = 0;
        }

        // Count messages in time range
        guildData.messages
            .filter(msg => msg.timestamp > cutoffTime)
            .forEach(msg => {
                const hour = new Date(msg.timestamp).getHours();
                hourlyData[hour.toString()]++;
            });

        return hourlyData;
    }

    getDailyActivity(guildId: string, days: number = 30): { [date: string]: number; } {
        const guildData = this.data[guildId];
        if (!guildData) return {};

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const dailyData: { [date: string]: number; } = {};

        // Count messages in time range
        guildData.messages
            .filter(msg => msg.timestamp > cutoffTime)
            .forEach(msg => {
                const date = new Date(msg.timestamp).toISOString().split('T')[0];
                dailyData[date] = (dailyData[date] || 0) + 1;
            });

        return dailyData;
    }

    getChannelActivity(guildId: string, days: number = 7): { [channelId: string]: number; } {
        const guildData = this.data[guildId];
        if (!guildData) return {};

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const channelData: { [channelId: string]: number; } = {};

        guildData.messages
            .filter(msg => msg.timestamp > cutoffTime)
            .forEach(msg => {
                channelData[msg.channelId] = (channelData[msg.channelId] || 0) + 1;
            });

        return channelData;
    }

    getTopUsers(guildId: string, days: number = 7, limit: number = 10): Array<{ userId: string; username: string; count: number; }> {
        const guildData = this.data[guildId];
        if (!guildData) return [];

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const userCounts: { [userId: string]: { username: string; count: number; }; } = {};

        guildData.messages
            .filter(msg => msg.timestamp > cutoffTime)
            .forEach(msg => {
                if (!userCounts[msg.userId]) {
                    userCounts[msg.userId] = { username: msg.username, count: 0 };
                }
                userCounts[msg.userId].count++;
            });

        return Object.entries(userCounts)
            .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    getPingStats(guildId: string, days: number = 7) {
        const guildData = this.data[guildId];
        if (!guildData) return { everyone: 0, here: 0, roles: {} };

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const pingStats = { everyone: 0, here: 0, roles: {} as { [roleId: string]: number; } };

        guildData.messages
            .filter(msg => msg.timestamp > cutoffTime)
            .forEach(msg => {
                if (msg.mentionsEveryone) pingStats.everyone++;
                if (msg.mentionsHere) pingStats.here++;
                msg.roleMentions.forEach(roleId => {
                    pingStats.roles[roleId] = (pingStats.roles[roleId] || 0) + 1;
                });
            });

        return pingStats;
    }

    getJoinLeaveStats(guildId: string, days: number = 7) {
        const guildData = this.data[guildId];
        if (!guildData) return { joins: 0, leaves: 0, net: 0 };

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        let joins = 0;
        let leaves = 0;

        guildData.joinLeave
            .filter(event => event.timestamp > cutoffTime)
            .forEach(event => {
                if (event.type === 'join') joins++;
                else leaves++;
            });

        return { joins, leaves, net: joins - leaves };
    }

    getSummaryStats(guildId: string, days: number = 7) {
        const guildData = this.data[guildId];
        if (!guildData) return null;

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recentMessages = guildData.messages.filter(msg => msg.timestamp > cutoffTime);

        // Find most active hour
        const hourCounts: { [hour: string]: number; } = {};
        recentMessages.forEach(msg => {
            const hour = new Date(msg.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const mostActiveHour = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)[0];

        // Find most active day
        const dayCounts: { [date: string]: number; } = {};
        recentMessages.forEach(msg => {
            const date = new Date(msg.timestamp).toISOString().split('T')[0];
            dayCounts[date] = (dayCounts[date] || 0) + 1;
        });

        const mostActiveDay = Object.entries(dayCounts)
            .sort(([, a], [, b]) => b - a)[0];

        return {
            totalMessages: recentMessages.length,
            uniqueUsers: new Set(recentMessages.map(msg => msg.userId)).size,
            mostActiveHour: mostActiveHour ? { hour: parseInt(mostActiveHour[0]), count: mostActiveHour[1] } : null,
            mostActiveDay: mostActiveDay ? { date: mostActiveDay[0], count: mostActiveDay[1] } : null,
            averagePerDay: recentMessages.length / days,
            messagesWithAttachments: recentMessages.filter(msg => msg.hasAttachment).length,
            messagesWithEmbeds: recentMessages.filter(msg => msg.hasEmbed).length
        };
    }

    // Enhanced analytics methods
    getTrendAnalysis(guildId: string, days: number = 7) {
        const guildData = this.data[guildId];
        if (!guildData) return null;

        const now = Date.now();
        const currentPeriodStart = now - (days * 24 * 60 * 60 * 1000);
        const previousPeriodStart = currentPeriodStart - (days * 24 * 60 * 60 * 1000);

        const currentMessages = guildData.messages.filter(msg =>
            msg.timestamp >= currentPeriodStart && msg.timestamp <= now
        );
        const previousMessages = guildData.messages.filter(msg =>
            msg.timestamp >= previousPeriodStart && msg.timestamp < currentPeriodStart
        );

        const currentCount = currentMessages.length;
        const previousCount = previousMessages.length;

        const change = currentCount - previousCount;
        const percentChange = previousCount > 0 ? ((change / previousCount) * 100) : 0;

        const currentUsers = new Set(currentMessages.map(msg => msg.userId)).size;
        const previousUsers = new Set(previousMessages.map(msg => msg.userId)).size;
        const userChange = currentUsers - previousUsers;
        const userPercentChange = previousUsers > 0 ? ((userChange / previousUsers) * 100) : 0;

        return {
            current: {
                messages: currentCount,
                users: currentUsers,
                averagePerDay: currentCount / days
            },
            previous: {
                messages: previousCount,
                users: previousUsers,
                averagePerDay: previousCount / days
            },
            change: {
                messages: change,
                messagesPercent: percentChange,
                users: userChange,
                usersPercent: userPercentChange
            },
            trend: percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable'
        };
    }

    getActivityPatterns(guildId: string, days: number = 30) {
        const guildData = this.data[guildId];
        if (!guildData) return null;

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const messages = guildData.messages.filter(msg => msg.timestamp > cutoffTime);

        // Day of week patterns
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
        messages.forEach(msg => {
            const dayOfWeek = new Date(msg.timestamp).getDay();
            dayOfWeekCounts[dayOfWeek]++;
        });

        // Hour patterns
        const hourCounts = Array(24).fill(0);
        messages.forEach(msg => {
            const hour = new Date(msg.timestamp).getHours();
            hourCounts[hour]++;
        });

        // Find peak and quiet periods
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        const quietHour = hourCounts.indexOf(Math.min(...hourCounts.filter(count => count > 0)));

        const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
        const quietDay = dayOfWeekCounts.indexOf(Math.min(...dayOfWeekCounts.filter(count => count > 0)));

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            hourlyPattern: hourCounts,
            dailyPattern: dayOfWeekCounts,
            peaks: {
                hour: { time: peakHour, count: hourCounts[peakHour] },
                day: { name: dayNames[peakDay], count: dayOfWeekCounts[peakDay] }
            },
            quiet: {
                hour: { time: quietHour, count: hourCounts[quietHour] },
                day: { name: dayNames[quietDay], count: dayOfWeekCounts[quietDay] }
            },
            consistency: {
                hourlyVariance: this.calculateVariance(hourCounts),
                dailyVariance: this.calculateVariance(dayOfWeekCounts)
            }
        };
    }

    getGrowthMetrics(guildId: string, days: number = 30) {
        const joinLeaveStats = this.getJoinLeaveStats(guildId, days);
        const currentActivity = this.getSummaryStats(guildId, 7);
        const previousActivity = this.getSummaryStats(guildId, 14);

        if (!currentActivity || !previousActivity) return null;

        const messageGrowthRate = previousActivity.totalMessages > 0
            ? ((currentActivity.totalMessages - (previousActivity.totalMessages / 2)) / (previousActivity.totalMessages / 2)) * 100
            : 0;

        const userGrowthRate = previousActivity.uniqueUsers > 0
            ? ((currentActivity.uniqueUsers - (previousActivity.uniqueUsers / 2)) / (previousActivity.uniqueUsers / 2)) * 100
            : 0;

        return {
            memberGrowth: {
                joins: joinLeaveStats.joins,
                leaves: joinLeaveStats.leaves,
                net: joinLeaveStats.net,
                retentionRate: joinLeaveStats.joins > 0 ? ((joinLeaveStats.joins - joinLeaveStats.leaves) / joinLeaveStats.joins) * 100 : 0
            },
            activityGrowth: {
                messageGrowthRate,
                userGrowthRate,
                engagementTrend: messageGrowthRate > userGrowthRate ? 'increasing' : 'stable'
            },
            projections: {
                messagesNextWeek: Math.round(currentActivity.averagePerDay * 7 * (1 + messageGrowthRate / 100)),
                potentialNewUsers: Math.round(joinLeaveStats.joins * (7 / days))
            }
        };
    }

    private calculateVariance(data: number[]): number {
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    }

    // Enhanced heatmap data with better precision
    getEnhancedHeatmapData(guildId: string, days: number = 7) {
        const guildData = this.data[guildId];
        if (!guildData) return [];

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const messages = guildData.messages.filter(msg => msg.timestamp > cutoffTime);

        // Create precise hour-by-day tracking
        const heatmapData: Array<{ day: string; hour: number; value: number; date: string; dayIndex: number; }> = [];

        for (let d = days - 1; d >= 0; d--) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            date.setHours(0, 0, 0, 0);

            const dateString = date.toISOString().split('T')[0];
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

            for (let hour = 0; hour < 24; hour++) {
                const hourStart = new Date(date);
                hourStart.setHours(hour);
                const hourEnd = new Date(date);
                hourEnd.setHours(hour + 1);

                const hourMessages = messages.filter(msg => {
                    const msgDate = new Date(msg.timestamp);
                    return msgDate >= hourStart && msgDate < hourEnd;
                });

                heatmapData.push({
                    day: dayName,
                    hour,
                    value: hourMessages.length,
                    date: dateString,
                    dayIndex: date.getDay()
                });
            }
        }

        return heatmapData;
    }
}
