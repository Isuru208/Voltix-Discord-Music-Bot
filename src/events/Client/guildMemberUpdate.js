const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "guildMemberUpdate",
    run: async (client, oldMember, newMember) => {
        if (!newMember || !newMember.guild) return;

        try {
            const logData = client.db.logging.get(newMember.guild.id);
            if (logData && logData.enabled && logData.roleUpdateChannel) {
                const logChannel = newMember.guild.channels.cache.get(logData.roleUpdateChannel);
                if (logChannel) {
                    // Compare roles
                    const oldRoles = oldMember.roles.cache;
                    const newRoles = newMember.roles.cache;

                    const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
                    const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

                    if (addedRoles.size === 0 && removedRoles.size === 0) return;

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: "Member Roles Updated", iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
                        .setColor("#33ccff")
                        .setDescription(`**User:** ${newMember} (${newMember.user.tag})`)
                        .setFooter({ text: `User ID: ${newMember.user.id}` })
                        .setTimestamp();

                    if (addedRoles.size > 0) {
                        embed.addFields({ name: "Roles Added", value: addedRoles.map(r => `${r}`).join(', ') });
                    }

                    if (removedRoles.size > 0) {
                        embed.addFields({ name: "Roles Removed", value: removedRoles.map(r => `${r}`).join(', ') });
                    }

                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (error) {
            console.error("Error in guildMemberUpdate event:", error);
        }
    }
};
