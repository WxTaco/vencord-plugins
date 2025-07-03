/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { React, useEffect, useState } from "@webpack/common";

import { settings } from "../settings";
import { PingData, PingEvent } from "../types";

const cl = classNameFactory("ms-");

interface PingMonitorProps {
    userId?: string;
    onThresholdExceeded?: (userId: string, pingData: PingData) => void;
}

// In-memory storage for ping data (in a real implementation, this might be persisted)
const pingDataStore = new Map<string, PingData>();

export const PingMonitor: React.FC<PingMonitorProps> = ({ 
    userId, 
    onThresholdExceeded 
}) => {
    const [pingData, setPingData] = useState<PingData[]>([]);
    const [sortBy, setSortBy] = useState<'recent' | 'total' | 'username'>('recent');

    useEffect(() => {
        // Load ping data from store
        const data = Array.from(pingDataStore.values());
        setPingData(data);
    }, []);

    const sortedData = [...pingData].sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return b.recentPings - a.recentPings;
            case 'total':
                return b.totalPings - a.totalPings;
            case 'username':
                return a.username.localeCompare(b.username);
            default:
                return 0;
        }
    });

    const filteredData = userId ? 
        sortedData.filter(data => data.userId === userId) : 
        sortedData;

    return (
        <ErrorBoundary noop>
            <div className={cl("ping-monitor")}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ms-pink-800)' }}>
                        Ping Monitor
                    </h3>
                    <select
                        className={cl("select")}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                        <option value="recent">Recent Pings</option>
                        <option value="total">Total Pings</option>
                        <option value="username">Username</option>
                    </select>
                </div>

                <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--ms-pink-600)', 
                    marginBottom: '12px' 
                }}>
                    Threshold: {settings.store.pingThreshold} pings per {settings.store.pingTimeWindow} minutes
                </div>

                {filteredData.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px', 
                        color: 'var(--ms-pink-600)' 
                    }}>
                        No ping data available
                    </div>
                ) : (
                    <div className={cl("ping-list")} style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto' 
                    }}>
                        {filteredData.map(data => (
                            <PingDataItem 
                                key={data.userId} 
                                data={data}
                                onViewDetails={() => console.log('View details for', data.userId)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

const PingDataItem: React.FC<{
    data: PingData;
    onViewDetails: () => void;
}> = ({ data, onViewDetails }) => {
    const isOverThreshold = data.isOverThreshold;
    
    return (
        <div 
            className={cl("ping-item")}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '4px',
                background: isOverThreshold ? 'var(--ms-rose-50)' : 'var(--ms-pink-50)',
                border: `1px solid ${isOverThreshold ? 'var(--ms-rose-200)' : 'var(--ms-pink-200)'}`,
                borderRadius: 'var(--ms-border-radius)',
                position: 'relative'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>
                    {data.username}
                </div>
                {isOverThreshold && (
                    <div className={cl("ping-indicator")} />
                )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--ms-pink-700)' }}>
                    Recent: {data.recentPings} | Total: {data.totalPings}
                </div>
                <button
                    className={cl("button", "small", "secondary")}
                    onClick={onViewDetails}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                >
                    Details
                </button>
            </div>
        </div>
    );
};

// Ping tracking utilities
export class PingTracker {
    private static instance: PingTracker;
    
    static getInstance(): PingTracker {
        if (!PingTracker.instance) {
            PingTracker.instance = new PingTracker();
        }
        return PingTracker.instance;
    }

    trackPing(userId: string, username: string, event: Omit<PingEvent, 'timestamp'>): void {
        if (!settings.store.enablePingMonitor) return;

        const now = Date.now();
        const timeWindow = settings.store.pingTimeWindow * 60 * 1000; // Convert to milliseconds
        
        // Get or create ping data for user
        let pingData = pingDataStore.get(userId);
        if (!pingData) {
            pingData = {
                userId,
                username,
                pings: [],
                totalPings: 0,
                recentPings: 0,
                isOverThreshold: false
            };
        }

        // Add new ping event
        const pingEvent: PingEvent = {
            ...event,
            timestamp: now
        };
        
        pingData.pings.push(pingEvent);
        pingData.totalPings++;

        // Clean up old pings outside time window
        pingData.pings = pingData.pings.filter(ping => 
            now - ping.timestamp <= timeWindow
        );
        
        pingData.recentPings = pingData.pings.length;
        
        // Check if over threshold
        const wasOverThreshold = pingData.isOverThreshold;
        pingData.isOverThreshold = pingData.recentPings > settings.store.pingThreshold;
        
        // Update store
        pingDataStore.set(userId, pingData);
        
        // Trigger threshold exceeded callback if newly over threshold
        if (!wasOverThreshold && pingData.isOverThreshold) {
            this.onThresholdExceeded?.(userId, pingData);
        }
    }

    getPingData(userId: string): PingData | undefined {
        return pingDataStore.get(userId);
    }

    getAllPingData(): PingData[] {
        return Array.from(pingDataStore.values());
    }

    clearPingData(userId?: string): void {
        if (userId) {
            pingDataStore.delete(userId);
        } else {
            pingDataStore.clear();
        }
    }

    private onThresholdExceeded?: (userId: string, pingData: PingData) => void;

    setThresholdCallback(callback: (userId: string, pingData: PingData) => void): void {
        this.onThresholdExceeded = callback;
    }
}

// Hook for using ping tracker in components
export const usePingTracker = () => {
    const tracker = PingTracker.getInstance();
    const [pingData, setPingData] = useState<PingData[]>([]);

    useEffect(() => {
        // Set up threshold callback
        tracker.setThresholdCallback((userId, data) => {
            console.log(`User ${data.username} exceeded ping threshold:`, data);
            // Could show a toast notification here
        });

        // Update ping data periodically
        const interval = setInterval(() => {
            setPingData(tracker.getAllPingData());
        }, 5000);

        return () => clearInterval(interval);
    }, [tracker]);

    return {
        trackPing: tracker.trackPing.bind(tracker),
        getPingData: tracker.getPingData.bind(tracker),
        getAllPingData: tracker.getAllPingData.bind(tracker),
        clearPingData: tracker.clearPingData.bind(tracker),
        pingData
    };
};

// Utility function to detect pings in message content
export function detectPingsInMessage(content: string, mentions: any[]): PingEvent[] {
    const pings: Omit<PingEvent, 'timestamp'>[] = [];
    
    // Check for @everyone and @here
    if (content.includes('@everyone')) {
        pings.push({ type: 'everyone', channelId: '', messageId: '' });
    }
    if (content.includes('@here')) {
        pings.push({ type: 'here', channelId: '', messageId: '' });
    }
    
    // Check for user mentions
    if (mentions) {
        mentions.forEach(mention => {
            if (mention.type === 'user') {
                pings.push({ 
                    type: 'user', 
                    targetId: mention.id,
                    channelId: '', 
                    messageId: '' 
                });
            } else if (mention.type === 'role') {
                pings.push({ 
                    type: 'role', 
                    targetId: mention.id,
                    channelId: '', 
                    messageId: '' 
                });
            }
        });
    }
    
    return pings as PingEvent[];
}
