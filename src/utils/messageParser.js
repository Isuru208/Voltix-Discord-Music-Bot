const { EmbedBuilder } = require("discord.js");

function formatPlaceholders(obj, replacements) {
    if (typeof obj === 'string') {
        let result = obj;
        for (const [key, val] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), val);
        }
        return result;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => formatPlaceholders(item, replacements));
    }
    if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const [key, val] of Object.entries(obj)) {
            newObj[key] = formatPlaceholders(val, replacements);
        }
        return newObj;
    }
    return obj;
}

function parseMessage(rawMessage, replacements) {
    if (!rawMessage) return { content: "" };

    if (rawMessage.startsWith('{')) {
        try {
            const parsed = JSON.parse(rawMessage);
            if (parsed.embed) {
                // It's an embed payload! Format all string fields recursively
                const formatted = formatPlaceholders(parsed, replacements);
                
                const embed = new EmbedBuilder();
                const data = formatted.embed;

                if (data.title) embed.setTitle(data.title);
                if (data.description) embed.setDescription(data.description);
                if (data.url) embed.setURL(data.url);
                
                // Color conversion
                if (data.color) {
                    try {
                        embed.setColor(data.color);
                    } catch (e) {}
                }

                // Author
                if (data.author && data.author.name) {
                    embed.setAuthor({
                        name: data.author.name,
                        iconURL: data.author.icon_url || undefined,
                        url: data.author.url || undefined
                    });
                }

                // Thumbnail
                if (data.thumbnail && data.thumbnail.url) {
                    embed.setThumbnail(data.thumbnail.url);
                }

                // Image
                if (data.image && data.image.url) {
                    embed.setImage(data.image.url);
                }

                // Footer
                if (data.footer && data.footer.text) {
                    embed.setFooter({
                        text: data.footer.text,
                        iconURL: data.footer.icon_url || undefined
                    });
                }

                // Timestamp
                if (data.timestamp) {
                    embed.setTimestamp();
                }

                // Fields
                if (Array.isArray(data.fields)) {
                    data.fields.forEach(f => {
                        if (f.name && f.value) {
                            embed.addFields({ name: f.name, value: f.value, inline: !!f.inline });
                        }
                    });
                }

                return {
                    content: formatted.content || undefined,
                    embeds: [embed]
                };
            }
        } catch (e) {
            // If JSON parsing fails, fall back to plain text
        }
    }

    // Default plain text formatting
    let content = rawMessage;
    for (const [key, val] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`{${key}}`, 'g'), val);
    }
    return { content };
}

module.exports = { parseMessage };
