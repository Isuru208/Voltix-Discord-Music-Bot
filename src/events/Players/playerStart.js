const {
  WebhookClient,
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  AttachmentBuilder
} = require("discord.js");
const { Classic } = require("musicard");
const {
  Webhooks: { player_create }
} = require("../../config.js");
const getEmoji = (client, name) => {
  const custom = client.emoji?.[name];
  if (!custom) return "";
  
  if (custom.startsWith("<")) {
    const match = custom.match(/:(\d+)>/);
    if (match && match[1]) {
      const emojiId = match[1];
      const hasEmoji = client.emojis.cache.has(emojiId);
      if (!hasEmoji) {
        if (name === "check") return "✅";
        if (name === "cross") return "❌";
        if (name === "info") return "ℹ️";
        if (name === "warn") return "⚠️";
        if (name === "voldown") return "🔉";
        if (name === "volup") return "🔊";
      }
    }
  }
  return custom;
};

const createButtonRow = (client, paused) => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("previous")
      .setEmoji(client.emoji.previous)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(paused ? "resume" : "pause")
      .setEmoji(paused ? client.emoji.play : client.emoji.pause)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("skip")
      .setEmoji(client.emoji.skip)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("like")
      .setEmoji(client.emoji.like)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("stop")
      .setEmoji(client.emoji.stop)
      .setStyle(ButtonStyle.Secondary)
  );
};

const createSecondButtonRow = (client, player) => {
  const isMuted = player.volume === 0 || player.data?.get("isMuted");
  const gamingMode = player.data?.get("gamingMode") || false;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vol_down")
      .setEmoji(client.emoji.voldown)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("mute_toggle")
      .setEmoji(isMuted ? "🔊" : "🔇")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vol_up")
      .setEmoji(client.emoji.volup)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("game_mode_toggle")
      .setEmoji("🎮")
      .setLabel(gamingMode ? "Gaming: ON" : "Gaming: OFF")
      .setStyle(gamingMode ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
};

function formatDuration(ms) {
  if (!ms || ms === 0) return 'Unknown';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function cleanAuthorName(author) {
  if (!author) return 'Unknown Artist';

  return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
}

function truncateTitle(title, maxLength = 30) {
  if (!title) return 'Unknown Title';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

function getCleanThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;

  if (thumbnailUrl.includes('i.ytimg.com') || thumbnailUrl.includes('img.youtube.com')) {
    const videoIdMatch = thumbnailUrl.match(/vi\/([^\/]+)\//);
    if (videoIdMatch && videoIdMatch[1]) {
      return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
    }
  }

  return thumbnailUrl;
}

function buildNowPlayingComponents(client, track, paused, player) {
  const hasCard = player?.data?.get("hasCard") || false;

  if (hasCard) {
    const buttonRow = createButtonRow(client, paused);
    const secondButtonRow = createSecondButtonRow(client, player);
    return [buttonRow, secondButtonRow];
  }

  const container = new ContainerBuilder();
  const titleDisplay = new TextDisplayBuilder()
    .setContent(`### [${truncateTitle(track.title)}](${track.uri || track.url})`);

  const infoDisplay = new TextDisplayBuilder()
    .setContent(
      `> - **Author:** [${cleanAuthorName(track.author)}](${track.uri || track.url})\n` +
      `> - **Duration:** \`${formatDuration(track.length || track.duration || 0)}\`\n` +
      `> - **Requester:** [${track.requester?.username}](https://discord.com/users/${track.requester?.id})`
    );

  const section = new SectionBuilder()
    .addTextDisplayComponents(titleDisplay, infoDisplay);

  if (track.thumbnail || track.artworkUrl || track.image) {
    const cleanThumbnail = getCleanThumbnail(track.thumbnail || track.artworkUrl || track.image);
    if (cleanThumbnail) {
      section.setThumbnailAccessory((thumbnail) =>
        thumbnail.setURL(cleanThumbnail)
      );
    }
  }

  container.addSectionComponents(section);

  const buttonRow = createButtonRow(client, paused);
  container.addActionRowComponents(buttonRow);

  if (player) {
    const secondButtonRow = createSecondButtonRow(client, player);
    container.addActionRowComponents(secondButtonRow);
  }

  return [container];
}

async function sendNowPlaying(client, player, track) {
  try {
    console.log(`[playerStart] Starting sendNowPlaying for track: "${track.title}" in channel: ${player.textId}`);
    const channel = client.channels.cache.get(player.textId);
    if (!channel) {
      console.log(`[playerStart] Warning: Text channel ${player.textId} not found in client cache!`);
      return null;
    }

    let hasCard = false;
    let attachment = null;

    const thumbnailImg = getCleanThumbnail(track.thumbnail || track.artworkUrl || track.image) || "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";
    try {
      const durationStr = formatDuration(track.length || track.duration || 0);
      console.log(`[playerStart] Generating musicard for: "${track.title}" (Author: ${track.author}, Duration: ${durationStr}) using thumbnail: "${thumbnailImg}"...`);
      
      const card = await Classic({
        thumbnailImage: thumbnailImg,
        backgroundImage: thumbnailImg,
        imageDarkness: 70,
        name: truncateTitle(track.title, 35),
        author: cleanAuthorName(track.author),
        progress: 0,
        startTime: "0:00",
        endTime: durationStr,
        nameColor: "#00D4FF",
        progressColor: "#00D4FF",
        timeColor: "#00D4FF"
      });

      if (card) {
        console.log(`[playerStart] Musicard generated successfully! Compressing image using Jimp...`);
        let compressedCard = card;
        try {
          const Jimp = require("jimp");
          const jimpImage = await Jimp.read(card);
          compressedCard = await jimpImage.resize(800, Jimp.AUTO).quality(65).getBufferAsync(Jimp.MIME_JPEG);
          console.log(`[playerStart] Musicard compressed: ${card.length} bytes -> ${compressedCard.length} bytes`);
        } catch (jimpError) {
          console.error("[playerStart] Failed to compress musicard, sending original PNG:", jimpError.message || jimpError);
        }
        attachment = new AttachmentBuilder(compressedCard, { name: "nowplaying.jpg" });
        hasCard = true;
      } else {
        console.log(`[playerStart] Warning: Classic() returned empty card!`);
      }
    } catch (cardError) {
      console.error("[playerStart] Failed to generate musicard:", cardError);
    }

    player.data?.set("hasCard", hasCard);
    const components = buildNowPlayingComponents(client, track, player.paused || false, player);

    try {
      const payload = {
        components: components
      };

      if (!hasCard) {
        payload.flags = MessageFlags.IsComponentsV2;
      }

      if (attachment) {
        payload.files = [attachment];
      }

      console.log(`[playerStart] Sending message to channel ${channel.name} (hasCard: ${hasCard})...`);
      
      const sendPromise = channel.send(payload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Discord send timeout")), 8000)
      );

      const message = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[playerStart] Message sent successfully! Msg ID: ${message.id}`);
      player.data?.set("currentTrack", track);
      return message;
    } catch (embedError) {
      console.error("[playerStart] Error sending now playing message with card:", embedError.message || embedError);
      if (attachment) {
        console.warn("[playerStart] Retrying/falling back to text-only now playing message due to card upload failure...");
        try {
          player.data?.set("hasCard", false);
          const textComponents = buildNowPlayingComponents(client, track, player.paused || false, player);
          const textPayload = {
            components: textComponents,
            flags: MessageFlags.IsComponentsV2
          };
          
          const fallbackSendPromise = channel.send(textPayload);
          const fallbackTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Discord fallback send timeout")), 5000)
          );

          const message = await Promise.race([fallbackSendPromise, fallbackTimeoutPromise]);
          console.log(`[playerStart] Fallback text-only message sent successfully! Msg ID: ${message.id}`);
          player.data?.set("currentTrack", track);
          return message;
        } catch (fallbackError) {
          console.error("[playerStart] Fallback text-only send failed:", fallbackError.message || fallbackError);
          return null;
        }
      }
      return null;
    }
  } catch (error) {
    console.error("[playerStart] Outer error in sendNowPlaying:", error);
    return null;
  }
}

async function updateNowPlayingButtons(client, player, paused) {
  try {
    const nowPlayingMsg = player.data?.get("message");
    if (!nowPlayingMsg) {
      return;
    }

    const track = player.data?.get("currentTrack") || player.queue?.current;
    if (!track) {
      return;
    }

    const hasCard = player.data?.get("hasCard") || false;
    const components = buildNowPlayingComponents(client, track, paused, player);

    const payload = {
      components: components
    };

    if (!hasCard) {
      payload.flags = MessageFlags.IsComponentsV2;
    }

    await nowPlayingMsg.edit(payload).catch((err) => {
      console.error("Failed to edit now playing buttons:", err);
    });

  } catch (error) {
    console.error("Error in updateNowPlayingButtons:", error);
  }
}

async function handleButtonInteraction(interaction, player, client) {
  try {
    switch (interaction.customId) {
      case "pause": {
        if (player.paused) {
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "info")} Music is already paused.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        player.pause(true);
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Paused the music.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        updateNowPlayingButtons(client, player, true);
        break;
      }

      case "resume": {
        if (!player.paused) {
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "info")} Music is already playing.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        player.pause(false);
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Resumed the music.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        updateNowPlayingButtons(client, player, false);
        break;
      }

      case "skip": {
        if (!player.queue?.current) {
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "info")} No song is currently playing.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        const currentTitle = player.queue.current.title;
        player.skip();
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Skipped \`${currentTitle}\`.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        break;
      }

      case "stop": {
        try {
          player.queue?.clear();
          if (player.setLoop) {
            player.setLoop('none');
          } else {
            player.loop = 'none';
          }
          const { safeDestroyPlayer } = require("../../utils/playerUtils");
          await safeDestroyPlayer(player);
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Stopped the music and cleared the queue.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
        } catch (error) {
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "cross")} Failed to stop the player.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
        }
        break;
      }

      case "previous": {
        const history = player.data?.get("history") || [];

        if (history.length === 0) {
          const display = new TextDisplayBuilder()
            .setContent(`**${getEmoji(client, "info")} No previous track found in history.**`);
          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);
          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        const lastHistoryTrack = history[history.length - 1];

        try {
          const result = await client.manager.search(lastHistoryTrack.uri, {
            requester: interaction.user
          });

          if (result && result.tracks && result.tracks.length > 0) {
            player.queue.unshift(result.tracks[0]);
            history.pop();
            player.data?.set("history", history);
            player.skip();
            const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Loaded previous track \`${result.tracks[0].title}\`.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
          } else {
            const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "cross")} Failed to find the previous track.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
          }
        } catch (error) {
          console.error("Error loading previous track:", error);
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "cross")} An error occurred while loading the previous track.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        break;
      }

      case "like": {
        const currentLikeTrack = player.queue?.current;
        if (!currentLikeTrack) {
          const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "info")} No track currently playing.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(display);
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        try {
          const songs = client.db.liked.get(interaction.user.id);
          const alreadyLiked = songs.some(song => song.url === (currentLikeTrack.uri || currentLikeTrack.url));

          if (alreadyLiked) {
            const display = new TextDisplayBuilder()
              .setContent(`**${getEmoji(client, "info")} \`${currentLikeTrack.title}\` is already in your favourite list.**`);
            const container = new ContainerBuilder()
              .addTextDisplayComponents(display);
            return interaction.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
          } else {
            songs.push({
              title: currentLikeTrack.title,
              url: currentLikeTrack.uri || currentLikeTrack.url,
              duration: currentLikeTrack.length || currentLikeTrack.duration,
              thumbnail: currentLikeTrack.thumbnail || currentLikeTrack.artworkUrl || currentLikeTrack.image,
              author: currentLikeTrack.author,
              addedAt: new Date().toISOString()
            });

            client.db.liked.set(interaction.user.id, songs);

            const display = new TextDisplayBuilder()
              .setContent(`**${getEmoji(client, "check")} Added \`${currentLikeTrack.title}\` to your favourite list.**`);
            const container = new ContainerBuilder()
              .addTextDisplayComponents(display);
            return interaction.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
          }
        } catch (dbError) {
          console.error('[Like Button] Error:', dbError);
          const display = new TextDisplayBuilder()
            .setContent(`**${getEmoji(client, "cross")} Failed to save song to favorites. Please try again.**`);
          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);
          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          }).catch(() => { });
        }
        break;
      }

      case "vol_down": {
        const isDucked = player.data?.get("isDucked") || false;
        let newVol;
        if (isDucked) {
          const preDuckVol = player.data?.get("preDuckVolume") || 120;
          newVol = Math.max(0, preDuckVol - 10);
          player.data?.set("preDuckVolume", newVol);
        } else {
          newVol = Math.max(0, player.volume - 10);
          player.setVolume(newVol);
          player.data?.set("isMuted", newVol === 0);
        }
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Volume decreased to \`${isDucked ? player.data?.get("preDuckVolume") : newVol}%\`${isDucked ? " (will apply when Gaming Mode is silent)" : ""}.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        updateNowPlayingButtons(client, player, player.paused);
        break;
      }

      case "vol_up": {
        const isDucked = player.data?.get("isDucked") || false;
        let newVol;
        if (isDucked) {
          const preDuckVol = player.data?.get("preDuckVolume") || 120;
          newVol = Math.min(150, preDuckVol + 10);
          player.data?.set("preDuckVolume", newVol);
        } else {
          newVol = Math.min(150, player.volume + 10);
          player.setVolume(newVol);
          player.data?.set("isMuted", false);
        }
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} Volume increased to \`${isDucked ? player.data?.get("preDuckVolume") : newVol}%\`${isDucked ? " (will apply when Gaming Mode is silent)" : ""}.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        updateNowPlayingButtons(client, player, player.paused);
        break;
      }

      case "mute_toggle": {
        const isMuted = player.volume === 0 || player.data?.get("isMuted");
        let displayMsg = "";
        if (isMuted) {
          const prevVol = player.data?.get("preMuteVolume") || 120;
          player.setVolume(prevVol);
          player.data?.set("isMuted", false);
          displayMsg = `Unmuted the music. Current Volume: \`${prevVol}%\`.`;
        } else {
          player.data?.set("preMuteVolume", player.volume);
          player.setVolume(0);
          player.data?.set("isMuted", true);
          displayMsg = `Muted the music.`;
        }
        const display = new TextDisplayBuilder().setContent(`**${getEmoji(client, "check")} ${displayMsg}**`);
        const container = new ContainerBuilder().addTextDisplayComponents(display);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        updateNowPlayingButtons(client, player, player.paused);
        break;
      }

      case "game_mode_toggle": {
        const gamingMode = player.data?.get("gamingMode") || false;
        const newGamingMode = !gamingMode;
        player.data?.set("gamingMode", newGamingMode);

        if (newGamingMode) {
          // Store original volume
          player.data?.set("originalVolume", player.volume);
          // Check channel activity
          const guild = client.guilds.cache.get(player.guildId);
          let hasActiveTalkers = false;
          if (guild) {
            const voiceChannel = guild.channels.cache.get(player.voiceId);
            if (voiceChannel) {
              const members = voiceChannel.members.filter(m => m.id !== client.user.id);
              hasActiveTalkers = members.some(m => !m.voice.selfMute && !m.voice.serverMute);
            }
          }

          if (hasActiveTalkers) {
            player.data?.set("preDuckVolume", player.volume);
            player.setVolume(20);
            player.data?.set("isDucked", true);
          } else {
            player.data?.set("isDucked", false);
          }
        } else {
          // Restore original volume
          const isDucked = player.data?.get("isDucked") || false;
          if (isDucked) {
            const restoredVol = player.data?.get("preDuckVolume") || 120;
            player.setVolume(restoredVol);
            player.data?.set("isDucked", false);
          }
        }

        const stateStr = newGamingMode ? "Enabled 🎮" : "Disabled";
        const display = new TextDisplayBuilder()
          .setContent(`**${getEmoji(client, "info")} Gaming Mode has been ${stateStr}.**`);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(display);
        
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        }).catch(() => { });

        updateNowPlayingButtons(client, player, player.paused);
        break;
      }

      default:
        const unknownDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Unknown button interaction.**`);

        const unknownContainer = new ContainerBuilder()
          .addTextDisplayComponents(unknownDisplay);

        await interaction.editReply({
          components: [unknownContainer],
          flags: MessageFlags.IsComponentsV2
        });
        break;
    }
  } catch (error) {
    const display = new TextDisplayBuilder()
      .setContent(`**${client.emoji.cross} An error occurred while processing your request.**`);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(display);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      } catch (replyError) {
      }
    } else {
      try {
        await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (editError) {
      }
    }
  }
}

function setupMessageCollector(client, player, message) {
  try {
    const track = player.queue?.current;
    const collector = message.createMessageComponentCollector({
      // No time limit - buttons handled globally via interactionCreate.js
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (interaction) => {
      try {
        if (!interaction.member?.voice?.channelId || interaction.member.voice.channelId !== player.voiceId) {
          const display = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} You must be in the same voice channel as the bot.**`);
          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);
          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        await handleButtonInteraction(interaction, player, client);

      } catch (interactionError) {
        if (!interaction.replied && !interaction.deferred) {
          const display = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} An error occurred while processing your request.**`);
          const container = new ContainerBuilder()
            .addTextDisplayComponents(display);
          await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          }).catch(() => { });
        }
      }
    });

    collector.on("end", (collected, reason) => {
    });

  } catch (error) {
  }
}

async function updateVoiceStatus(client, player, track) {
  try {
    if (!player.voiceId) {
      return;
    }

    if (player.state === 'DESTROYED' || player.state === 'DISCONNECTED') {
      return;
    }

    await client.rest
      .put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `${client.emoji.dance} Playing **${track.title}**` },
      })
      .catch((err) => {
        console.error('[VoiceStatus] Failed to update:', err.message || err);
      });
  } catch (error) {
    console.error('[VoiceStatus] Exception:', error.message || error);
  }
}

module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    try {
      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) {
        return;
      }

      if (!player.data?.get("playerStarted")) {
        player.data?.set("playerStarted", true);

        if (player_create) {
          const webhook = new WebhookClient({ url: player_create });

          const embed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({
              name: `Player Started`,
              iconURL: client.user.displayAvatarURL()
            })
            .setDescription(`**Server:** \`${guild.name}\`\n**ID:** \`${player.guildId}\``);

          webhook.send({ embeds: [embed] }).catch(() => { });
        }
      }

      const currentTrack = track || player.queue?.current;

      if (currentTrack) {
        await handleTrackStart(client, player, currentTrack);
      }

    } catch (error) {
    }
  },
};

async function handleTrackStart(client, player, track) {
  try {
    if (!track) {
      return;
    }

    player.data?.delete("playerEmptyProcessed");

    // Delete old message in parallel while generating new card (faster transition)
    const oldMessage = player.data?.get("message");
    if (oldMessage) {
      player.data?.delete("message");
      oldMessage.delete().catch(() => { });
    }

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.updateActivity(player.guildId);
    }

    updateVoiceStatus(client, player, track).catch(() => {});

    const message = await sendNowPlaying(client, player, track);

    if (!message) {
      return;
    }

    player.data?.set("message", message);

    setupMessageCollector(client, player, message);

  } catch (error) {
    console.error('[HandleTrackStart] Error:', error);
  }
}
module.exports.updateNowPlayingButtons = updateNowPlayingButtons;
module.exports.handleButtonInteractionGlobal = handleButtonInteraction;
