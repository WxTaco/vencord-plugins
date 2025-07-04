/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export async function exportToCSV(activityData: any, filename: string): Promise<void> {
    const csvData: string[] = [];
    
    // Add header
    csvData.push('Export Type,Date,Hour,Value,Additional Info');
    
    // Add hourly data
    Object.entries(activityData.hourly || {}).forEach(([hour, count]) => {
        csvData.push(`Hourly Activity,${new Date().toISOString().split('T')[0]},${hour},${count},Messages per hour`);
    });
    
    // Add daily data
    Object.entries(activityData.daily || {}).forEach(([date, count]) => {
        csvData.push(`Daily Activity,${date},,${count},Messages per day`);
    });
    
    // Add channel data
    Object.entries(activityData.channels || {}).forEach(([channelId, count]) => {
        csvData.push(`Channel Activity,${new Date().toISOString().split('T')[0]},,${count},Channel: ${channelId}`);
    });
    
    // Add top users
    if (activityData.topUsers) {
        activityData.topUsers.forEach((user: any) => {
            csvData.push(`Top Users,${new Date().toISOString().split('T')[0]},,${user.count},User: ${user.username} (${user.userId})`);
        });
    }
    
    // Add ping stats
    if (activityData.pings) {
        csvData.push(`Ping Stats,${new Date().toISOString().split('T')[0]},,${activityData.pings.everyone},@everyone pings`);
        csvData.push(`Ping Stats,${new Date().toISOString().split('T')[0]},,${activityData.pings.here},@here pings`);
        
        Object.entries(activityData.pings.roles || {}).forEach(([roleId, count]) => {
            csvData.push(`Ping Stats,${new Date().toISOString().split('T')[0]},,${count},Role ping: ${roleId}`);
        });
    }
    
    // Add join/leave stats
    if (activityData.joinLeave) {
        csvData.push(`Join/Leave Stats,${new Date().toISOString().split('T')[0]},,${activityData.joinLeave.joins},User joins`);
        csvData.push(`Join/Leave Stats,${new Date().toISOString().split('T')[0]},,${activityData.joinLeave.leaves},User leaves`);
        csvData.push(`Join/Leave Stats,${new Date().toISOString().split('T')[0]},,${activityData.joinLeave.net},Net change`);
    }
    
    // Add summary stats
    if (activityData.summary) {
        csvData.push(`Summary,${new Date().toISOString().split('T')[0]},,${activityData.summary.totalMessages},Total messages`);
        csvData.push(`Summary,${new Date().toISOString().split('T')[0]},,${activityData.summary.uniqueUsers},Unique users`);
        csvData.push(`Summary,${new Date().toISOString().split('T')[0]},,${Math.round(activityData.summary.averagePerDay)},Average messages per day`);
        csvData.push(`Summary,${new Date().toISOString().split('T')[0]},,${activityData.summary.messagesWithAttachments},Messages with attachments`);
        csvData.push(`Summary,${new Date().toISOString().split('T')[0]},,${activityData.summary.messagesWithEmbeds},Messages with embeds`);
        
        if (activityData.summary.mostActiveHour) {
            csvData.push(`Summary,${new Date().toISOString().split('T')[0]},${activityData.summary.mostActiveHour.hour},${activityData.summary.mostActiveHour.count},Most active hour`);
        }
    }
    
    // Create and download CSV
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
}

export async function exportToJSON(activityData: any, filename: string): Promise<void> {
    const jsonData = {
        exportInfo: {
            timestamp: new Date().toISOString(),
            version: "1.0",
            plugin: "ServerActivityGrapher"
        },
        data: activityData
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `${filename}.json`);
}

export async function exportToPNG(activityData: any, filename: string, themeColors: any): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        throw new Error('Canvas context not available');
    }
    
    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = '#0277bd';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Server Activity Report', canvas.width / 2, 40);
    
    // Subtitle
    ctx.fillStyle = '#666666';
    ctx.font = '16px Arial';
    ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, canvas.width / 2, 70);
    
    let currentY = 120;
    
    // Summary stats
    if (activityData.summary) {
        ctx.fillStyle = '#0277bd';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Summary Statistics', 50, currentY);
        currentY += 30;
        
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        
        const stats = [
            `Total Messages: ${activityData.summary.totalMessages}`,
            `Active Users: ${activityData.summary.uniqueUsers}`,
            `Average Messages/Day: ${Math.round(activityData.summary.averagePerDay)}`,
            `Messages with Attachments: ${activityData.summary.messagesWithAttachments}`,
            `Messages with Embeds: ${activityData.summary.messagesWithEmbeds}`
        ];
        
        if (activityData.summary.mostActiveHour) {
            stats.push(`Most Active Hour: ${formatHour(activityData.summary.mostActiveHour.hour)} (${activityData.summary.mostActiveHour.count} messages)`);
        }
        
        stats.forEach(stat => {
            ctx.fillText(stat, 70, currentY);
            currentY += 25;
        });
        
        currentY += 20;
    }
    
    // Hourly activity chart
    if (activityData.hourly) {
        ctx.fillStyle = '#0277bd';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Hourly Activity', 50, currentY);
        currentY += 40;
        
        const chartX = 70;
        const chartY = currentY;
        const chartWidth = 1000;
        const chartHeight = 200;
        
        // Chart background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
        
        // Chart border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);
        
        // Draw bars
        const hours = Object.keys(activityData.hourly).sort((a, b) => parseInt(a) - parseInt(b));
        const maxValue = Math.max(...Object.values(activityData.hourly) as number[]);
        const barWidth = chartWidth / hours.length;
        
        hours.forEach((hour, index) => {
            const value = activityData.hourly[hour] || 0;
            const barHeight = maxValue > 0 ? (value / maxValue) * (chartHeight - 20) : 0;
            
            // Bar
            const gradient = ctx.createLinearGradient(0, chartY + chartHeight - barHeight, 0, chartY + chartHeight);
            gradient.addColorStop(0, themeColors.primary);
            gradient.addColorStop(1, themeColors.secondary);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                chartX + (index * barWidth) + 2,
                chartY + chartHeight - barHeight - 10,
                barWidth - 4,
                barHeight
            );
            
            // Hour label
            ctx.fillStyle = '#666666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                formatHour(parseInt(hour)),
                chartX + (index * barWidth) + (barWidth / 2),
                chartY + chartHeight + 15
            );
            
            // Value label
            if (value > 0) {
                ctx.fillStyle = '#333333';
                ctx.font = '9px Arial';
                ctx.fillText(
                    value.toString(),
                    chartX + (index * barWidth) + (barWidth / 2),
                    chartY + chartHeight - barHeight - 15
                );
            }
        });
        
        currentY += chartHeight + 50;
    }
    
    // Top users
    if (activityData.topUsers && activityData.topUsers.length > 0) {
        ctx.fillStyle = '#0277bd';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Top Active Users', 50, currentY);
        currentY += 30;
        
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        
        activityData.topUsers.slice(0, 10).forEach((user: any, index: number) => {
            ctx.fillText(`${index + 1}. ${user.username}: ${user.count} messages`, 70, currentY);
            currentY += 25;
        });
    }
    
    // Watermark
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Generated by ServerActivityGrapher', canvas.width - 20, canvas.height - 20);
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
        if (blob) {
            downloadBlob(blob, `${filename}.png`);
        }
    }, 'image/png');
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}
