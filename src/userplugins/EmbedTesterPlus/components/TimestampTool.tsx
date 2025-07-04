/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useState } from "@webpack/common";
import { generateTimestamp } from "../utils/embedUtils";
import { Toasts } from "@webpack/common";

const showToast = (message: string, type: any) => {
    // Fallback toast implementation
    console.log(`Toast: ${message}`);
};

export function TimestampTool() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 16));
    const [selectedFormat, setSelectedFormat] = useState("f");

    const formats = [
        { value: "t", label: "Short Time", example: "16:20" },
        { value: "T", label: "Long Time", example: "16:20:30" },
        { value: "d", label: "Short Date", example: "20/04/2021" },
        { value: "D", label: "Long Date", example: "20 April 2021" },
        { value: "f", label: "Short Date/Time", example: "20 April 2021 16:20" },
        { value: "F", label: "Long Date/Time", example: "Tuesday, 20 April 2021 16:20" },
        { value: "R", label: "Relative Time", example: "2 months ago" }
    ];

    const generateAndCopy = (format: string) => {
        const date = new Date(selectedDate);
        const timestamp = generateTimestamp(date, format);
        navigator.clipboard.writeText(timestamp);
        showToast(`Copied: ${timestamp}`, Toasts.Type.SUCCESS);
    };

    const copyUnixTimestamp = () => {
        const date = new Date(selectedDate);
        const unix = Math.floor(date.getTime() / 1000);
        navigator.clipboard.writeText(unix.toString());
        showToast(`Copied Unix timestamp: ${unix}`, Toasts.Type.SUCCESS);
    };

    const copyISOString = () => {
        const date = new Date(selectedDate);
        const iso = date.toISOString();
        navigator.clipboard.writeText(iso);
        showToast(`Copied ISO string: ${iso}`, Toasts.Type.SUCCESS);
    };

    const setToNow = () => {
        setSelectedDate(new Date().toISOString().slice(0, 16));
    };

    const addTime = (minutes: number) => {
        const current = new Date(selectedDate);
        current.setMinutes(current.getMinutes() + minutes);
        setSelectedDate(current.toISOString().slice(0, 16));
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "8px",
        border: "1px solid #e3e5e8",
        borderRadius: "4px",
        fontSize: "14px",
        fontFamily: "inherit"
    };

    const buttonStyle: React.CSSProperties = {
        padding: "6px 12px",
        background: "#5865f2",
        color: "white",
        border: "none",
        borderRadius: "4px",
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: "500"
    };

    const quickButtonStyle: React.CSSProperties = {
        padding: "4px 8px",
        background: "#f0f0f0",
        color: "#333",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "11px",
        cursor: "pointer"
    };

    return (
        <div style={{ height: "100%", overflow: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#060607" }}>Discord Timestamp Generator</h3>
            
            {/* Date/Time Input */}
            <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: "#4f5660" 
                }}>
                    Select Date & Time
                </label>
                <input
                    type="datetime-local"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={inputStyle}
                />
            </div>

            {/* Quick Time Buttons */}
            <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: "#4f5660" 
                }}>
                    Quick Actions
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button onClick={setToNow} style={quickButtonStyle}>
                        Now
                    </button>
                    <button onClick={() => addTime(5)} style={quickButtonStyle}>
                        +5min
                    </button>
                    <button onClick={() => addTime(15)} style={quickButtonStyle}>
                        +15min
                    </button>
                    <button onClick={() => addTime(30)} style={quickButtonStyle}>
                        +30min
                    </button>
                    <button onClick={() => addTime(60)} style={quickButtonStyle}>
                        +1hr
                    </button>
                    <button onClick={() => addTime(1440)} style={quickButtonStyle}>
                        +1day
                    </button>
                    <button onClick={() => addTime(-5)} style={quickButtonStyle}>
                        -5min
                    </button>
                    <button onClick={() => addTime(-60)} style={quickButtonStyle}>
                        -1hr
                    </button>
                </div>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: "#4f5660" 
                }}>
                    Default Format
                </label>
                <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    style={inputStyle}
                >
                    {formats.map(format => (
                        <option key={format.value} value={format.value}>
                            {format.label} - {format.example}
                        </option>
                    ))}
                </select>
            </div>

            {/* Preview */}
            <div style={{ 
                marginBottom: "16px",
                padding: "12px",
                background: "#f9f9f9",
                border: "1px solid #e3e5e8",
                borderRadius: "6px"
            }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#4f5660" }}>
                    Preview
                </div>
                <div style={{ 
                    fontFamily: "monospace", 
                    fontSize: "13px", 
                    color: "#333",
                    background: "white",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd"
                }}>
                    {generateTimestamp(new Date(selectedDate), selectedFormat)}
                </div>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                    Renders as: {new Date(selectedDate).toLocaleString()}
                </div>
            </div>

            {/* Format Buttons */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#4f5660" }}>
                    Copy Timestamp Format
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                    {formats.map(format => (
                        <button
                            key={format.value}
                            onClick={() => generateAndCopy(format.value)}
                            style={{
                                ...buttonStyle,
                                background: format.value === selectedFormat ? "#5865f2" : "#6c757d",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                textAlign: "left"
                            }}
                        >
                            <span>{format.label}</span>
                            <span style={{ fontSize: "10px", opacity: 0.8 }}>
                                {generateTimestamp(new Date(selectedDate), format.value)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Other Formats */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#4f5660" }}>
                    Other Formats
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                        onClick={copyUnixTimestamp}
                        style={{
                            ...buttonStyle,
                            background: "#28a745"
                        }}
                    >
                        Copy Unix Timestamp
                    </button>
                    <button
                        onClick={copyISOString}
                        style={{
                            ...buttonStyle,
                            background: "#17a2b8"
                        }}
                    >
                        Copy ISO String
                    </button>
                </div>
            </div>

            {/* Info */}
            <div style={{
                padding: "12px",
                background: "#e3f2fd",
                border: "1px solid #bbdefb",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#1976d2"
            }}>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    How to use Discord timestamps:
                </div>
                <div>
                    1. Copy any timestamp format above<br/>
                    2. Paste it in Discord chat or embed<br/>
                    3. Discord will automatically render it based on user's timezone
                </div>
            </div>
        </div>
    );
}
