module.exports = {
    name: "messageReactionAdd",
    run: async (client, reaction, user) => {
        if (user.bot) return;

        // If reaction is partial, fetch it
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error("Error fetching partial reaction:", error);
                return;
            }
        }

        const message = reaction.message;
        if (!message.guild) return;

        try {
            // Check reaction roles database
            const emojiName = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
            let rr = client.db.reactionroles.get(message.guild.id, message.id, emojiName);
            
            // Try standard emoji/raw name fallback if custom formatting does not match
            if (!rr && reaction.emoji.name) {
                rr = client.db.reactionroles.get(message.guild.id, message.id, reaction.emoji.name);
            }

            if (rr && rr.roleId) {
                const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);
                if (member) {
                    const role = message.guild.roles.cache.get(rr.roleId);
                    if (role) {
                        await member.roles.add(role).catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.error("Error in messageReactionAdd event:", error);
        }
    }
};
