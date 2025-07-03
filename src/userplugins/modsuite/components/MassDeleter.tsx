/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Constants, MessageStore, RestAPI, showToast, Toasts } from "@webpack/common";
import { React, useState } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import { settings } from "../settings";
import { BulkActionProgress, MassDeleteFilter, MassDeletePreview } from "../types";

const cl = classNameFactory("ms-");

interface MassDeleterProps {
    channel: Channel;
    onClose?: () => void;
}

export const MassDeleter: React.FC<MassDeleterProps> = ({ channel, onClose }) => {
    const [filter, setFilter] = useState<MassDeleteFilter>({
        messageType: 'all'
    });
    const [preview, setPreview] = useState<MassDeletePreview | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<BulkActionProgress>({
        total: 0,
        completed: 0,
        failed: 0,
        isRunning: false
    });

    const handleFilterChange = (key: keyof MassDeleteFilter, value: any) => {
        setFilter(prev => ({ ...prev, [key]: value }));
        setPreview(null); // Clear preview when filter changes
    };

    const generatePreview = async () => {
        if (!channel) return;
        
        setIsLoading(true);
        try {
            // Get messages from the channel
            const messages = MessageStore.getMessages(channel.id);
            if (!messages) {
                showToast('No messages found in channel', Toasts.Type.MESSAGE);
                return;
            }

            // Filter messages based on criteria
            const filteredMessages = filterMessages(messages.toArray(), filter);
            
            // Limit to max bulk delete count
            const limitedMessages = filteredMessages.slice(0, settings.store.maxBulkDeleteCount);
            
            // Group by channels (for future multi-channel support)
            const channelGroups = [{ 
                id: channel.id, 
                name: channel.name || 'Unknown Channel', 
                count: limitedMessages.length 
            }];

            setPreview({
                messages: limitedMessages,
                totalCount: filteredMessages.length,
                estimatedTime: Math.ceil(limitedMessages.length / 10), // Rough estimate: 10 messages per second
                channels: channelGroups
            });
        } catch (error) {
            console.error('Failed to generate preview:', error);
            showToast('Failed to generate preview', Toasts.Type.FAILURE);
        } finally {
            setIsLoading(false);
        }
    };

    const executeDelete = async () => {
        if (!preview || !channel) return;
        
        if (settings.store.requireConfirmation) {
            const confirmed = confirm(
                `Are you sure you want to delete ${preview.messages.length} messages? This action cannot be undone.`
            );
            if (!confirmed) return;
        }

        setProgress({
            total: preview.messages.length,
            completed: 0,
            failed: 0,
            isRunning: true
        });

        try {
            // Delete messages in batches
            const batchSize = 100; // Discord's bulk delete limit
            const batches = [];
            
            for (let i = 0; i < preview.messages.length; i += batchSize) {
                batches.push(preview.messages.slice(i, i + batchSize));
            }

            for (const batch of batches) {
                try {
                    if (batch.length === 1) {
                        // Single message delete
                        await RestAPI.delete({
                            url: Constants.Endpoints.MESSAGE(channel.id, batch[0].id)
                        });
                    } else {
                        // Bulk delete
                        await RestAPI.post({
                            url: Constants.Endpoints.BULK_DELETE(channel.id),
                            body: {
                                messages: batch.map(m => m.id)
                            }
                        });
                    }
                    
                    setProgress(prev => ({
                        ...prev,
                        completed: prev.completed + batch.length
                    }));
                } catch (error) {
                    console.error('Failed to delete batch:', error);
                    setProgress(prev => ({
                        ...prev,
                        failed: prev.failed + batch.length
                    }));
                }
                
                // Small delay between batches to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            showToast(
                `Deletion complete: ${progress.completed} deleted, ${progress.failed} failed`,
                progress.failed > 0 ? Toasts.Type.MESSAGE : Toasts.Type.SUCCESS
            );
            
            setPreview(null);
        } catch (error) {
            console.error('Mass deletion failed:', error);
            showToast('Mass deletion failed', Toasts.Type.FAILURE);
        } finally {
            setProgress(prev => ({ ...prev, isRunning: false }));
        }
    };

    return (
        <ErrorBoundary noop>
            <div className={cl("mass-deleter")}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--ms-pink-800)' }}>
                    Mass Message Deletion
                </h3>

                {/* Filter Controls */}
                <div className={cl("filter-section")} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                                Keyword Filter
                            </label>
                            <input
                                className={cl("input")}
                                type="text"
                                placeholder="Search for messages containing..."
                                value={filter.keyword || ''}
                                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
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
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
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

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                                Message Type
                            </label>
                            <select
                                className={cl("select")}
                                value={filter.messageType || 'all'}
                                onChange={(e) => handleFilterChange('messageType', e.target.value)}
                            >
                                <option value="all">All Messages</option>
                                <option value="text">Text Only</option>
                                <option value="media">Media Only</option>
                                <option value="embeds">Embeds Only</option>
                            </select>
                        </div>

                        <div className={cl("checkbox")}>
                            <input
                                type="checkbox"
                                id="has-attachments"
                                checked={filter.hasAttachments || false}
                                onChange={(e) => handleFilterChange('hasAttachments', e.target.checked)}
                            />
                            <label htmlFor="has-attachments">Only messages with attachments</label>
                        </div>
                    </div>

                    <button
                        className={cl("button")}
                        onClick={generatePreview}
                        disabled={isLoading}
                        style={{ marginTop: '12px', width: '100%' }}
                    >
                        {isLoading ? 'Generating Preview...' : 'Preview Deletion'}
                    </button>
                </div>

                {/* Preview Section */}
                {preview && (
                    <div className={cl("preview-section")} style={{ 
                        marginBottom: '16px',
                        padding: '12px',
                        background: 'var(--ms-pink-50)',
                        border: '1px solid var(--ms-pink-200)',
                        borderRadius: 'var(--ms-border-radius)'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                            Deletion Preview
                        </h4>
                        <div style={{ fontSize: '12px', color: 'var(--ms-pink-700)' }}>
                            <div>Messages to delete: {preview.messages.length}</div>
                            {preview.totalCount > preview.messages.length && (
                                <div>Total found: {preview.totalCount} (limited to {settings.store.maxBulkDeleteCount})</div>
                            )}
                            <div>Estimated time: ~{preview.estimatedTime} seconds</div>
                        </div>

                        {settings.store.showDeletePreview && preview.messages.length > 0 && (
                            <div style={{ 
                                marginTop: '8px', 
                                maxHeight: '150px', 
                                overflowY: 'auto',
                                fontSize: '11px'
                            }}>
                                {preview.messages.slice(0, 10).map(msg => (
                                    <div key={msg.id} style={{ 
                                        padding: '4px', 
                                        borderBottom: '1px solid var(--ms-pink-200)',
                                        wordBreak: 'break-word'
                                    }}>
                                        <strong>{msg.author?.username || 'Unknown'}:</strong> {msg.content || '[No content]'}
                                    </div>
                                ))}
                                {preview.messages.length > 10 && (
                                    <div style={{ padding: '4px', fontStyle: 'italic' }}>
                                        ...and {preview.messages.length - 10} more messages
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            className={cl("button", "danger")}
                            onClick={executeDelete}
                            disabled={progress.isRunning}
                            style={{ marginTop: '8px', width: '100%' }}
                        >
                            {progress.isRunning ? 'Deleting...' : `Delete ${preview.messages.length} Messages`}
                        </button>
                    </div>
                )}

                {/* Progress Section */}
                {progress.isRunning && (
                    <div className={cl("progress-section")} style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                            Progress: {progress.completed}/{progress.total} 
                            {progress.failed > 0 && ` (${progress.failed} failed)`}
                        </div>
                        <div className={cl("progress")}>
                            <div 
                                className={cl("progress-bar")}
                                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

// Helper function to filter messages based on criteria
function filterMessages(messages: Message[], filter: MassDeleteFilter): Message[] {
    return messages.filter(msg => {
        // Keyword filter
        if (filter.keyword && !msg.content?.toLowerCase().includes(filter.keyword.toLowerCase())) {
            return false;
        }

        // Date range filter
        const msgDate = new Date(msg.timestamp);
        if (filter.startDate && msgDate < filter.startDate) return false;
        if (filter.endDate && msgDate > filter.endDate) return false;

        // Message type filter
        if (filter.messageType && filter.messageType !== 'all') {
            switch (filter.messageType) {
                case 'text':
                    if (!msg.content || msg.attachments?.length > 0 || msg.embeds?.length > 0) return false;
                    break;
                case 'media':
                    if (!msg.attachments?.length) return false;
                    break;
                case 'embeds':
                    if (!msg.embeds?.length) return false;
                    break;
            }
        }

        // Attachments filter
        if (filter.hasAttachments !== undefined) {
            const hasAttachments = msg.attachments && msg.attachments.length > 0;
            if (filter.hasAttachments !== hasAttachments) return false;
        }

        // User filter
        if (filter.userId && msg.author?.id !== filter.userId) return false;

        return true;
    });
}
