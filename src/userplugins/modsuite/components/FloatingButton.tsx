/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";
import { React, useEffect, useRef, useState } from "@webpack/common";

import { settings } from "../settings";
import { FloatingButtonProps } from "../types";
import { hasAnyModPermissions } from "../utils/permissions";

const cl = classNameFactory("ms-");

const ModIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
);

export const FloatingButton: React.FC<FloatingButtonProps> = ({
    position,
    onPositionChange,
    onToggle,
    isVisible
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout>();

    // Check if current channel has mod permissions
    const [hasPermissions, setHasPermissions] = useState(false);
    
    useEffect(() => {
        const checkPermissions = () => {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            setHasPermissions(hasAnyModPermissions(channel));
        };

        checkPermissions();
        
        // Listen for channel changes
        const unsubscribe = SelectedChannelStore.addChangeListener(checkPermissions);
        return unsubscribe;
    }, []);

    // Don't render if no permissions or not visible
    if (!hasPermissions || !isVisible) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        
        e.preventDefault();
        e.stopPropagation();
        
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep button within viewport bounds
        const maxX = window.innerWidth - 56;
        const maxY = window.innerHeight - 56;
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        onPositionChange({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) return;
        
        e.preventDefault();
        e.stopPropagation();
        onToggle();
    };

    const handleMouseEnter = () => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        setShowTooltip(false);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
            }
        };
    }, []);

    return (
        <ErrorBoundary noop>
            <button
                ref={buttonRef}
                className={cl("floating-button", { dragging: isDragging })}
                style={{
                    left: position.x,
                    top: position.y,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                title="ModSuite - Click to open mod tools"
                aria-label="Open ModSuite moderation tools"
            >
                <ModIcon />
                
                {showTooltip && (
                    <div 
                        className={cl("tooltip", "visible")}
                        style={{
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px'
                        }}
                    >
                        ModSuite
                    </div>
                )}
            </button>
        </ErrorBoundary>
    );
};

// Hook to manage floating button state
export const useFloatingButton = () => {
    const [position, setPosition] = useState(() => {
        try {
            return JSON.parse(settings.store.floatingButtonPosition);
        } catch {
            return { x: 20, y: 100 };
        }
    });
    
    const [isVisible, setIsVisible] = useState(settings.store.showFloatingButton);
    
    // Update position in settings when changed
    const handlePositionChange = (newPosition: { x: number; y: number }) => {
        setPosition(newPosition);
        settings.store.floatingButtonPosition = JSON.stringify(newPosition);
    };
    
    // Listen for settings changes
    useEffect(() => {
        const updateVisibility = () => {
            setIsVisible(settings.store.showFloatingButton);
        };
        
        // Initial check
        updateVisibility();
        
        // Note: In a real implementation, you'd want to listen to settings changes
        // This would depend on how Vencord's settings system works
        
        return () => {
            // Cleanup if needed
        };
    }, []);
    
    return {
        position,
        isVisible,
        onPositionChange: handlePositionChange,
        setVisible: setIsVisible
    };
};

// Wrapper component that handles the floating button lifecycle
export const FloatingButtonManager: React.FC<{ onToggle: () => void }> = ({ onToggle }) => {
    const { position, isVisible, onPositionChange } = useFloatingButton();
    
    return (
        <FloatingButton
            position={position}
            onPositionChange={onPositionChange}
            onToggle={onToggle}
            isVisible={isVisible}
        />
    );
};
