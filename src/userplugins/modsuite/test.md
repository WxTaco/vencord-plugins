# ModSuite Testing Guide

This document outlines how to test the ModSuite plugin functionality.

## Installation Test

1. **Plugin Loading**
   - [ ] Plugin appears in Vencord settings
   - [ ] Plugin can be enabled/disabled
   - [ ] No console errors on startup
   - [ ] Settings panel loads correctly

## UI Components Test

### Floating Action Button
- [ ] Button appears in channels with mod permissions
- [ ] Button is draggable and position persists
- [ ] Button disappears in channels without permissions
- [ ] Clicking opens the mod panel
- [ ] Tooltip shows on hover

### Mod Panel
- [ ] Panel opens when floating button is clicked
- [ ] Panel shows correct channel/guild information
- [ ] Permission level is displayed correctly
- [ ] All enabled tabs are visible
- [ ] Panel can be closed by clicking backdrop or X button

## Feature Tests

### Quick Actions
- [ ] Actions are enabled/disabled based on permissions
- [ ] Kick action works (with confirmation)
- [ ] Ban action works (with confirmation)
- [ ] Timeout action works
- [ ] Message deletion works
- [ ] Channel lock/unlock works
- [ ] Slowmode setting works
- [ ] Error handling for failed actions

### Mass Message Deletion
- [ ] Filter by keyword works
- [ ] Filter by date range works
- [ ] Filter by message type works
- [ ] Preview shows correct messages
- [ ] Deletion progress is tracked
- [ ] Confirmation dialog appears
- [ ] Respects max deletion limit

### Ping Monitor
- [ ] Tracks user pings correctly
- [ ] Shows visual indicator for threshold exceeded
- [ ] Filters by ping type work
- [ ] Time window setting is respected
- [ ] Ping history is displayed

### User Tracking
- [ ] Messages are tracked when feature is enabled
- [ ] User list shows tracked users
- [ ] Message history is displayed
- [ ] Deleted messages are marked
- [ ] Edited messages are marked
- [ ] Data persists across sessions

### Audit Log Viewer
- [ ] Loads audit log entries
- [ ] Filters work correctly
- [ ] User avatars are displayed
- [ ] Action types are color-coded
- [ ] Timestamps are formatted correctly
- [ ] Refresh button works

### Analytics
- [ ] Server statistics are displayed
- [ ] User statistics work
- [ ] Top users lists are accurate
- [ ] Data refreshes automatically
- [ ] Charts/graphs display correctly

## Context Menu Integration

### User Context Menu
- [ ] "Track Messages" option appears
- [ ] "View Ping History" option appears
- [ ] Options only show with proper permissions
- [ ] Actions work correctly

### Channel Context Menu
- [ ] "Open ModSuite" option appears
- [ ] Option only shows with mod permissions
- [ ] Opens ModSuite panel correctly

## Settings Tests

### UI Settings
- [ ] Show/hide floating button works
- [ ] Button position saving works
- [ ] Context menu toggle works

### Feature Toggles
- [ ] Disabling features hides components
- [ ] Enabling features shows components
- [ ] Changes take effect immediately

### Theme Settings
- [ ] Custom theme can be enabled/disabled
- [ ] Color variants work
- [ ] Opacity setting works
- [ ] Styling doesn't conflict with Discord

### Threshold Settings
- [ ] Ping threshold setting works
- [ ] Time window setting works
- [ ] Max deletion count is respected
- [ ] Tracking limits work

## Permission Tests

### Channel Permissions
- [ ] Kick permission check works
- [ ] Ban permission check works
- [ ] Manage messages permission works
- [ ] Manage channels permission works
- [ ] View audit log permission works

### Role Hierarchy
- [ ] Cannot moderate users with higher roles
- [ ] Cannot moderate server owner
- [ ] Can moderate users with lower roles

## Error Handling

### API Errors
- [ ] Rate limiting is handled gracefully
- [ ] Network errors show appropriate messages
- [ ] Permission errors are caught
- [ ] Invalid data is handled

### UI Errors
- [ ] Component errors don't crash the plugin
- [ ] Error boundaries work correctly
- [ ] Fallback UI is displayed

## Performance Tests

### Memory Usage
- [ ] Plugin doesn't cause memory leaks
- [ ] Data cleanup works correctly
- [ ] Cache limits are respected

### Responsiveness
- [ ] UI remains responsive during operations
- [ ] Large data sets are handled efficiently
- [ ] Animations are smooth

## Compatibility Tests

### Discord Versions
- [ ] Works on Discord Desktop
- [ ] Works on Discord Web
- [ ] Works on Discord PTB/Canary

### Other Plugins
- [ ] Doesn't conflict with other Vencord plugins
- [ ] Styling doesn't interfere
- [ ] Event listeners don't conflict

## Security Tests

### Data Handling
- [ ] User data is handled securely
- [ ] No sensitive data is logged
- [ ] Permissions are properly validated

### API Usage
- [ ] Only makes authorized API calls
- [ ] Respects Discord's rate limits
- [ ] Validates all inputs

## Cleanup Tests

### Plugin Disable
- [ ] All event listeners are removed
- [ ] UI components are cleaned up
- [ ] Memory is freed

### Data Cleanup
- [ ] Old data is automatically cleaned
- [ ] Manual cleanup works
- [ ] Export/import functions work

## Known Issues

Document any known issues or limitations:

1. **Issue**: Description
   - **Workaround**: Solution
   - **Status**: Fixed/In Progress/Won't Fix

## Test Results

Date: ___________
Tester: ___________
Version: ___________

Overall Status: [ ] Pass [ ] Fail [ ] Partial

Notes:
_________________________________
_________________________________
_________________________________
