const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "messageUpdate",
    run: async (client, oldMessage, newMessage) => {
        if (!newMessage || newMessage.partial || !newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return; // Ignore pin/unpin or embed changes

        try {
            const logData = client.db.logging.get(newMessage.guild.id);
            if (logData && logData.enabled && logData.messageEditChannel) {
                const logChannel = newMessage.guild.channels.cache.get(logData.messageEditChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: "Message Edited", iconURL: newMessage.author.displayAvatarURL({ dynamic: true }) })
                        .setColor("#ffcc00")
                        .setDescription(
                            `**User:** ${newMessage.author} (${newMessage.author.tag})\n` +
                            `**Channel:** ${newMessage.channel} (${newMessage.channel.name})\n` +
                            `**Jump Link:** [Go to Message](${newMessage.url})`
                        )
                        .addFields(
                            { name: "Before", value: oldMessage.content ? (oldMessage.content.substring(0, 1024) || "None") : "No text content" },
                            { name: "After", value: newMessage.content ? (newMessage.content.substring(0, 1024) || "None") : "No text content" }
                        )
                        .setFooter({ text: `User ID: ${newMessage.author.id} | Message ID: ${newMessage.id}` })
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (error) {
            console.error("Error in messageUpdate event:", error);
        }
    }
};
