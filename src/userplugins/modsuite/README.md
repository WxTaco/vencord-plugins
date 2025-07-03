# ModSuite - Comprehensive Moderation Toolkit

A comprehensive Vencord plugin that provides advanced moderation tools with a beautiful pink-themed interface.

## Features

### 🎯 Quick Actions Panel
- **Kick Members** - Remove users from the server
- **Ban Members** - Permanently ban users with optional message deletion
- **Timeout Members** - Temporarily restrict user communication
- **Mute Members** - Mute users in voice channels
- **Delete Messages** - Remove individual or multiple messages
- **Purge Messages** - Bulk delete messages with confirmation
- **Lock Channel** - Prevent users from sending messages
- **Slowmode** - Set channel rate limits

### 🗑️ Mass Message Deletion
- **Keyword Filtering** - Delete messages containing specific text
- **Date Range** - Delete messages within a time period
- **Message Type** - Filter by text, media, or embeds
- **Attachment Filter** - Target messages with/without attachments
- **Preview Mode** - See what will be deleted before confirming
- **Progress Tracking** - Real-time deletion progress with error handling

### 📊 Ping Frequency Monitor
- **Real-time Tracking** - Monitor user ping frequency across channels
- **Configurable Thresholds** - Set custom limits for ping warnings
- **Visual Indicators** - Clear visual warnings when users exceed limits
- **Time Windows** - Customizable monitoring periods
- **Ping Types** - Track @everyone, @here, user mentions, and role mentions

### 📋 Enhanced Audit Log Viewer
- **Advanced Filtering** - Filter by action type, user, date range, and more
- **User Avatars** - Visual identification with user profile pictures
- **Action Categories** - Color-coded action types for easy identification
- **Timestamp Display** - Precise timing information for all actions
- **Reason Display** - Show moderation reasons when available
- **Auto-refresh** - Optional automatic log updates

### 🎨 Beautiful Pink Theme
- **Custom Styling** - Pink-inspired color scheme that doesn't rely on Discord variables
- **Multiple Variants** - Choose from Pink, Rose, Magenta, Purple, or Violet
- **Opacity Control** - Adjustable transparency for better integration
- **Responsive Design** - Works on all screen sizes
- **Smooth Animations** - Polished transitions and hover effects

### 🖱️ Context Menu Integration
- **User Actions** - Right-click users to access tracking and ping history
- **Channel Actions** - Quick access to ModSuite from channel context menus
- **Smart Permissions** - Only shows options when you have the required permissions

### 🎛️ Floating Action Button
- **Draggable Interface** - Position the button anywhere on screen
- **Permission-aware** - Only appears in channels where you have mod permissions
- **Quick Access** - One-click access to all moderation tools
- **Customizable** - Show/hide based on your preferences

## Installation

1. Place the `modsuite` folder in your `src/userplugins/` directory
2. Restart Vencord or reload Discord
3. Enable the ModSuite plugin in Vencord settings
4. Configure your preferences in the plugin settings

## Configuration

### UI Settings
- **Show Floating Button** - Toggle the floating action button
- **Show Sidebar** - Enable/disable sidebar panel
- **Enable Context Menu** - Add ModSuite options to right-click menus

### Feature Toggles
- **Quick Actions** - Enable/disable the quick moderation panel
- **Mass Deleter** - Enable/disable bulk message deletion
- **Ping Monitor** - Enable/disable ping frequency tracking
- **Modlog Enhancer** - Enable/disable enhanced audit log viewer
- **User Tracking** - Enable/disable user message tracking

### Ping Monitor Settings
- **Ping Threshold** - Maximum pings allowed (default: 5)
- **Time Window** - Monitoring period in minutes (default: 10)
- **Show Indicator** - Display visual warnings for excessive pinging

### Mass Deletion Settings
- **Max Bulk Count** - Maximum messages to delete at once (default: 100)
- **Require Confirmation** - Ask before deleting messages
- **Show Preview** - Display messages before deletion

### Theme Settings
- **Custom Theme** - Use the pink theme styling
- **Theme Opacity** - Adjust transparency (0.1 - 1.0)
- **Accent Color** - Choose from 5 color variants

## Permissions Required

ModSuite respects Discord's permission system and only shows actions you can perform:

- **Kick Members** - Required for kick actions
- **Ban Members** - Required for ban actions
- **Moderate Members** - Required for timeout actions
- **Mute Members** - Required for voice mute actions
- **Manage Messages** - Required for message deletion and purging
- **Manage Channels** - Required for channel locking and slowmode
- **View Audit Log** - Required for enhanced audit log viewer

## Safety Features

- **Permission Checks** - All actions verify permissions before execution
- **Confirmation Dialogs** - Dangerous actions require confirmation
- **Preview Mode** - See what will be affected before taking action
- **Error Handling** - Graceful handling of API errors and rate limits
- **Undo Protection** - Clear warnings about irreversible actions

## Technical Details

- **Modular Architecture** - Each feature can be enabled/disabled independently
- **TypeScript Support** - Fully typed for better development experience
- **React Components** - Modern React-based UI components
- **Performance Optimized** - Efficient caching and minimal API calls
- **Error Boundaries** - Robust error handling to prevent crashes

## Compatibility

- **Vencord Required** - This is a Vencord plugin
- **Discord Permissions** - Respects all Discord permission systems
- **Cross-platform** - Works on Desktop, Web, and Mobile Discord clients
- **Theme Independent** - Custom styling doesn't interfere with Discord themes

## Support

For issues, feature requests, or contributions, please refer to the Vencord community guidelines.

## License

This plugin is licensed under GPL-3.0-or-later, same as Vencord.

---

**⚠️ Important:** Always use moderation tools responsibly. This plugin provides powerful capabilities that should be used in accordance with Discord's Terms of Service and your server's rules.
