const { parseMessage } = require("../../utils/messageParser");

module.exports = {
    name: "guildMemberRemove",
    run: async (client, member) => {
        if (!member || !member.guild) return;

        try {
            // Custom Goodbye Message
            const welcomerData = client.db.welcomemessages.get(member.guild.id);
            if (welcomerData && welcomerData.enabled && welcomerData.goodbyeChannel) {
                const goodbyeChannel = member.guild.channels.cache.get(welcomerData.goodbyeChannel);
                if (goodbyeChannel) {
                    const rawMessage = welcomerData.goodbyeMessage || "{username} has left the server.";
                    const replacements = {
                        username: member.user.username,
                        guild: member.guild.name,
                        membercount: member.guild.memberCount
                    };
                    const messagePayload = parseMessage(rawMessage, replacements);
                    await goodbyeChannel.send(messagePayload).catch(() => {});
                }
            }

            // DM on Leave Message
            if (welcomerData && welcomerData.enabled && welcomerData.dmOnLeaveMessage) {
                const rawDm = welcomerData.dmOnLeaveMessage.trim();
                if (rawDm) {
                    const replacements = {
                        username: member.user.username,
                        guild: member.guild.name,
                        membercount: member.guild.memberCount
                    };
                    const dmPayload = parseMessage(rawDm, replacements);
                    await member.send(dmPayload).catch(() => {});
                }
            }

            // Action Logging: Member Leave
            const logData = client.db.logging.get(member.guild.id);
            if (logData && logData.enabled && logData.memberJoinLeaveChannel) {
                const logChannel = member.guild.channels.cache.get(logData.memberJoinLeaveChannel);
                if (logChannel) {
                    const { EmbedBuilder } = require("discord.js");
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: "Member Left", iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`${member.user} (${member.user.tag}) left the server.`)
                        .setColor("#ff0000")
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: "Roles", value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => `${r}`).join(', ') || 'None' }
                        )
                        .setFooter({ text: `ID: ${member.user.id}` })
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }

            const trackingEnabled = client.db.invitetracking.get(member.guild.id);

            if (!trackingEnabled || trackingEnabled.status !== 1) return;

            const joinRecord = client.db.invite_logs.get(member.guild.id, member.user.id);

            if (joinRecord && joinRecord.isLeft === 0) {
                client.db.invite_logs.update(member.guild.id, member.user.id, {
                    isLeft: 1,
                    leftAt: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error("Error in guildMemberRemove event:", error);
        }
    },
};
