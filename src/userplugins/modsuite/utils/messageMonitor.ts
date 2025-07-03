/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";

import { detectPingsInMessage, PingTracker } from "../components/PingMonitor";
import { UserMessageTracker } from "../components/UserTracker";
import { settings } from "../settings";

/**
 * Message monitor that integrates with ping tracking and user tracking
 */
export class MessageMonitor {
    private static instance: MessageMonitor;
    private isListening = false;
    private pingTracker: PingTracker;
    private userTracker: UserMessageTracker;

    private constructor() {
        this.pingTracker = PingTracker.getInstance();
        this.userTracker = UserMessageTracker.getInstance();
    }

    static getInstance(): MessageMonitor {
        if (!MessageMonitor.instance) {
            MessageMonitor.instance = new MessageMonitor();
        }
        return MessageMonitor.instance;
    }

    start(): void {
        if (this.isListening) return;

        this.isListening = true;
        
        // Listen for new messages
        FluxDispatcher.subscribe('MESSAGE_CREATE', this.handleMessageCreate);
        
        // Listen for message updates (edits)
        FluxDispatcher.subscribe('MESSAGE_UPDATE', this.handleMessageUpdate);
        
        // Listen for message deletions
        FluxDispatcher.subscribe('MESSAGE_DELETE', this.handleMessageDelete);
        FluxDispatcher.subscribe('MESSAGE_DELETE_BULK', this.handleMessageDeleteBulk);
    }

    stop(): void {
        if (!this.isListening) return;

        this.isListening = false;
        
        FluxDispatcher.unsubscribe('MESSAGE_CREATE', this.handleMessageCreate);
        FluxDispatcher.unsubscribe('MESSAGE_UPDATE', this.handleMessageUpdate);
        FluxDispatcher.unsubscribe('MESSAGE_DELETE', this.handleMessageDelete);
        FluxDispatcher.unsubscribe('MESSAGE_DELETE_BULK', this.handleMessageDeleteBulk);
    }

    private handleMessageCreate = (data: { message: Message }) => {
        const { message } = data;
        if (!message || !message.author) return;

        // Skip bot messages unless specifically enabled
        if (message.author.bot && !settings.store.trackBotMessages) return;

        // Track user message
        if (settings.store.enableUserTracking) {
            this.userTracker.trackMessage(
                message.author.id,
                message.author.username,
                {
                    id: message.id,
                    channelId: message.channel_id,
                    content: message.content || '',
                    edited: false,
                    deleted: false
                }
            );
        }

        // Track pings
        if (settings.store.enablePingMonitor) {
            const pings = detectPingsInMessage(message.content || '', message.mentions || []);
            
            pings.forEach(ping => {
                this.pingTracker.trackPing(
                    message.author.id,
                    message.author.username,
                    {
                        ...ping,
                        channelId: message.channel_id,
                        messageId: message.id
                    }
                );
            });
        }
    };

    private handleMessageUpdate = (data: { message: Message }) => {
        const { message } = data;
        if (!message || !message.author) return;

        // Update tracked message if user tracking is enabled
        if (settings.store.enableUserTracking) {
            this.userTracker.markMessageEdited(message.id, message.content || '');
        }

        // Re-track pings in edited message
        if (settings.store.enablePingMonitor) {
            const pings = detectPingsInMessage(message.content || '', message.mentions || []);
            
            pings.forEach(ping => {
                this.pingTracker.trackPing(
                    message.author.id,
                    message.author.username,
                    {
                        ...ping,
                        channelId: message.channel_id,
                        messageId: message.id
                    }
                );
            });
        }
    };

    private handleMessageDelete = (data: { id: string; channelId: string }) => {
        const { id } = data;
        
        // Mark message as deleted in user tracking
        if (settings.store.enableUserTracking) {
            this.userTracker.markMessageDeleted(id);
        }
    };

    private handleMessageDeleteBulk = (data: { ids: string[]; channelId: string }) => {
        const { ids } = data;
        
        // Mark messages as deleted in user tracking
        if (settings.store.enableUserTracking) {
            ids.forEach(id => {
                this.userTracker.markMessageDeleted(id);
            });
        }
    };

    // Utility methods for external use
    getTrackedUserData(userId: string) {
        return this.userTracker.getUserData(userId);
    }

    getPingData(userId: string) {
        return this.pingTracker.getPingData(userId);
    }

    clearUserData(userId?: string) {
        this.userTracker.clearUserData(userId);
        this.pingTracker.clearPingData(userId);
    }

    // Statistics methods
    getStats() {
        const allUsers = this.userTracker.getAllUserData();
        const allPings = this.pingTracker.getAllPingData();
        
        return {
            trackedUsers: allUsers.length,
            totalMessages: allUsers.reduce((sum, user) => sum + user.messageCount, 0),
            usersOverPingThreshold: allPings.filter(ping => ping.isOverThreshold).length,
            totalPings: allPings.reduce((sum, ping) => sum + ping.totalPings, 0)
        };
    }

    // Export data for backup/restore
    exportData() {
        return {
            userTracking: this.userTracker.getAllUserData(),
            pingData: this.pingTracker.getAllPingData(),
            timestamp: Date.now()
        };
    }

    // Import data from backup
    importData(data: any) {
        try {
            // Clear existing data
            this.userTracker.clearUserData();
            this.pingTracker.clearPingData();
            
            // Import user tracking data
            if (data.userTracking && Array.isArray(data.userTracking)) {
                data.userTracking.forEach((userData: any) => {
                    if (userData.messages && Array.isArray(userData.messages)) {
                        userData.messages.forEach((message: any) => {
                            this.userTracker.trackMessage(
                                userData.userId,
                                userData.username,
                                message
                            );
                        });
                    }
                });
            }
            
            // Import ping data
            if (data.pingData && Array.isArray(data.pingData)) {
                data.pingData.forEach((pingData: any) => {
                    if (pingData.pings && Array.isArray(pingData.pings)) {
                        pingData.pings.forEach((ping: any) => {
                            this.pingTracker.trackPing(
                                pingData.userId,
                                pingData.username,
                                ping
                            );
                        });
                    }
                });
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import ModSuite data:', error);
            return false;
        }
    }
}

// Global instance for easy access
export const messageMonitor = MessageMonitor.getInstance();

// Auto-start monitoring when settings are enabled
export function initializeMessageMonitoring() {
    if (settings.store.enableUserTracking || settings.store.enablePingMonitor) {
        messageMonitor.start();
    }
}

// Auto-stop monitoring when all features are disabled
export function checkMonitoringStatus() {
    if (!settings.store.enableUserTracking && !settings.store.enablePingMonitor) {
        messageMonitor.stop();
    } else {
        messageMonitor.start();
    }
}

// Utility function to get comprehensive user data
export function getUserAnalytics(userId: string) {
    const userTracking = messageMonitor.getTrackedUserData(userId);
    const pingData = messageMonitor.getPingData(userId);
    
    if (!userTracking && !pingData) {
        return null;
    }
    
    return {
        userId,
        username: userTracking?.username || pingData?.username || 'Unknown',
        messageCount: userTracking?.messageCount || 0,
        channelCount: userTracking?.channels.length || 0,
        lastSeen: userTracking?.lastSeen || 0,
        totalPings: pingData?.totalPings || 0,
        recentPings: pingData?.recentPings || 0,
        isOverPingThreshold: pingData?.isOverThreshold || false,
        recentMessages: userTracking?.messages.slice(-10) || [],
        recentPingEvents: pingData?.pings.slice(-10) || []
    };
}

// Utility function to get server-wide analytics
export function getServerAnalytics() {
    const stats = messageMonitor.getStats();
    const allUsers = messageMonitor.userTracker.getAllUserData();
    const allPings = messageMonitor.pingTracker.getAllPingData();
    
    // Calculate additional metrics
    const activeUsers = allUsers.filter(user => 
        Date.now() - user.lastSeen < 24 * 60 * 60 * 1000 // Active in last 24 hours
    ).length;
    
    const topMessageUsers = allUsers
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);
    
    const topPingUsers = allPings
        .sort((a, b) => b.totalPings - a.totalPings)
        .slice(0, 5);
    
    return {
        ...stats,
        activeUsers,
        topMessageUsers: topMessageUsers.map(user => ({
            username: user.username,
            messageCount: user.messageCount
        })),
        topPingUsers: topPingUsers.map(ping => ({
            username: ping.username,
            totalPings: ping.totalPings,
            recentPings: ping.recentPings
        }))
    };
}
