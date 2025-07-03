/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ChannelStore, MessageStore } from "@webpack/common";
import { React, useEffect, useState } from "@webpack/common";

import { settings } from "../settings";
import { TrackedMessage, UserTrackingData } from "../types";

const cl = classNameFactory("ms-");

interface UserTrackerProps {
    userId?: string;
    onUserSelect?: (userId: string) => void;
}

// In-memory storage for tracked user data
const userTrackingStore = new Map<string, UserTrackingData>();

export const UserTracker: React.FC<UserTrackerProps> = ({ 
    userId, 
    onUserSelect 
}) => {
    const [trackedUsers, setTrackedUsers] = useState<UserTrackingData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserTrackingData | null>(null);
    const [sortBy, setSortBy] = useState<'recent' | 'messages' | 'username'>('recent');

    useEffect(() => {
        // Load tracked users from store
        const users = Array.from(userTrackingStore.values());
        setTrackedUsers(users);
        
        // Set selected user if userId provided
        if (userId) {
            const user = userTrackingStore.get(userId);
            setSelectedUser(user || null);
        }
    }, [userId]);

    const sortedUsers = [...trackedUsers].sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return b.lastSeen - a.lastSeen;
            case 'messages':
                return b.messageCount - a.messageCount;
            case 'username':
                return a.username.localeCompare(b.username);
            default:
                return 0;
        }
    });

    const handleUserClick = (user: UserTrackingData) => {
        setSelectedUser(user);
        onUserSelect?.(user.userId);
    };

    const clearUserData = (userId: string) => {
        userTrackingStore.delete(userId);
        setTrackedUsers(prev => prev.filter(u => u.userId !== userId));
        if (selectedUser?.userId === userId) {
            setSelectedUser(null);
        }
    };

    const clearAllData = () => {
        userTrackingStore.clear();
        setTrackedUsers([]);
        setSelectedUser(null);
    };

    return (
        <ErrorBoundary noop>
            <div className={cl("user-tracker")}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ms-pink-800)' }}>
                        User Message Tracking
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            className={cl("select")}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                            <option value="recent">Recent Activity</option>
                            <option value="messages">Message Count</option>
                            <option value="username">Username</option>
                        </select>
                        <button
                            className={cl("button", "small", "secondary")}
                            onClick={clearAllData}
                            style={{ fontSize: '10px' }}
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--ms-pink-600)', 
                    marginBottom: '12px' 
                }}>
                    Tracking {trackedUsers.length} users • Max {settings.store.maxTrackedMessages} messages per user
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 1fr' : '1fr', gap: '16px' }}>
                    {/* User List */}
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--ms-pink-700)' }}>
                            Tracked Users
                        </h4>
                        <div className={cl("user-list")} style={{ 
                            maxHeight: '300px', 
                            overflowY: 'auto' 
                        }}>
                            {sortedUsers.length === 0 ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '20px', 
                                    color: 'var(--ms-pink-600)' 
                                }}>
                                    No users being tracked
                                </div>
                            ) : (
                                sortedUsers.map(user => (
                                    <UserTrackingItem
                                        key={user.userId}
                                        user={user}
                                        isSelected={selectedUser?.userId === user.userId}
                                        onClick={() => handleUserClick(user)}
                                        onClear={() => clearUserData(user.userId)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Selected User Details */}
                    {selectedUser && (
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--ms-pink-700)' }}>
                                {selectedUser.username} - Recent Messages
                            </h4>
                            <div className={cl("message-list")} style={{ 
                                maxHeight: '300px', 
                                overflowY: 'auto' 
                            }}>
                                {selectedUser.messages.length === 0 ? (
                                    <div style={{ 
                                        textAlign: 'center', 
                                        padding: '20px', 
                                        color: 'var(--ms-pink-600)' 
                                    }}>
                                        No messages tracked
                                    </div>
                                ) : (
                                    selectedUser.messages
                                        .sort((a, b) => b.timestamp - a.timestamp)
                                        .map(message => (
                                            <TrackedMessageItem
                                                key={message.id}
                                                message={message}
                                            />
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
};

const UserTrackingItem: React.FC<{
    user: UserTrackingData;
    isSelected: boolean;
    onClick: () => void;
    onClear: () => void;
}> = ({ user, isSelected, onClick, onClear }) => {
    const lastSeenText = new Date(user.lastSeen).toLocaleString();
    
    return (
        <div 
            className={cl("user-tracking-item")}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '4px',
                background: isSelected ? 'var(--ms-pink-200)' : 'var(--ms-pink-50)',
                border: `1px solid ${isSelected ? 'var(--ms-pink-400)' : 'var(--ms-pink-200)'}`,
                borderRadius: 'var(--ms-border-radius)',
                cursor: 'pointer',
                transition: 'var(--ms-transition)'
            }}
            onClick={onClick}
        >
            <div>
                <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--ms-pink-800)' }}>
                    {user.username}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ms-pink-600)' }}>
                    {user.messageCount} messages • Last seen: {lastSeenText}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--ms-pink-500)' }}>
                    Channels: {user.channels.length}
                </div>
            </div>
            
            <button
                className={cl("button", "small", "danger")}
                onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                }}
                style={{ fontSize: '10px', padding: '2px 6px' }}
            >
                Clear
            </button>
        </div>
    );
};

const TrackedMessageItem: React.FC<{
    message: TrackedMessage;
}> = ({ message }) => {
    const channel = ChannelStore.getChannel(message.channelId);
    const timestamp = new Date(message.timestamp).toLocaleString();
    
    return (
        <div 
            className={cl("tracked-message-item")}
            style={{
                padding: '8px',
                marginBottom: '4px',
                background: message.deleted ? 'var(--ms-rose-50)' : 'white',
                border: `1px solid ${message.deleted ? 'var(--ms-rose-200)' : 'var(--ms-pink-200)'}`,
                borderRadius: 'var(--ms-border-radius)',
                borderLeft: `3px solid ${message.edited ? 'var(--ms-pink-400)' : message.deleted ? 'var(--ms-rose-400)' : 'var(--ms-pink-300)'}`
            }}
        >
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
            }}>
                <span style={{ fontSize: '11px', color: 'var(--ms-pink-600)' }}>
                    #{channel?.name || 'Unknown Channel'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ms-pink-500)' }}>
                    {timestamp}
                </span>
            </div>
            
            <div style={{ 
                fontSize: '12px', 
                color: message.deleted ? 'var(--ms-rose-700)' : 'var(--ms-pink-800)',
                wordBreak: 'break-word',
                fontStyle: message.deleted ? 'italic' : 'normal'
            }}>
                {message.deleted ? '[Message Deleted]' : message.content || '[No content]'}
            </div>
            
            {message.edited && (
                <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--ms-pink-500)',
                    fontStyle: 'italic',
                    marginTop: '2px'
                }}>
                    (edited)
                </div>
            )}
        </div>
    );
};

// User tracking utilities
export class UserMessageTracker {
    private static instance: UserMessageTracker;
    
    static getInstance(): UserMessageTracker {
        if (!UserMessageTracker.instance) {
            UserMessageTracker.instance = new UserMessageTracker();
        }
        return UserMessageTracker.instance;
    }

    trackMessage(userId: string, username: string, message: Omit<TrackedMessage, 'timestamp'>): void {
        if (!settings.store.enableUserTracking) return;

        const now = Date.now();
        const timeLimit = settings.store.trackingTimeLimit * 60 * 60 * 1000; // Convert hours to milliseconds
        
        // Get or create user tracking data
        let userData = userTrackingStore.get(userId);
        if (!userData) {
            userData = {
                userId,
                username,
                messages: [],
                channels: [],
                lastSeen: now,
                messageCount: 0
            };
        }

        // Add new message
        const trackedMessage: TrackedMessage = {
            ...message,
            timestamp: now
        };
        
        userData.messages.push(trackedMessage);
        userData.messageCount++;
        userData.lastSeen = now;
        
        // Update channels list
        if (!userData.channels.includes(message.channelId)) {
            userData.channels.push(message.channelId);
        }

        // Clean up old messages
        userData.messages = userData.messages.filter(msg => 
            now - msg.timestamp <= timeLimit
        );
        
        // Limit message count
        if (userData.messages.length > settings.store.maxTrackedMessages) {
            userData.messages = userData.messages
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, settings.store.maxTrackedMessages);
        }
        
        // Update store
        userTrackingStore.set(userId, userData);
    }

    getUserData(userId: string): UserTrackingData | undefined {
        return userTrackingStore.get(userId);
    }

    getAllUserData(): UserTrackingData[] {
        return Array.from(userTrackingStore.values());
    }

    clearUserData(userId?: string): void {
        if (userId) {
            userTrackingStore.delete(userId);
        } else {
            userTrackingStore.clear();
        }
    }

    markMessageDeleted(messageId: string): void {
        for (const userData of userTrackingStore.values()) {
            const message = userData.messages.find(m => m.id === messageId);
            if (message) {
                message.deleted = true;
                break;
            }
        }
    }

    markMessageEdited(messageId: string, newContent: string): void {
        for (const userData of userTrackingStore.values()) {
            const message = userData.messages.find(m => m.id === messageId);
            if (message) {
                message.edited = true;
                message.content = newContent;
                break;
            }
        }
    }
}

// Hook for using user tracker in components
export const useUserTracker = () => {
    const tracker = UserMessageTracker.getInstance();
    const [userData, setUserData] = useState<UserTrackingData[]>([]);

    useEffect(() => {
        // Update user data periodically
        const interval = setInterval(() => {
            setUserData(tracker.getAllUserData());
        }, 5000);

        return () => clearInterval(interval);
    }, [tracker]);

    return {
        trackMessage: tracker.trackMessage.bind(tracker),
        getUserData: tracker.getUserData.bind(tracker),
        getAllUserData: tracker.getAllUserData.bind(tracker),
        clearUserData: tracker.clearUserData.bind(tracker),
        markMessageDeleted: tracker.markMessageDeleted.bind(tracker),
        markMessageEdited: tracker.markMessageEdited.bind(tracker),
        userData
    };
};
