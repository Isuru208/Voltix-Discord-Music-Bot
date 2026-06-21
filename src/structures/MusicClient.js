const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { Kazagumo, Plugins } = require("kazagumo");
const { readdirSync, existsSync } = require("fs");
const { Connectors } = require("shoukaku");
const Spotify = require("kazagumo-spotify");

const loadPlayerManager = require("../loaders/loadPlayerManager");
const permissionHandler = require("../events/Client/PremiumChecks");
const VoiceHealthMonitor = require("../utils/voiceHealthMonitor");
const AutomodManager = require("../utils/automodManager");

class MusicBot extends Client {
  constructor() {
    super({
      intents: 34803,
      partials: ["MESSAGE", "CHANNEL", "REACTION"],
      properties: {
        browser: "Discord Android",
      },
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },

      rest: {
        timeout: 60000
      }
    });

    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.config = require("../config.js");
    this.owners = this.config.ownerID;
    this.prefix = this.config.prefix;
    this.color = this.config.color;
    this.embedColor = this.config.color;
    this.button = require("../custom/button.js");
    this.embed = require("../custom/embed.js")(this.color);
    require("../custom/numformat")(this);
    this.aliases = new Collection();
    this.logger = require("../utils/logger.js");
    const staticEmojis = require("../emojis.js");
    this.emoji = new Proxy(staticEmojis, {
      get: (target, prop) => {
        const val = target[prop];
        if (typeof val === "string" && val.startsWith("<")) {
          const match = val.match(/:(\d+)>/);
          if (match && match[1]) {
            const emojiId = match[1];
            if (this.emojis && this.emojis.cache && !this.emojis.cache.has(emojiId)) {
              const fallbackMap = {
                check: "✅",
                cross: "❌",
                info: "ℹ️",
                warn: "⚠️",
                voldown: "🔉",
                volup: "🔊",
                play: "▶️",
                pause: "⏸️",
                stop: "⏹️",
                skip: "⏭️",
                previous: "⏮️",
                shuffle: "🔀",
                loop: "🔁",
                blank: "  ",
                wickarrow: "➔",
                arrowright: "➔"
              };
              if (fallbackMap[prop] !== undefined) {
                return fallbackMap[prop];
              }
            }
          }
        }
        return val;
      }
    });
    this.cluster = {
      id: 0,
      respawnAll: async () => {
        this.logger.log("[Client] Reboot sequence triggered. Exiting process...", "warn");
        process.exit(0);
      }
    };
    if (!this.token) this.token = this.config.token;
    this.manager = null;
    this.spamMap = new Map();
    this.cooldowns = new Collection();
    this.db = require("./Database");
    this.logger.log("[DB] Local SQLite Database Initialized", "ready");

    try {
      this.automod = new AutomodManager(this);
      this.logger.log("[AutoMod] Static Manager Initialized Successfully", "ready");
    } catch (err) {
      this.logger.log(`[AutoMod] Failed to initialize: ${err.message}`, "error");
      console.error(err);
    }

    try {
      this.voiceHealthMonitor = new VoiceHealthMonitor(this);
      this.logger.log("[VoiceHealth] Monitor Initialized Successfully", "ready");
    } catch (err) {
      this.logger.log(`[VoiceHealth] Failed to initialize: ${err.message}`, "error");
      console.error(err);
    }

    permissionHandler(this);
    loadPlayerManager(this);
    [
      "loadClients",
      "loadCommands",
      "loadNodes",
      "loadPlayers",
    ].forEach((handler) => {
      require(`../loaders/${handler}`)(this);
    });
  }

  connect() {
    return super.login(this.token);
  }
}

module.exports = MusicBot;
