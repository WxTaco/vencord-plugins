/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface EmbedData {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: {
        text: string;
        icon_url?: string;
    };
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export const defaultEmbed: EmbedData = {
    title: "Sample Embed Title",
    description: "This is a sample embed description. You can edit all fields using the visual editor or JSON editor.",
    color: 0x5865f2,
    timestamp: new Date().toISOString(),
    footer: {
        text: "Footer text"
    },
    fields: [
        {
            name: "Field 1",
            value: "This is the first field",
            inline: true
        },
        {
            name: "Field 2", 
            value: "This is the second field",
            inline: true
        }
    ]
};

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}

export function validateEmbed(embed: any): ValidationResult {
    const warnings: string[] = [];
    
    try {
        // Check if it's a valid object
        if (!embed || typeof embed !== 'object') {
            return { isValid: false, error: "Embed must be an object" };
        }

        // Validate title
        if (embed.title && typeof embed.title !== 'string') {
            return { isValid: false, error: "Title must be a string" };
        }
        if (embed.title && embed.title.length > 256) {
            return { isValid: false, error: "Title cannot exceed 256 characters" };
        }

        // Validate description
        if (embed.description && typeof embed.description !== 'string') {
            return { isValid: false, error: "Description must be a string" };
        }
        if (embed.description && embed.description.length > 4096) {
            return { isValid: false, error: "Description cannot exceed 4096 characters" };
        }

        // Validate color
        if (embed.color !== undefined) {
            if (typeof embed.color !== 'number' || embed.color < 0 || embed.color > 0xFFFFFF) {
                return { isValid: false, error: "Color must be a number between 0 and 16777215" };
            }
        }

        // Validate URL
        if (embed.url && typeof embed.url !== 'string') {
            return { isValid: false, error: "URL must be a string" };
        }

        // Validate timestamp
        if (embed.timestamp && typeof embed.timestamp !== 'string') {
            return { isValid: false, error: "Timestamp must be a string" };
        }
        if (embed.timestamp && isNaN(Date.parse(embed.timestamp))) {
            return { isValid: false, error: "Timestamp must be a valid ISO 8601 date string" };
        }

        // Validate footer
        if (embed.footer) {
            if (typeof embed.footer !== 'object') {
                return { isValid: false, error: "Footer must be an object" };
            }
            if (!embed.footer.text || typeof embed.footer.text !== 'string') {
                return { isValid: false, error: "Footer text is required and must be a string" };
            }
            if (embed.footer.text.length > 2048) {
                return { isValid: false, error: "Footer text cannot exceed 2048 characters" };
            }
        }

        // Validate author
        if (embed.author) {
            if (typeof embed.author !== 'object') {
                return { isValid: false, error: "Author must be an object" };
            }
            if (!embed.author.name || typeof embed.author.name !== 'string') {
                return { isValid: false, error: "Author name is required and must be a string" };
            }
            if (embed.author.name.length > 256) {
                return { isValid: false, error: "Author name cannot exceed 256 characters" };
            }
        }

        // Validate fields
        if (embed.fields) {
            if (!Array.isArray(embed.fields)) {
                return { isValid: false, error: "Fields must be an array" };
            }
            if (embed.fields.length > 25) {
                return { isValid: false, error: "Cannot have more than 25 fields" };
            }
            
            for (let i = 0; i < embed.fields.length; i++) {
                const field = embed.fields[i];
                if (typeof field !== 'object') {
                    return { isValid: false, error: `Field ${i + 1} must be an object` };
                }
                if (!field.name || typeof field.name !== 'string') {
                    return { isValid: false, error: `Field ${i + 1} name is required and must be a string` };
                }
                if (field.name.length > 256) {
                    return { isValid: false, error: `Field ${i + 1} name cannot exceed 256 characters` };
                }
                if (!field.value || typeof field.value !== 'string') {
                    return { isValid: false, error: `Field ${i + 1} value is required and must be a string` };
                }
                if (field.value.length > 1024) {
                    return { isValid: false, error: `Field ${i + 1} value cannot exceed 1024 characters` };
                }
            }
        }

        // Calculate total character count
        let totalChars = 0;
        if (embed.title) totalChars += embed.title.length;
        if (embed.description) totalChars += embed.description.length;
        if (embed.footer?.text) totalChars += embed.footer.text.length;
        if (embed.author?.name) totalChars += embed.author.name.length;
        if (embed.fields) {
            embed.fields.forEach((field: any) => {
                totalChars += field.name.length + field.value.length;
            });
        }

        if (totalChars > 6000) {
            warnings.push("Total embed character count exceeds 6000 characters");
        }

        return { isValid: true, warnings };
    } catch (error) {
        return { isValid: false, error: "Invalid JSON structure" };
    }
}

export function hexToDecimal(hex: string): number {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16);
}

export function decimalToHex(decimal: number): string {
    return '#' + decimal.toString(16).padStart(6, '0').toUpperCase();
}

export function exportEmbedAsJSON(embed: EmbedData): string {
    return JSON.stringify(embed, null, 2);
}

export function exportEmbedAsMarkdown(embed: EmbedData): string {
    let markdown = "```json\n";
    markdown += JSON.stringify({ embeds: [embed] }, null, 2);
    markdown += "\n```";
    return markdown;
}

export function generateTimestamp(date: Date, format: string = "f"): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    return `<t:${timestamp}:${format}>`;
}
