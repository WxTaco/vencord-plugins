/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EmbedData, decimalToHex } from "./embedUtils";

export async function generateEmbedImage(embedData: EmbedData, darkMode: boolean = false): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            resolve('');
            return;
        }

        // Set canvas size
        canvas.width = 600;
        canvas.height = 400; // Will adjust based on content

        // Theme colors
        const theme = darkMode ? {
            background: '#2f3136',
            embedBg: '#36393f',
            text: '#dcddde',
            textMuted: '#b9bbbe',
            border: '#202225'
        } : {
            background: '#ffffff',
            embedBg: '#f9f9f9',
            text: '#2e3338',
            textMuted: '#747f8d',
            border: '#e3e5e8'
        };

        // Clear canvas with background
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw embed container
        const embedX = 50;
        const embedY = 50;
        const embedWidth = 500;
        let currentY = embedY + 20;

        // Embed background
        ctx.fillStyle = theme.embedBg;
        ctx.fillRect(embedX, embedY, embedWidth, canvas.height - 100);

        // Left border (color)
        const borderColor = embedData.color ? decimalToHex(embedData.color) : '#5865f2';
        ctx.fillStyle = borderColor;
        ctx.fillRect(embedX, embedY, 4, canvas.height - 100);

        // Helper function to draw text
        const drawText = (text: string, x: number, y: number, options: {
            fontSize?: number;
            fontWeight?: string;
            color?: string;
            maxWidth?: number;
        } = {}) => {
            const fontSize = options.fontSize || 14;
            const fontWeight = options.fontWeight || 'normal';
            const color = options.color || theme.text;
            const maxWidth = options.maxWidth || embedWidth - 40;

            ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = color;

            // Simple text wrapping
            const words = text.split(' ');
            let line = '';
            let lineY = y;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, x, lineY);
                    line = words[i] + ' ';
                    lineY += fontSize + 4;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, lineY);

            return lineY + fontSize + 8;
        };

        // Draw author
        if (embedData.author?.name) {
            currentY = drawText(embedData.author.name, embedX + 20, currentY, {
                fontSize: 12,
                fontWeight: 'bold',
                color: theme.text
            });
            currentY += 8;
        }

        // Draw title
        if (embedData.title) {
            currentY = drawText(embedData.title, embedX + 20, currentY, {
                fontSize: 16,
                fontWeight: 'bold',
                color: embedData.url ? '#00b0f4' : theme.text
            });
            currentY += 8;
        }

        // Draw description
        if (embedData.description) {
            currentY = drawText(embedData.description, embedX + 20, currentY, {
                fontSize: 14,
                color: theme.text
            });
            currentY += 12;
        }

        // Draw fields
        if (embedData.fields && embedData.fields.length > 0) {
            for (const field of embedData.fields) {
                // Field name
                currentY = drawText(field.name, embedX + 20, currentY, {
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: theme.text
                });

                // Field value
                currentY = drawText(field.value, embedX + 20, currentY, {
                    fontSize: 14,
                    color: theme.text
                });
                currentY += 8;
            }
        }

        // Draw footer
        if (embedData.footer?.text || embedData.timestamp) {
            currentY += 12;
            let footerText = '';

            if (embedData.footer?.text) {
                footerText += embedData.footer.text;
            }

            if (embedData.timestamp) {
                if (footerText) footerText += ' • ';
                footerText += new Date(embedData.timestamp).toLocaleString();
            }

            if (footerText) {
                drawText(footerText, embedX + 20, currentY, {
                    fontSize: 12,
                    color: theme.textMuted
                });
            }
        }

        // Calculate actual content height from the canvas
        const actualContentHeight = currentY + 20; // Actual content height
        const padding = 60;
        const watermarkHeight = 35;
        const finalWidth = Math.max(canvas.width + padding * 2, 700);
        const finalHeight = actualContentHeight + padding + watermarkHeight + 20; // Reduced total height

        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
            finalCanvas.width = finalWidth;
            finalCanvas.height = finalHeight;

            // Create background with subtle gradient that covers the full canvas
            const gradient = finalCtx.createLinearGradient(0, 0, finalWidth, finalHeight);
            gradient.addColorStop(0, theme.background);
            gradient.addColorStop(0.5, theme.backgroundSecondary || theme.background);
            gradient.addColorStop(1, theme.background);
            finalCtx.fillStyle = gradient;
            finalCtx.fillRect(0, 0, finalWidth, finalHeight);

            // Add subtle texture across the full canvas
            for (let i = 0; i < 30; i++) {
                finalCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
                const size = Math.random() * 2 + 1;
                finalCtx.fillRect(
                    Math.random() * finalWidth,
                    Math.random() * finalHeight,
                    size,
                    size
                );
            }

            // Calculate centered position for embed
            const embedCenterX = (finalWidth - canvas.width) / 2;
            const embedCenterY = 30; // Fixed top position

            // Add subtle shadow behind embed
            finalCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            finalCtx.shadowBlur = 20;
            finalCtx.shadowOffsetX = 0;
            finalCtx.shadowOffsetY = 8;

            // Copy embed content to centered position
            finalCtx.drawImage(canvas, embedCenterX, embedCenterY);

            // Reset shadow
            finalCtx.shadowColor = 'transparent';
            finalCtx.shadowBlur = 0;
            finalCtx.shadowOffsetX = 0;
            finalCtx.shadowOffsetY = 0;

            // Add subtle watermark at bottom right corner
            const watermarkY = actualContentHeight + embedCenterY + 10; // Position relative to content

            // Create a subtle watermark area
            const watermarkWidth = 280;
            const watermarkX = finalWidth - watermarkWidth - 20;

            // Very subtle background for watermark
            finalCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            finalCtx.fillRect(watermarkX - 10, watermarkY, watermarkWidth + 20, 25);

            // Subtle border
            finalCtx.strokeStyle = 'rgba(190, 24, 93, 0.2)';
            finalCtx.lineWidth = 1;
            finalCtx.strokeRect(watermarkX - 10, watermarkY, watermarkWidth + 20, 25);

            // Watermark text - smaller and more subtle
            finalCtx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            finalCtx.fillStyle = 'rgba(190, 24, 93, 0.6)';
            finalCtx.textAlign = 'left';
            finalCtx.fillText('Generated by Embed Builder 🌸', watermarkX, watermarkY + 16);
        }

        // Convert to data URL
        const dataUrl = finalCanvas.toDataURL('image/png');
        resolve(dataUrl);
    });
}

export function downloadEmbedImage(dataUrl: string, filename: string = 'embed-preview.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function copyEmbedImageToClipboard(dataUrl: string): Promise<boolean> {
    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Copy to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);

        return true;
    } catch (error) {
        console.error('Failed to copy image to clipboard:', error);
        return false;
    }
}
