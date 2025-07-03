/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Constants, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";
import { React, useEffect, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

import { settings } from "../settings";
import { AuditLogEntry, ModlogFilter } from "../types";
import { canViewAuditLog } from "../utils/permissions";

const cl = classNameFactory("ms-");

interface ModlogViewerProps {
    guild: Guild;
}

// Audit log action types mapping
const AUDIT_LOG_ACTIONS = {
    1: { name: 'Guild Update', color: 'var(--ms-pink-500)' },
    10: { name: 'Channel Create', color: 'var(--ms-pink-500)' },
    11: { name: 'Channel Update', color: 'var(--ms-pink-500)' },
    12: { name: 'Channel Delete', color: 'var(--ms-rose-500)' },
    13: { name: 'Channel Overwrite Create', color: 'var(--ms-pink-500)' },
    14: { name: 'Channel Overwrite Update', color: 'var(--ms-pink-500)' },
    15: { name: 'Channel Overwrite Delete', color: 'var(--ms-rose-500)' },
    20: { name: 'Member Kick', color: 'var(--ms-rose-500)' },
    21: { name: 'Member Prune', color: 'var(--ms-rose-500)' },
    22: { name: 'Member Ban Add', color: 'var(--ms-rose-600)' },
    23: { name: 'Member Ban Remove', color: 'var(--ms-pink-500)' },
    24: { name: 'Member Update', color: 'var(--ms-pink-500)' },
    25: { name: 'Member Role Update', color: 'var(--ms-pink-500)' },
    26: { name: 'Member Move', color: 'var(--ms-pink-500)' },
    27: { name: 'Member Disconnect', color: 'var(--ms-rose-500)' },
    28: { name: 'Bot Add', color: 'var(--ms-pink-500)' },
    30: { name: 'Role Create', color: 'var(--ms-pink-500)' },
    31: { name: 'Role Update', color: 'var(--ms-pink-500)' },
    32: { name: 'Role Delete', color: 'var(--ms-rose-500)' },
    40: { name: 'Invite Create', color: 'var(--ms-pink-500)' },
    41: { name: 'Invite Update', color: 'var(--ms-pink-500)' },
    42: { name: 'Invite Delete', color: 'var(--ms-rose-500)' },
    50: { name: 'Webhook Create', color: 'var(--ms-pink-500)' },
    51: { name: 'Webhook Update', color: 'var(--ms-pink-500)' },
    52: { name: 'Webhook Delete', color: 'var(--ms-rose-500)' },
    60: { name: 'Emoji Create', color: 'var(--ms-pink-500)' },
    61: { name: 'Emoji Update', color: 'var(--ms-pink-500)' },
    62: { name: 'Emoji Delete', color: 'var(--ms-rose-500)' },
    72: { name: 'Message Delete', color: 'var(--ms-rose-500)' },
    73: { name: 'Message Bulk Delete', color: 'var(--ms-rose-600)' },
    74: { name: 'Message Pin', color: 'var(--ms-pink-500)' },
    75: { name: 'Message Unpin', color: 'var(--ms-pink-500)' },
    80: { name: 'Integration Create', color: 'var(--ms-pink-500)' },
    81: { name: 'Integration Update', color: 'var(--ms-pink-500)' },
    82: { name: 'Integration Delete', color: 'var(--ms-rose-500)' },
    83: { name: 'Stage Instance Create', color: 'var(--ms-pink-500)' },
    84: { name: 'Stage Instance Update', color: 'var(--ms-pink-500)' },
    85: { name: 'Stage Instance Delete', color: 'var(--ms-rose-500)' },
    90: { name: 'Sticker Create', color: 'var(--ms-pink-500)' },
    91: { name: 'Sticker Update', color: 'var(--ms-pink-500)' },
    92: { name: 'Sticker Delete', color: 'var(--ms-rose-500)' },
    100: { name: 'Thread Create', color: 'var(--ms-pink-500)' },
    101: { name: 'Thread Update', color: 'var(--ms-pink-500)' },
    102: { name: 'Thread Delete', color: 'var(--ms-rose-500)' },
    110: { name: 'Application Command Permission Update', color: 'var(--ms-pink-500)' },
    121: { name: 'Auto Moderation Rule Create', color: 'var(--ms-pink-500)' },
    122: { name: 'Auto Moderation Rule Update', color: 'var(--ms-pink-500)' },
    123: { name: 'Auto Moderation Rule Delete', color: 'var(--ms-rose-500)' },
    124: { name: 'Auto Moderation Block Message', color: 'var(--ms-rose-500)' },
    125: { name: 'Auto Moderation Flag to Channel', color: 'var(--ms-rose-500)' },
    126: { name: 'Auto Moderation User Communication Disabled', color: 'var(--ms-rose-500)' },
    140: { name: 'Creator Monetization Request Created', color: 'var(--ms-pink-500)' },
    141: { name: 'Creator Monetization Terms Accepted', color: 'var(--ms-pink-500)' },
};

export const ModlogViewer = ({ guild }) => {
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<ModlogFilter>({
        actionTypes: []
    });
    const [users, setUsers] = useState<Map<string, any>>(new Map());

    const canView = canViewAuditLog(guild?.id);

    useEffect(() => {
        if (canView && guild) {
            fetchAuditLogs();
        }
    }, [guild, canView]);

    const fetchAuditLogs = async () => {
        if (!guild || !canView) return;

        setIsLoading(true);
        try {
            const response = await RestAPI.get({
                url: Constants.Endpoints.GUILD_AUDIT_LOG(guild.id),
                query: {
                    limit: settings.store.maxLogEntries
                }
            });

            const logs: AuditLogEntry[] = response.body.audit_log_entries.map(entry => ({
                id: entry.id,
                actionType: entry.action_type,
                targetId: entry.target_id,
                userId: entry.user_id,
                reason: entry.reason,
                timestamp: new Date(entry.id / 4194304 + 1420070400000).getTime(),
                changes: entry.changes || [],
                options: entry.options || {}
            }));

            setAuditLogs(logs);

            // Cache user data
            const userMap = new Map();
            response.body.users?.forEach(user => {
                userMap.set(user.id, user);
            });
            setUsers(userMap);

        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            showToast('Failed to fetch audit logs', Toasts.Type.FAILURE);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (key: keyof ModlogFilter, value: any) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    };

    const filteredLogs = auditLogs.filter(log => {
        if (filter.actionTypes.length > 0 && !filter.actionTypes.includes(log.actionType)) {
            return false;
        }
        if (filter.userId && log.userId !== filter.userId) {
            return false;
        }
        if (filter.targetId && log.targetId !== filter.targetId) {
            return false;
        }
        if (filter.hasReason !== undefined) {
            const hasReason = Boolean(log.reason);
            if (filter.hasReason !== hasReason) return false;
        }
        if (filter.startDate && log.timestamp < filter.startDate.getTime()) {
            return false;
        }
        if (filter.endDate && log.timestamp > filter.endDate.getTime()) {
            return false;
        }
        return true;
    });

    if (!canView) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: 'var(--ms-rose-600)' 
            }}>
                You don't have permission to view audit logs
            </div>
        );
    }

    return (
        <ErrorBoundary noop>
            <div className={cl("modlog-viewer")}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ms-pink-800)' }}>
                        Enhanced Audit Log
                    </h3>
                    <button
                        className={cl("button", "small")}
                        onClick={fetchAuditLogs}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {/* Filters */}
                <div className={cl("filter-section")} style={{ 
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'var(--ms-pink-50)',
                    border: '1px solid var(--ms-pink-200)',
                    borderRadius: 'var(--ms-border-radius)'
                }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                                    Start Date
                                </label>
                                <input
                                    className={cl("input")}
                                    type="date"
                                    value={filter.startDate ? filter.startDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                                    End Date
                                </label>
                                <input
                                    className={cl("input")}
                                    type="date"
                                    value={filter.endDate ? filter.endDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>
                        </div>
                        
                        <div className={cl("checkbox")}>
                            <input
                                type="checkbox"
                                id="has-reason"
                                checked={filter.hasReason || false}
                                onChange={(e) => handleFilterChange('hasReason', e.target.checked)}
                            />
                            <label htmlFor="has-reason">Only entries with reasons</label>
                        </div>
                    </div>
                </div>

                {/* Audit Log Entries */}
                <div className={cl("audit-log-list")} style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto' 
                }}>
                    {isLoading ? (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            padding: '20px' 
                        }}>
                            <div className={cl("spinner")} />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '20px', 
                            color: 'var(--ms-pink-600)' 
                        }}>
                            No audit log entries found
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <AuditLogItem 
                                key={log.id} 
                                log={log} 
                                user={users.get(log.userId)}
                                showAvatar={settings.store.showAvatars}
                            />
                        ))
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
};

const AuditLogItem = ({ log, user, showAvatar }) => {
    const action = AUDIT_LOG_ACTIONS[log.actionType] || { 
        name: `Unknown Action (${log.actionType})`, 
        color: 'var(--ms-pink-500)' 
    };
    
    const timestamp = new Date(log.timestamp).toLocaleString();
    
    return (
        <div 
            className={cl("audit-log-item")}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                marginBottom: '8px',
                background: 'white',
                border: '1px solid var(--ms-pink-200)',
                borderRadius: 'var(--ms-border-radius)',
                borderLeft: `4px solid ${action.color}`
            }}
        >
            {showAvatar && user && (
                <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                    alt={user.username}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        flexShrink: 0
                    }}
                />
            )}
            
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px'
                }}>
                    <span style={{ 
                        fontWeight: 600, 
                        fontSize: '13px',
                        color: action.color
                    }}>
                        {action.name}
                    </span>
                    <span style={{ 
                        fontSize: '11px', 
                        color: 'var(--ms-pink-600)' 
                    }}>
                        {timestamp}
                    </span>
                </div>
                
                <div style={{ fontSize: '12px', color: 'var(--ms-pink-700)' }}>
                    <strong>{user?.username || 'Unknown User'}</strong>
                    {log.targetId && ` → Target: ${log.targetId}`}
                </div>
                
                {log.reason && (
                    <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--ms-pink-600)',
                        fontStyle: 'italic',
                        marginTop: '4px'
                    }}>
                        Reason: {log.reason}
                    </div>
                )}
            </div>
        </div>
    );
};
