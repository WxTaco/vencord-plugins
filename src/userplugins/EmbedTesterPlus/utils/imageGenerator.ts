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

        // Adjust canvas height to content
        const finalHeight = Math.max(currentY + 50, 200);
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
            finalCanvas.width = canvas.width;
            finalCanvas.height = finalHeight;

            // Copy content to final canvas
            finalCtx.drawImage(canvas, 0, 0);

            // Add watermark
            finalCtx.font = '10px Arial';
            finalCtx.fillStyle = theme.textMuted;
            finalCtx.fillText('Generated by Embed Builder 🌸', embedX + 20, finalHeight - 20);
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
