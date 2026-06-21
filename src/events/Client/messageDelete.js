const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "messageDelete",
    run: async (client, message) => {
        if (!message || message.partial || !message.guild || message.author?.bot) return;

        try {
            const logData = client.db.logging.get(message.guild.id);
            if (logData && logData.enabled && logData.messageDeleteChannel) {
                const logChannel = message.guild.channels.cache.get(logData.messageDeleteChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: "Message Deleted", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setColor("#ff3333")
                        .setDescription(
                            `**User:** ${message.author} (${message.author.tag})\n` +
                            `**Channel:** ${message.channel} (${message.channel.name})\n` +
                            `**Sent At:** <t:${Math.floor(message.createdTimestamp / 1000)}:R>`
                        )
                        .addFields(
                            { name: "Content", value: message.content ? (message.content.substring(0, 1024) || "None") : "No text content (likely embed or attachment)" }
                        )
                        .setFooter({ text: `User ID: ${message.author.id} | Message ID: ${message.id}` })
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (error) {
            console.error("Error in messageDelete event:", error);
        }
    }
};
