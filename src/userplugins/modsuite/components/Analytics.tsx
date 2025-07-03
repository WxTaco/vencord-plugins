/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { React, useEffect, useState } from "@webpack/common";

import { getServerAnalytics, getUserAnalytics } from "../utils/messageMonitor";

const cl = classNameFactory("ms-");

interface AnalyticsProps {
    userId?: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ userId }) => {
    const [serverStats, setServerStats] = useState<any>(null);
    const [userStats, setUserStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAnalytics = () => {
            setIsLoading(true);
            
            try {
                const serverData = getServerAnalytics();
                setServerStats(serverData);
                
                if (userId) {
                    const userData = getUserAnalytics(userId);
                    setUserStats(userData);
                }
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();
        
        // Refresh analytics every 30 seconds
        const interval = setInterval(loadAnalytics, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '20px' 
            }}>
                <div className={cl("spinner")} />
            </div>
        );
    }

    return (
        <ErrorBoundary noop>
            <div className={cl("analytics")}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--ms-pink-800)' }}>
                    ModSuite Analytics
                </h3>

                {/* Server-wide Statistics */}
                {serverStats && (
                    <div className={cl("analytics-section")} style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--ms-pink-700)' }}>
                            Server Statistics
                        </h4>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <StatCard
                                title="Tracked Users"
                                value={serverStats.trackedUsers}
                                color="var(--ms-pink-500)"
                            />
                            <StatCard
                                title="Total Messages"
                                value={serverStats.totalMessages}
                                color="var(--ms-pink-600)"
                            />
                            <StatCard
                                title="Active Users"
                                value={serverStats.activeUsers}
                                color="var(--ms-pink-400)"
                            />
                            <StatCard
                                title="Over Ping Limit"
                                value={serverStats.usersOverPingThreshold}
                                color="var(--ms-rose-500)"
                            />
                        </div>

                        {/* Top Users */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--ms-pink-600)' }}>
                                    Top Message Senders
                                </h5>
                                <div className={cl("top-users-list")}>
                                    {serverStats.topMessageUsers.map((user: any, index: number) => (
                                        <div key={user.username} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '4px 8px',
                                            background: 'var(--ms-pink-50)',
                                            borderRadius: 'var(--ms-border-radius-sm)',
                                            marginBottom: '2px',
                                            fontSize: '11px'
                                        }}>
                                            <span>{index + 1}. {user.username}</span>
                                            <span style={{ color: 'var(--ms-pink-600)' }}>
                                                {user.messageCount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--ms-pink-600)' }}>
                                    Most Active Pingers
                                </h5>
                                <div className={cl("top-users-list")}>
                                    {serverStats.topPingUsers.map((user: any, index: number) => (
                                        <div key={user.username} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '4px 8px',
                                            background: user.recentPings > 5 ? 'var(--ms-rose-50)' : 'var(--ms-pink-50)',
                                            borderRadius: 'var(--ms-border-radius-sm)',
                                            marginBottom: '2px',
                                            fontSize: '11px'
                                        }}>
                                            <span>{index + 1}. {user.username}</span>
                                            <span style={{ color: user.recentPings > 5 ? 'var(--ms-rose-600)' : 'var(--ms-pink-600)' }}>
                                                {user.totalPings} ({user.recentPings})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User-specific Statistics */}
                {userStats && (
                    <div className={cl("analytics-section")}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--ms-pink-700)' }}>
                            User Statistics - {userStats.username}
                        </h4>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <StatCard
                                title="Messages"
                                value={userStats.messageCount}
                                color="var(--ms-pink-500)"
                            />
                            <StatCard
                                title="Channels"
                                value={userStats.channelCount}
                                color="var(--ms-pink-600)"
                            />
                            <StatCard
                                title="Total Pings"
                                value={userStats.totalPings}
                                color="var(--ms-pink-400)"
                            />
                            <StatCard
                                title="Recent Pings"
                                value={userStats.recentPings}
                                color={userStats.isOverPingThreshold ? "var(--ms-rose-500)" : "var(--ms-pink-400)"}
                            />
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--ms-pink-600)' }}>
                            Last seen: {userStats.lastSeen ? new Date(userStats.lastSeen).toLocaleString() : 'Never'}
                            {userStats.isOverPingThreshold && (
                                <span style={{ 
                                    marginLeft: '8px', 
                                    color: 'var(--ms-rose-600)', 
                                    fontWeight: 500 
                                }}>
                                    ⚠️ Over ping threshold
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {!serverStats && !userStats && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px', 
                        color: 'var(--ms-pink-600)' 
                    }}>
                        No analytics data available
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

const StatCard: React.FC<{
    title: string;
    value: number;
    color: string;
}> = ({ title, value, color }) => {
    return (
        <div style={{
            padding: '12px',
            background: 'white',
            border: '1px solid var(--ms-pink-200)',
            borderRadius: 'var(--ms-border-radius)',
            borderLeft: `4px solid ${color}`,
            textAlign: 'center'
        }}>
            <div style={{ 
                fontSize: '18px', 
                fontWeight: 600, 
                color: color,
                marginBottom: '4px'
            }}>
                {value.toLocaleString()}
            </div>
            <div style={{ 
                fontSize: '11px', 
                color: 'var(--ms-pink-600)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {title}
            </div>
        </div>
    );
};
