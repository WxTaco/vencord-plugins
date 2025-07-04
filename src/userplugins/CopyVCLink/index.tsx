/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { LinkIcon } from "@components/Icons";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, Menu, SelectedChannelStore, UserStore } from "@webpack/common";
import type { Channel, User } from "discord-types/general";

const VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel", "getCurrentClientVoiceChannelId");

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

interface ChannelContextProps {
    channel: Channel;
    guild?: any;
}

// Function to generate Discord voice channel link
function getVoiceChannelLink(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "";

    if (channel.guild_id) {
        // Server voice channel: https://discord.com/channels/GUILD_ID/CHANNEL_ID
        return `https://discord.com/channels/${channel.guild_id}/${channelId}`;
    } else {
        // DM/Group DM voice channel: https://discord.com/channels/@me/CHANNEL_ID
        return `https://discord.com/channels/@me/${channelId}`;
    }
}

// Context menu patch for user context menu (right-click on user)
const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    const currentUser = UserStore.getCurrentUser();

    // Handle other users - show their voice channel link if they're in one
    if (user.id !== currentUser.id) {
        const voiceState = VoiceStateStore.getVoiceStateForUser(user.id);
        const channelId = voiceState?.channelId;

        if (!channelId) return; // User is not in a voice channel

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;

        const channelName = channel.name || "Voice Channel";
        const link = getVoiceChannelLink(channelId);

        children.push(
            <Menu.MenuItem
                id="vc-copy-voice-channel-link"
                label={`Copy Voice Channel Link (${channelName})`}
                action={() => copyWithToast(link, "Voice channel link copied to clipboard!")}
                icon={LinkIcon}
            />
        );
    } else {
        // Handle current user - show their voice channel link if they're in one
        const currentVoiceChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!currentVoiceChannelId) return; // Current user not in a voice channel

        const channel = ChannelStore.getChannel(currentVoiceChannelId);
        if (!channel) return;

        const link = getVoiceChannelLink(currentVoiceChannelId);
        const channelName = channel.name || "Voice Channel";

        children.push(
            <Menu.MenuItem
                id="vc-copy-my-voice-channel-link"
                label={`Copy My Voice Channel Link (${channelName})`}
                action={() => copyWithToast(link, "Your voice channel link copied to clipboard!")}
                icon={LinkIcon}
            />
        );
    }
};

// Context menu patch for channel context menu (right-click on voice channel)
const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: ChannelContextProps) => {
    if (!channel) return;

    // Only show for voice channels (type 2) and stage channels (type 13)
    if (channel.type !== 2 && channel.type !== 13) return;

    const link = getVoiceChannelLink(channel.id);

    children.push(
        <Menu.MenuItem
            id="vc-copy-voice-channel-link"
            label="Copy Voice Channel Link"
            action={() => copyWithToast(link, "Voice channel link copied to clipboard!")}
            icon={LinkIcon}
        />
    );
};

export default definePlugin({
    name: "CopyVCLink",
    description: "Adds options to copy voice channel links from user context menus and channel context menus. Right-click on users in voice channels or voice channels themselves to get shareable links.",
    authors: [{ name: "Anonymous", id: 0n }],
    contextMenus: {
        "user-context": UserContextMenuPatch,
        "channel-context": ChannelContextMenuPatch
    }
});
