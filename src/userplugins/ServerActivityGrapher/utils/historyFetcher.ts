/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RestAPI } from "@webpack/common";
import { MessageEvent } from "./activityTracker";
import { settings } from "../settings";

export interface HistoryFetchOptions {
    guildId: string;
    channelIds?: string[];
    daysBack?: number;
    maxMessagesPerChannel?: number;
    onProgress?: (progress: { current: number; total: number; channel: string; }) => void;
}

export interface HistoryFetchResult {
    messages: MessageEvent[];
    channelsProcessed: number;
    totalMessages: number;
    errors: string[];
}

export class HistoryFetcher {
    private isRunning = false;
    private shouldStop = false;

    async fetchHistory(options: HistoryFetchOptions): Promise<HistoryFetchResult> {
        if (this.isRunning) {
            throw new Error("History fetch already in progress");
        }

        this.isRunning = true;
        this.shouldStop = false;

        const {
            guildId,
            channelIds = [],
            daysBack = 30,
            maxMessagesPerChannel = 1000,
            onProgress
        } = options;

        const result: HistoryFetchResult = {
            messages: [],
            channelsProcessed: 0,
            totalMessages: 0,
            errors: []
        };

        try {
            const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

            for (let i = 0; i < channelIds.length && !this.shouldStop; i++) {
                const channelId = channelIds[i];

                try {
                    onProgress?.({
                        current: i + 1,
                        total: channelIds.length,
                        channel: channelId
                    });

                    const channelMessages = await this.fetchChannelHistory(
                        channelId,
                        cutoffTime,
                        maxMessagesPerChannel
                    );

                    // Convert to MessageEvent format
                    const messageEvents = channelMessages.map(msg => this.convertToMessageEvent(msg, guildId));
                    result.messages.push(...messageEvents);
                    result.totalMessages += messageEvents.length;

                    // Rate limiting - wait between channels
                    await this.delay(settings.store.apiRateLimit || 1000);

                } catch (error) {
                    console.error(`Failed to fetch history for channel ${channelId}:`, error);
                    result.errors.push(`Channel ${channelId}: ${error.message}`);
                }

                result.channelsProcessed++;
            }

        } finally {
            this.isRunning = false;
        }

        return result;
    }

    private async fetchChannelHistory(
        channelId: string,
        cutoffTime: number,
        maxMessages: number
    ): Promise<any[]> {
        const messages: any[] = [];
        let lastMessageId: string | undefined;
        let fetchedCount = 0;

        while (fetchedCount < maxMessages && !this.shouldStop) {
            try {
                const params: any = {
                    limit: Math.min(100, maxMessages - fetchedCount) // Discord API limit is 100
                };

                if (lastMessageId) {
                    params.before = lastMessageId;
                }

                const response = await RestAPI.get({
                    url: `/channels/${channelId}/messages`,
                    query: params,
                    retries: 3
                });

                if (!response.body || response.body.length === 0) {
                    break; // No more messages
                }

                const batchMessages = response.body;
                let foundOldMessage = false;

                for (const message of batchMessages) {
                    const messageTime = new Date(message.timestamp).getTime();

                    if (messageTime < cutoffTime) {
                        foundOldMessage = true;
                        break;
                    }

                    messages.push(message);
                    fetchedCount++;

                    if (fetchedCount >= maxMessages) {
                        break;
                    }
                }

                if (foundOldMessage || batchMessages.length < params.limit) {
                    break; // Reached cutoff time or end of channel
                }

                lastMessageId = batchMessages[batchMessages.length - 1].id;

                // Rate limiting between requests
                await this.delay(100);

            } catch (error) {
                if (error.status === 403) {
                    throw new Error("No permission to read channel history");
                } else if (error.status === 429) {
                    // Rate limited - wait longer
                    const retryAfter = error.body?.retry_after || 5;
                    await this.delay(retryAfter * 1000);
                    continue;
                } else {
                    throw error;
                }
            }
        }

        return messages;
    }

    private convertToMessageEvent(discordMessage: any, guildId: string): MessageEvent {
        return {
            guildId,
            channelId: discordMessage.channel_id,
            userId: discordMessage.author.id,
            username: discordMessage.author.username,
            timestamp: new Date(discordMessage.timestamp).getTime(),
            content: discordMessage.content || '',
            hasAttachment: (discordMessage.attachments && discordMessage.attachments.length > 0),
            hasEmbed: (discordMessage.embeds && discordMessage.embeds.length > 0),
            mentionsEveryone: discordMessage.mention_everyone || false,
            mentionsHere: discordMessage.content?.includes('@here') || false,
            roleMentions: discordMessage.mention_roles || [],
            userMentions: discordMessage.mentions || []
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop(): void {
        this.shouldStop = true;
    }

    getIsRunning(): boolean {
        return this.isRunning;
    }
}

export async function fetchGuildChannels(guildId: string): Promise<any[]> {
    try {
        const response = await RestAPI.get({
            url: `/guilds/${guildId}/channels`,
            retries: 2
        });

        return response.body || [];
    } catch (error) {
        console.error("Failed to fetch guild channels:", error);
        return [];
    }
}

export async function estimateHistorySize(
    guildId: string,
    channelIds: string[],
    daysBack: number
): Promise<{ estimatedMessages: number; estimatedTime: string; }> {
    // Sample a few channels to estimate total size
    const sampleSize = Math.min(3, channelIds.length);
    const sampleChannels = channelIds.slice(0, sampleSize);

    let totalSampleMessages = 0;
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    for (const channelId of sampleChannels) {
        try {
            const response = await RestAPI.get({
                url: `/channels/${channelId}/messages`,
                query: { limit: 50 },
                retries: 1
            });

            if (response.body) {
                const recentMessages = response.body.filter((msg: any) =>
                    new Date(msg.timestamp).getTime() > cutoffTime
                );
                totalSampleMessages += recentMessages.length;
            }
        } catch (error) {
            // Ignore errors in estimation
        }
    }

    const avgMessagesPerChannel = totalSampleMessages / sampleSize;
    const estimatedMessages = Math.round(avgMessagesPerChannel * channelIds.length);

    // Estimate time based on rate limits (roughly 1 request per second)
    const estimatedRequests = Math.ceil(estimatedMessages / 100); // 100 messages per request
    const estimatedSeconds = estimatedRequests + (channelIds.length * 2); // Extra time for channel switching

    const estimatedTime = estimatedSeconds > 60
        ? `${Math.round(estimatedSeconds / 60)} minutes`
        : `${estimatedSeconds} seconds`;

    return {
        estimatedMessages: Math.max(estimatedMessages, 0),
        estimatedTime
    };
}
