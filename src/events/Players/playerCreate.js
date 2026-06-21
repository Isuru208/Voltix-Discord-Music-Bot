const { KazagumoPlayer } = require("kazagumo");

module.exports = {
  name: "playerCreate",

  run: async (client, player) => {
    const name = client.guilds.cache.get(player.guildId).name;
    client.logger.log(`Player Create in ${name} [ ${player.guildId} ]`, "log");

    const guildPrefix = client.db.prefixes.get(player.guildId);
    const prefix = guildPrefix?.prefix || client.prefix;

    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `use **${prefix}play** to add songs` },
      })
      .catch(() => null);

    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.startMonitoring(player);
    }

    try {
      // Set default volume to 100% (normal) as requested
      player.setVolume(100);

      // Apply a default High-Fidelity (Loudness) Equalizer to enhance bass and treble quality
      await player.shoukaku.setFilters({
        equalizer: [
          { band: 0, gain: 0.20 }, // Punchy Deep Sub-bass
          { band: 1, gain: 0.15 }, // Bass boost
          { band: 2, gain: 0.10 }, // Warmth
          { band: 3, gain: 0.02 },
          { band: 4, gain: 0.0 },
          { band: 5, gain: -0.05 }, // Slight dip in low mids to remove muddiness
          { band: 6, gain: -0.02 },
          { band: 7, gain: 0.0 },
          { band: 8, gain: 0.05 }, // Presence boost
          { band: 9, gain: 0.10 }, // High clarity
          { band: 10, gain: 0.15 }, // Treble clarity
          { band: 11, gain: 0.20 }, // Crisp highs
          { band: 12, gain: 0.15 },
          { band: 13, gain: 0.10 },
          { band: 14, gain: 0.05 }
        ]
      });
      player.currentFilter = "High-Fidelity";
      player.data.set("autoplay", true);
      client.logger.log(`[Audio Quality] Applied default High-Fidelity filter and enabled Autoplay in ${name}`, "ready");
    } catch (err) {
      client.logger.log(`[Audio Quality] Failed to apply default filter: ${err.message}`, "error");
    }
  },
};
