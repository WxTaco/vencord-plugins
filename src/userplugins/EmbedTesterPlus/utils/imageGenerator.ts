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

        // Helper function to draw rounded rectangle
        const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };

        // We'll draw the embed background after we know the content height
        // For now, just set up the border color
        const borderColor = embedData.color ? decimalToHex(embedData.color) : '#5865f2';

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

        // Draw fields with inline support
        if (embedData.fields && embedData.fields.length > 0) {
            let inlineFields: any[] = [];
            let currentRowY = currentY;

            for (let i = 0; i < embedData.fields.length; i++) {
                const field = embedData.fields[i];

                if (field.inline && inlineFields.length < 3) {
                    // Collect inline fields (max 3 per row)
                    inlineFields.push(field);

                    // If we have 3 inline fields or this is the last field, render the row
                    if (inlineFields.length === 3 || i === embedData.fields.length - 1) {
                        const fieldWidth = (embedWidth - 40) / inlineFields.length;
                        let fieldX = embedX + 20;
                        let maxRowHeight = currentRowY;

                        // Draw each inline field in the row
                        for (const inlineField of inlineFields) {
                            let fieldY = currentRowY;

                            // Field name
                            fieldY = drawText(inlineField.name, fieldX, fieldY, {
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: theme.text,
                                maxWidth: fieldWidth - 10
                            });

                            // Field value
                            fieldY = drawText(inlineField.value, fieldX, fieldY, {
                                fontSize: 14,
                                color: theme.text,
                                maxWidth: fieldWidth - 10
                            });

                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                        currentRowY = currentY;
                    }
                } else {
                    // Render any pending inline fields first
                    if (inlineFields.length > 0) {
                        const fieldWidth = (embedWidth - 40) / inlineFields.length;
                        let fieldX = embedX + 20;
                        let maxRowHeight = currentRowY;

                        for (const inlineField of inlineFields) {
                            let fieldY = currentRowY;

                            fieldY = drawText(inlineField.name, fieldX, fieldY, {
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: theme.text,
                                maxWidth: fieldWidth - 10
                            });

                            fieldY = drawText(inlineField.value, fieldX, fieldY, {
                                fontSize: 14,
                                color: theme.text,
                                maxWidth: fieldWidth - 10
                            });

                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                    }

                    // Draw non-inline field
                    currentY = drawText(field.name, embedX + 20, currentY, {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: theme.text
                    });

                    currentY = drawText(field.value, embedX + 20, currentY, {
                        fontSize: 14,
                        color: theme.text
                    });
                    currentY += 12;
                    currentRowY = currentY;
                }
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

        // Now draw the embed background with the correct height
        const embedHeight = currentY - embedY + 20; // Height based on actual content

        ctx.fillStyle = theme.embedBg;
        ctx.fillRect(embedX, embedY, embedWidth, embedHeight);

        // Left border (color) - sharp corners
        ctx.fillStyle = borderColor;
        ctx.fillRect(embedX, embedY, 4, embedHeight);

        // Calculate actual content height from the canvas
        const actualContentHeight = currentY + 20; // Actual content height
        const actualEmbedHeight = embedHeight; // Store the actual embed height for later use
        const padding = 60;
        const watermarkHeight = 35;
        const finalWidth = Math.max(canvas.width + padding * 2, 700);
        const finalHeight = actualContentHeight + padding + watermarkHeight + 20; // Reduced total height

        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
            finalCanvas.width = finalWidth;
            finalCanvas.height = finalHeight;

            // Helper function to draw rounded rectangle for final canvas
            const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
                finalCtx.beginPath();
                finalCtx.moveTo(x + radius, y);
                finalCtx.lineTo(x + width - radius, y);
                finalCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
                finalCtx.lineTo(x + width, y + height - radius);
                finalCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                finalCtx.lineTo(x + radius, y + height);
                finalCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
                finalCtx.lineTo(x, y + radius);
                finalCtx.quadraticCurveTo(x, y, x + radius, y);
                finalCtx.closePath();
            };

            // Create dark pink gradient background
            const gradient = finalCtx.createRadialGradient(
                finalWidth / 2, finalHeight / 3, 0,
                finalWidth / 2, finalHeight / 3, Math.max(finalWidth, finalHeight) * 0.8
            );
            gradient.addColorStop(0, '#be185d'); // Dark pink center
            gradient.addColorStop(0.3, '#9d174d'); // Deeper pink
            gradient.addColorStop(0.6, '#831843'); // Very deep pink
            gradient.addColorStop(1, '#500724'); // Almost black pink edge
            finalCtx.fillStyle = gradient;
            finalCtx.fillRect(0, 0, finalWidth, finalHeight);

            // Add subtle overlay gradient for depth
            const overlayGradient = finalCtx.createLinearGradient(0, 0, 0, finalHeight);
            overlayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
            overlayGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
            overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            finalCtx.fillStyle = overlayGradient;
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

            // Add rounded gray background behind the embed
            const bgPadding = 20;
            const bgX = embedCenterX - bgPadding;
            const bgY = embedCenterY - bgPadding;
            const bgWidth = canvas.width + bgPadding * 2;
            const bgHeight = actualEmbedHeight + bgPadding * 2; // Use actual embed height, not full content height
            const bgRadius = 16;

            // Draw rounded background with shadow
            finalCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            finalCtx.shadowBlur = 25;
            finalCtx.shadowOffsetX = 0;
            finalCtx.shadowOffsetY = 12;

            finalCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            drawRoundedRect(bgX, bgY, bgWidth, bgHeight, bgRadius);
            finalCtx.fill();

            // Reset shadow for embed
            finalCtx.shadowColor = 'transparent';
            finalCtx.shadowBlur = 0;
            finalCtx.shadowOffsetX = 0;
            finalCtx.shadowOffsetY = 0;

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
