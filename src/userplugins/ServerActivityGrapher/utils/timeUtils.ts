/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TimeRange {
    start: number;
    end: number;
    label: string;
}

export function getTimeRanges(): { [key: string]: TimeRange } {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    return {
        "1h": {
            start: now - hour,
            end: now,
            label: "Last Hour"
        },
        "6h": {
            start: now - (6 * hour),
            end: now,
            label: "Last 6 Hours"
        },
        "24h": {
            start: now - day,
            end: now,
            label: "Last 24 Hours"
        },
        "7d": {
            start: now - (7 * day),
            end: now,
            label: "Last 7 Days"
        },
        "30d": {
            start: now - (30 * day),
            end: now,
            label: "Last 30 Days"
        },
        "90d": {
            start: now - (90 * day),
            end: now,
            label: "Last 90 Days"
        },
        "all": {
            start: 0,
            end: now,
            label: "All Time"
        }
    };
}

export function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

export function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export function getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

export function getWeekdayName(dayIndex: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex] || 'Unknown';
}

export function generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

export function generateHourRange(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
}

export function getHeatmapData(
    hourlyData: { [hour: string]: number },
    dailyData: { [date: string]: number },
    days: number = 7
): Array<{ day: string; hour: number; value: number; date: string }> {
    const heatmapData: Array<{ day: string; hour: number; value: number; date: string }> = [];
    const now = new Date();
    
    // Generate data for the last N days
    for (let d = days - 1; d >= 0; d--) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        const dateString = date.toISOString().split('T')[0];
        const dayName = getWeekdayName(date.getDay());
        
        // For each hour of the day
        for (let hour = 0; hour < 24; hour++) {
            // This is a simplified approach - in reality you'd want to track
            // messages per hour per day more precisely
            const dailyCount = dailyData[dateString] || 0;
            const hourlyAverage = hourlyData[hour.toString()] || 0;
            
            // Estimate hourly activity for this specific day
            // This is a rough approximation - you might want to track this more precisely
            const value = Math.round((dailyCount / 24) * (hourlyAverage / 100) * 10);
            
            heatmapData.push({
                day: dayName,
                hour,
                value: Math.max(0, value),
                date: dateString
            });
        }
    }
    
    return heatmapData;
}

export function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    
    if (diff < minute) {
        return "Just now";
    } else if (diff < hour) {
        const minutes = Math.floor(diff / minute);
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diff < day) {
        const hours = Math.floor(diff / hour);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diff < week) {
        const days = Math.floor(diff / day);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (diff < month) {
        const weeks = Math.floor(diff / week);
        return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else {
        const months = Math.floor(diff / month);
        return `${months} month${months === 1 ? '' : 's'} ago`;
    }
}

export function isToday(timestamp: number): boolean {
    const today = new Date();
    const date = new Date(timestamp);
    
    return today.toDateString() === date.toDateString();
}

export function isThisWeek(timestamp: number): boolean {
    const now = new Date();
    const date = new Date(timestamp);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return date >= weekStart;
}

export function getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
}

export function formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

export function getActivityLevel(count: number, max: number): 'none' | 'low' | 'medium' | 'high' | 'very-high' {
    if (count === 0) return 'none';
    
    const percentage = (count / max) * 100;
    
    if (percentage < 20) return 'low';
    if (percentage < 40) return 'medium';
    if (percentage < 70) return 'high';
    return 'very-high';
}

export function generateTimeLabels(timeRange: string): string[] {
    const ranges = getTimeRanges();
    const range = ranges[timeRange];
    
    if (!range) return [];
    
    const labels: string[] = [];
    const duration = range.end - range.start;
    
    if (duration <= 24 * 60 * 60 * 1000) { // 24 hours or less
        // Show hourly labels
        const hours = Math.ceil(duration / (60 * 60 * 1000));
        for (let i = 0; i < hours; i++) {
            const time = new Date(range.start + (i * 60 * 60 * 1000));
            labels.push(formatHour(time.getHours()));
        }
    } else if (duration <= 7 * 24 * 60 * 60 * 1000) { // 7 days or less
        // Show daily labels
        const days = Math.ceil(duration / (24 * 60 * 60 * 1000));
        for (let i = 0; i < days; i++) {
            const date = new Date(range.start + (i * 24 * 60 * 60 * 1000));
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
    } else {
        // Show weekly labels
        const weeks = Math.ceil(duration / (7 * 24 * 60 * 60 * 1000));
        for (let i = 0; i < weeks; i++) {
            const date = new Date(range.start + (i * 7 * 24 * 60 * 60 * 1000));
            labels.push(`Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        }
    }
    
    return labels;
}
