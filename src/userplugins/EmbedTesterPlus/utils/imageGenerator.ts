// imageGenerator.ts
import { EmbedData, decimalToHex } from "./embedUtils";

export async function generateEmbedImage(embedData: EmbedData, darkMode: boolean = false): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            resolve("");
            return;
        }

        // Set up embed dimensions
        const embedWidth = 500;
        const embedPadding = 20;
        const embedContentWidth = embedWidth - (embedPadding * 2);

        // Create a temporary canvas to measure content height
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = embedWidth;
        tempCanvas.height = 5000; // Large height for measuring

        if (!tempCtx) {
            resolve("");
            return;
        }

        const theme = darkMode
            ? {
                  embedBg: "#36393f",
                  text: "#dcddde",
                  textMuted: "#b9bbbe",
              }
            : {
                  embedBg: "#f9f9f9",
                  text: "#2e3338",
                  textMuted: "#747f8d",
              };

        let currentY = embedPadding + 10; // Added 10px extra top padding

        const drawText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: {
            fontSize?: number;
            fontWeight?: string;
            color?: string;
            maxWidth?: number;
        } = {}): number => {
            const fontSize = options.fontSize || 14;
            const fontWeight = options.fontWeight || "normal";
            const color = options.color || theme.text;
            const maxWidth = options.maxWidth || embedContentWidth;

            ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = color;

            const words = text.split(" ");
            let line = "";
            let lineY = y;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + " ";
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, x, lineY);
                    line = words[i] + " ";
                    lineY += fontSize + 4;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, lineY);
            return lineY + fontSize + 8;
        };

        // Measure content height first
        if (embedData.author?.name) {
            currentY = drawText(tempCtx, embedData.author.name, embedPadding, currentY, {
                fontSize: 12,
                fontWeight: "bold",
            });
            currentY += 8;
        }

        if (embedData.title) {
            currentY = drawText(tempCtx, embedData.title, embedPadding, currentY, {
                fontSize: 16,
                fontWeight: "bold",
            });
            currentY += 8;
        }

        if (embedData.description) {
            currentY = drawText(tempCtx, embedData.description, embedPadding, currentY, {
                fontSize: 14,
            });
            currentY += 12;
        }

        if (embedData.fields?.length) {
            let inlineFields: any[] = [];
            let currentRowY = currentY;

            for (let i = 0; i < embedData.fields.length; i++) {
                const field = embedData.fields[i];

                if (field.inline && inlineFields.length < 3) {
                    inlineFields.push(field);

                    if (inlineFields.length === 3 || i === embedData.fields.length - 1) {
                        const fieldWidth = embedContentWidth / inlineFields.length;
                        let fieldX = embedPadding;
                        let maxRowHeight = currentRowY;

                        for (const f of inlineFields) {
                            let fieldY = currentRowY;
                            fieldY = drawText(tempCtx, f.name, fieldX, fieldY, { fontSize: 14, fontWeight: "bold", maxWidth: fieldWidth - 10 });
                            fieldY = drawText(tempCtx, f.value, fieldX, fieldY, { fontSize: 14, maxWidth: fieldWidth - 10 });
                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                        currentRowY = currentY;
                    }
                } else {
                    if (inlineFields.length > 0) {
                        const fieldWidth = embedContentWidth / inlineFields.length;
                        let fieldX = embedPadding;
                        let maxRowHeight = currentRowY;

                        for (const f of inlineFields) {
                            let fieldY = currentRowY;
                            fieldY = drawText(tempCtx, f.name, fieldX, fieldY, { fontSize: 14, fontWeight: "bold", maxWidth: fieldWidth - 10 });
                            fieldY = drawText(tempCtx, f.value, fieldX, fieldY, { fontSize: 14, maxWidth: fieldWidth - 10 });
                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                    }

                    currentY = drawText(tempCtx, field.name, embedPadding, currentY, { fontSize: 14, fontWeight: "bold" });
                    currentY = drawText(tempCtx, field.value, embedPadding, currentY, { fontSize: 14 });
                    currentY += 12;
                    currentRowY = currentY;
                }
            }
        }

        if (embedData.footer?.text || embedData.timestamp) {
            currentY += 12;
            let footer = embedData.footer?.text || "";
            if (embedData.timestamp) {
                if (footer) footer += " • ";
                footer += new Date(embedData.timestamp).toLocaleString();
            }
            drawText(tempCtx, footer, embedPadding, currentY, { fontSize: 12, color: theme.textMuted });
        }

        const embedHeight = currentY + embedPadding;

        // Now create the final canvas with proper dimensions
        const finalPadding = 40;
        const watermarkHeight = 50;
        const finalWidth = embedWidth + (finalPadding * 2);
        const finalHeight = embedHeight + (finalPadding * 2) + watermarkHeight;

        const finalCanvas = document.createElement("canvas");
        const finalCtx = finalCanvas.getContext("2d");
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;

        if (!finalCtx) {
            resolve("");
            return;
        }

        // Draw gradient background
        const gradient = finalCtx.createRadialGradient(
            finalWidth / 2, finalHeight / 3, 0,
            finalWidth / 2, finalHeight / 3, Math.max(finalWidth, finalHeight) * 0.8
        );
        gradient.addColorStop(0, "#be185d");
        gradient.addColorStop(0.3, "#9d174d");
        gradient.addColorStop(0.6, "#831843");
        gradient.addColorStop(1, "#500724");
        finalCtx.fillStyle = gradient;
        finalCtx.fillRect(0, 0, finalWidth, finalHeight);

        // Calculate embed position (centered)
        const embedX = finalPadding;
        const embedY = finalPadding;

        // Draw white background box for embed with enhanced shadow
        finalCtx.shadowColor = "rgba(0, 0, 0, 0.25)";
        finalCtx.shadowBlur = 20;
        finalCtx.shadowOffsetX = 0;
        finalCtx.shadowOffsetY = 8;
        finalCtx.fillStyle = "rgba(255, 255, 255, 0.98)";
        finalCtx.fillRect(embedX, embedY, embedWidth, embedHeight);
        finalCtx.shadowColor = "transparent";

        // Draw embed background
        finalCtx.fillStyle = theme.embedBg;
        finalCtx.fillRect(embedX, embedY, embedWidth, embedHeight);

        // Draw colored border
        const borderColor = embedData.color ? decimalToHex(embedData.color) : "#5865f2";
        finalCtx.fillStyle = borderColor;
        finalCtx.fillRect(embedX, embedY, 4, embedHeight);

        // Reset currentY and draw actual content with extra top padding
        currentY = embedY + embedPadding + 10; // Added 10px extra top padding

        if (embedData.author?.name) {
            currentY = drawText(finalCtx, embedData.author.name, embedX + embedPadding, currentY, {
                fontSize: 12,
                fontWeight: "bold",
            });
            currentY += 8;
        }

        if (embedData.title) {
            currentY = drawText(finalCtx, embedData.title, embedX + embedPadding, currentY, {
                fontSize: 16,
                fontWeight: "bold",
                color: embedData.url ? "#00b0f4" : theme.text,
            });
            currentY += 8;
        }

        if (embedData.description) {
            currentY = drawText(finalCtx, embedData.description, embedX + embedPadding, currentY, {
                fontSize: 14,
            });
            currentY += 12;
        }

        if (embedData.fields?.length) {
            let inlineFields: any[] = [];
            let currentRowY = currentY;

            for (let i = 0; i < embedData.fields.length; i++) {
                const field = embedData.fields[i];

                if (field.inline && inlineFields.length < 3) {
                    inlineFields.push(field);

                    if (inlineFields.length === 3 || i === embedData.fields.length - 1) {
                        const fieldWidth = embedContentWidth / inlineFields.length;
                        let fieldX = embedX + embedPadding;
                        let maxRowHeight = currentRowY;

                        for (const f of inlineFields) {
                            let fieldY = currentRowY;
                            fieldY = drawText(finalCtx, f.name, fieldX, fieldY, { fontSize: 14, fontWeight: "bold", maxWidth: fieldWidth - 10 });
                            fieldY = drawText(finalCtx, f.value, fieldX, fieldY, { fontSize: 14, maxWidth: fieldWidth - 10 });
                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                        currentRowY = currentY;
                    }
                } else {
                    if (inlineFields.length > 0) {
                        const fieldWidth = embedContentWidth / inlineFields.length;
                        let fieldX = embedX + embedPadding;
                        let maxRowHeight = currentRowY;

                        for (const f of inlineFields) {
                            let fieldY = currentRowY;
                            fieldY = drawText(finalCtx, f.name, fieldX, fieldY, { fontSize: 14, fontWeight: "bold", maxWidth: fieldWidth - 10 });
                            fieldY = drawText(finalCtx, f.value, fieldX, fieldY, { fontSize: 14, maxWidth: fieldWidth - 10 });
                            maxRowHeight = Math.max(maxRowHeight, fieldY);
                            fieldX += fieldWidth;
                        }

                        currentY = maxRowHeight + 12;
                        inlineFields = [];
                    }

                    currentY = drawText(finalCtx, field.name, embedX + embedPadding, currentY, { fontSize: 14, fontWeight: "bold" });
                    currentY = drawText(finalCtx, field.value, embedX + embedPadding, currentY, { fontSize: 14 });
                    currentY += 12;
                    currentRowY = currentY;
                }
            }
        }

        if (embedData.footer?.text || embedData.timestamp) {
            currentY += 12;
            let footer = embedData.footer?.text || "";
            if (embedData.timestamp) {
                if (footer) footer += " • ";
                footer += new Date(embedData.timestamp).toLocaleString();
            }
            drawText(finalCtx, footer, embedX + embedPadding, currentY, { fontSize: 12, color: theme.textMuted });
        }

        // Draw watermark with subtle background
        finalCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
        finalCtx.fillRect(0, finalHeight - 35, finalWidth, 35);
        
        finalCtx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        finalCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
        finalCtx.textAlign = "center";
        finalCtx.fillText("Generated by Embed Builder 🌸", finalWidth / 2, finalHeight - 12);
        finalCtx.textAlign = "left";

        resolve(finalCanvas.toDataURL("image/png"));
    });
}

export function downloadEmbedImage(dataUrl: string, filename: string = "embed-preview.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function copyEmbedImageToClipboard(dataUrl: string): Promise<boolean> {
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
            new ClipboardItem({
                "image/png": blob,
            }),
        ]);

        return true;
    } catch (error) {
        console.error("Failed to copy image to clipboard:", error);
        return false;
    }
}