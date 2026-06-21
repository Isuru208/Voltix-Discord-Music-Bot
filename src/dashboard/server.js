const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const compression = require('compression');

module.exports = (client) => {
  // Compile/Obfuscate client-side JS on startup for source code protection
  try {
    const JavaScriptObfuscator = require('javascript-obfuscator');
    const sourcePath = path.join(__dirname, 'public', 'app.js');
    const outputPath = path.join(__dirname, 'public', 'app.min.js');

    if (fs.existsSync(sourcePath)) {
      client.logger.log("[Dashboard] Obfuscating app.js for security...", "ready");
      const rawCode = fs.readFileSync(sourcePath, 'utf8');
      const obfuscated = JavaScriptObfuscator.obfuscate(rawCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5, // 50% flattening for a balance of performance and security
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 0.75
      });
      fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode(), 'utf8');
      client.logger.log("[Dashboard] app.js obfuscated successfully as app.min.js", "ready");
    } else {
      client.logger.log("[Dashboard] Warning: public/app.js not found, skipping obfuscation.", "warn");
    }
  } catch (obfuscateErr) {
    client.logger.log(`[Dashboard] Failed to obfuscate client code: ${obfuscateErr.message}`, "error");
  }

  const app = express();
  const port = client.config.dashboardPort || 3000;
  const settingsPath = path.join(__dirname, 'settings.json');

  // In-memory sessions storage
  const sessions = new Map();

  // Enable Gzip compression for faster page load online
  app.use(compression());

  app.use(express.json());
  
  // Custom CORS middleware to avoid external package dependencies
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve static files from the public folder with caching for faster load times online
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 86400000, // 1 day in milliseconds
    etag: true,
    lastModified: true
  }));

  // Session Helper: Retrieve session from cookie
  const getSession = (req) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=');
      if (k) acc[k] = v;
      return acc;
    }, {});
    
    return sessions.get(cookies.session_id);
  };

  // Middleware: Require authentication
  const requireAuth = (req, res, next) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.session = session;
    next();
  };

  // Middleware: Require permission for a specific guild
  const requireGuildPermission = (req, res, next) => {
    const guildId = req.params.guildId;
    if (!req.session || !req.session.allowedGuilds || !req.session.allowedGuilds.includes(guildId)) {
      return res.status(403).json({ error: "Forbidden: You do not have permissions to manage this server" });
    }
    next();
  };

  /* AUTHENTICATION ROUTES */

  // GET Login: Redirect to Discord OAuth2 URL
  app.get('/api/auth/login', (req, res) => {
    const redirectUri = client.config.redirectUri || `http://localhost:${port}/api/auth/callback`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
  });

  // GET Callback: Exchange code, fetch user details, create session
  app.get('/api/auth/callback', async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) {
        return res.status(400).send("No authorization code provided");
      }

      if (!client.config.clientSecret || client.config.clientSecret === 'YOUR_DISCORD_CLIENT_SECRET') {
        client.logger.log("OAuth2 Error: clientSecret is not configured in config.json!", "error");
        return res.status(500).send("Dashboard authentication is misconfigured (missing clientSecret in config.json)");
      }

      const redirectUri = client.config.redirectUri || `http://localhost:${port}/api/auth/callback`;

      // Exchange code for Access Token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: client.user.id,
        client_secret: client.config.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const accessToken = tokenResponse.data.access_token;

      // Fetch Logged-in User Profile
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Fetch User's Guilds
      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Filter guilds where user has Manage Guild (0x20) or Administrator (0x8) permissions
      const adminGuilds = guildsResponse.data
        .filter(g => (BigInt(g.permissions) & 0x28n) !== 0n);
      const allowedGuilds = adminGuilds.map(g => g.id);
      const allUserGuilds = adminGuilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null
      }));

      // Create local session
      const sessionId = crypto.randomBytes(16).toString('hex');
      sessions.set(sessionId, {
        id: userResponse.data.id,
        username: `${userResponse.data.username}`,
        avatar: userResponse.data.avatar ? `https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`,
        allowedGuilds,
        allUserGuilds
      });

      // Set cookie and redirect back to dashboard index
      res.setHeader('Set-Cookie', `session_id=${sessionId}; Path=/; HttpOnly; Max-Age=86400`);
      res.redirect('/');
    } catch (err) {
      console.error("OAuth2 Callback Error:", err.response ? err.response.data : err.message);
      res.status(500).send("Authentication failed. Make sure your clientSecret in config.json and Redirect URI in Developer Portal are correct.");
    }
  });

  // GET User: Returns logged-in user profile
  app.get('/api/auth/user', (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({
      id: session.id,
      username: session.username,
      avatar: session.avatar,
      allowedGuilds: session.allowedGuilds
    });
  });

  // GET Logout: Clear session cookie
  app.get('/api/auth/logout', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=');
        if (k) acc[k] = v;
        return acc;
      }, {});
      if (cookies.session_id) {
        sessions.delete(cookies.session_id);
      }
    }
    res.setHeader('Set-Cookie', 'session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/');
  });

  /* PROTECTED API ENDPOINTS */

  // GET stats endpoint
  app.get('/api/stats', requireAuth, (req, res) => {
    try {
      // Return only guilds that the user is authorized to manage
      const allowedGuilds = req.session.allowedGuilds;
      const totalGuilds = client.guilds.cache.filter(g => allowedGuilds.includes(g.id)).size;
      const totalUsers = client.guilds.cache.filter(g => allowedGuilds.includes(g.id)).reduce((acc, g) => acc + g.memberCount, 0);
      const activePlayers = client.manager ? client.manager.players.size : 0;
      
      const lavalinkNodes = [];
      if (client.manager && client.manager.shoukaku && client.manager.shoukaku.nodes) {
        client.manager.shoukaku.nodes.forEach((node, key) => {
          lavalinkNodes.push({
            name: key,
            state: node.state,
            ping: node.ping || 0
          });
        });
      }

      res.json({
        clientId: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL(),
        ping: client.ws.ping,
        uptime: client.uptime,
        guilds: totalGuilds,
        users: totalUsers,
        activePlayers: activePlayers,
        nodes: lavalinkNodes,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
      });
    } catch (err) {
      console.error("Dashboard API Error (stats):", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // GET current activity settings
  app.get('/api/activity', requireAuth, (req, res) => {
    try {
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        return res.json(settings);
      }
      res.json({
        enabled: false,
        activityName: "",
        activityType: 4,
        status: "online",
        streamUrl: ""
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to read settings" });
    }
  });

  // POST update activity settings
  app.post('/api/activity', requireAuth, (req, res) => {
    try {
      const { enabled, activityName, activityType, status, streamUrl } = req.body;
      
      const newSettings = {
        enabled: !!enabled,
        activityName: activityName || "",
        activityType: parseInt(activityType) !== undefined ? parseInt(activityType) : 4,
        status: status || "online",
        streamUrl: streamUrl || ""
      };

      fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), 'utf-8');

      // Trigger presence update on the bot immediately if client is ready
      if (client.user) {
        if (newSettings.enabled) {
          const typeMap = {
            0: 0, // Playing
            1: 1, // Streaming
            2: 2, // Listening
            3: 3, // Watching
            4: 4, // Custom
            5: 5  // Competing
          };
          client.user.setPresence({
            activities: [{
              name: newSettings.activityName,
              type: typeMap[newSettings.activityType] !== undefined ? typeMap[newSettings.activityType] : 4,
              url: newSettings.activityType === 1 ? newSettings.streamUrl : undefined
            }],
            status: newSettings.status
          });
          client.logger.log(`Dashboard updated presence to: [${newSettings.status}] ${newSettings.activityName}`, "ready");
        }
      }

      res.json({ success: true, settings: newSettings });
    } catch (err) {
      console.error("Dashboard API Error (activity):", err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // GET list of guilds user has permission to manage (both bot present and absent)
  app.get('/api/guilds', requireAuth, (req, res) => {
    try {
      const allUserGuilds = req.session.allUserGuilds || [];
      const guilds = allUserGuilds.map(ug => {
        const botGuild = client.guilds.cache.get(ug.id);
        return {
          id: ug.id,
          name: ug.name,
          icon: botGuild ? (botGuild.iconURL({ forceStatic: false }) || null) : ug.icon,
          botIn: !!botGuild,
          memberCount: botGuild ? botGuild.memberCount : 0
        };
      });
      res.json(guilds);
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve guilds" });
    }
  });

  // GET roles and channels for a specific guild
  app.get('/api/guilds/:guildId/data', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const roles = guild.roles.cache
        .filter(r => r.name !== "@everyone" && !r.managed)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

      const textChannels = guild.channels.cache
        .filter(c => c.type === 0 || c.type === 5)
        .map(c => ({ id: c.id, name: c.name }));

      const voiceChannels = guild.channels.cache
        .filter(c => c.type === 2)
        .map(c => ({ id: c.id, name: c.name }));

      res.json({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL({ forceStatic: false }) || null,
        roles,
        textChannels,
        voiceChannels
      });
    } catch (err) {
      console.error("Dashboard API Error (guild data):", err);
      res.status(500).json({ error: "Failed to retrieve guild details" });
    }
  });

  // GET settings configuration of a specific guild
  app.get('/api/guilds/:guildId/settings', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;

      // Prefix
      const prefixRow = client.db.prefixes.get(guildId);
      const prefix = prefixRow ? prefixRow.prefix : client.prefix;

      // Automod
      const automodRow = client.db.automod.get(guildId);
      const automod = automodRow ? {
        antiLink: !!automodRow.antiLink,
        antiInvite: !!automodRow.antiInvite,
        antiSpam: !!automodRow.antiSpam,
        antiMention: !!automodRow.antiMention,
        antiCaps: !!automodRow.antiCaps,
        antiEmoji: !!automodRow.antiEmoji,
        antiNsfw: !!automodRow.antiNsfw,
        maxMentions: automodRow.maxMentions !== undefined ? automodRow.maxMentions : 5,
        maxEmoji: automodRow.maxEmoji !== undefined ? automodRow.maxEmoji : 10,
        logChannel: automodRow.logChannel || ""
      } : {
        antiLink: false,
        antiInvite: false,
        antiSpam: false,
        antiMention: false,
        antiCaps: false,
        antiEmoji: false,
        antiNsfw: false,
        maxMentions: 5,
        maxEmoji: 10,
        logChannel: ""
      };

      // Auto Roles
      const autoroleRow = client.db.autorole.get(guildId);
      const autoroles = autoroleRow ? autoroleRow.roles : [];

      // Voice Roles
      const voiceroleRow = client.db.voicerole.get(guildId);
      const voiceroles = voiceroleRow ? {
        roleId: voiceroleRow.roleId || "",
        voiceChannelId: voiceroleRow.voiceChannelId || ""
      } : {
        roleId: "",
        voiceChannelId: ""
      };

      // Invite tracking
      const inviteTrackingRow = client.db.invitetracking.get(guildId);
      const inviteTracking = inviteTrackingRow ? {
        enabled: !!inviteTrackingRow.enabled,
        channelId: inviteTrackingRow.channelId || ""
      } : {
        enabled: false,
        channelId: ""
      };

      // 24/7 music connection
      const twoFourSevenRow = client.db.twofourseven.get(guildId);
      const twoFourSeven = {
        enabled: !!twoFourSevenRow,
        textId: twoFourSevenRow ? twoFourSevenRow.textId || "" : "",
        voiceId: twoFourSevenRow ? twoFourSevenRow.voiceId || "" : ""
      };

      res.json({
        prefix,
        automod,
        autoroles,
        voiceroles,
        inviteTracking,
        twoFourSeven
      });
    } catch (err) {
      console.error("Dashboard API Error (get settings):", err);
      res.status(500).json({ error: "Failed to retrieve guild settings" });
    }
  });

  // POST save settings configuration of a specific guild
  app.post('/api/guilds/:guildId/settings', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { prefix, automod, autoroles, voiceroles, inviteTracking, twoFourSeven } = req.body;

      // Update Prefix
      if (prefix !== undefined) {
        client.db.prefixes.set(guildId, { prefix: prefix });
      }

      // Update Automod
      if (automod !== undefined) {
        client.db.automod.set(guildId, {
          antiLink: !!automod.antiLink,
          antiInvite: !!automod.antiInvite,
          antiSpam: !!automod.antiSpam,
          antiMention: !!automod.antiMention,
          antiCaps: !!automod.antiCaps,
          antiEmoji: !!automod.antiEmoji,
          antiNsfw: !!automod.antiNsfw,
          maxMentions: parseInt(automod.maxMentions) || 5,
          maxEmoji: parseInt(automod.maxEmoji) || 10,
          logChannel: automod.logChannel || ""
        });
      }

      // Update Auto Roles
      if (autoroles !== undefined) {
        client.db.autorole.set(guildId, Array.isArray(autoroles) ? autoroles : []);
      }

      // Update Voice Roles
      if (voiceroles !== undefined) {
        client.db.voicerole.set(guildId, {
          roleId: voiceroles.roleId || "",
          voiceChannelId: voiceroles.voiceChannelId || ""
        });
      }

      // Update Invite Tracking and Sync Invite Cache
      if (inviteTracking !== undefined) {
        const isEnabled = !!inviteTracking.enabled;
        client.db.invitetracking.set(guildId, {
          enabled: isEnabled,
          channelId: inviteTracking.channelId || ""
        });

        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          if (isEnabled) {
            guild.invites.fetch().then(invites => {
              const inviteCache = new Map();
              invites.forEach(invite => {
                inviteCache.set(invite.code, { uses: invite.uses, inviter: invite.inviter });
              });
              client.invites.set(guildId, inviteCache);
            }).catch(() => {});
          } else {
            client.invites.delete(guildId);
          }
        }
      }

      // Update 24/7 Music Connection
      if (twoFourSeven !== undefined) {
        if (twoFourSeven.enabled) {
          client.db.twofourseven.set(guildId, {
            textId: twoFourSeven.textId || "",
            voiceId: twoFourSeven.voiceId || ""
          });
        } else {
          client.db.twofourseven.delete(guildId);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Dashboard API Error (save settings):", err);
      res.status(500).json({ error: "Failed to save guild settings" });
    }
  });

  // GET Carl-bot settings for a specific guild
  app.get('/api/guilds/:guildId/carlbot-settings', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;

      // Welcome Messages Settings
      let welcomemessages = client.db.welcomemessages.get(guildId);
      if (!welcomemessages) {
        welcomemessages = {
          welcomeChannel: "",
          welcomeMessage: "Welcome {user} to {guild}!",
          goodbyeChannel: "",
          goodbyeMessage: "{username} has left the server.",
          enabled: false,
          dmOnJoinMessage: "",
          banMessage: "",
          warnMessage: "",
          dmOnLeaveMessage: ""
        };
      } else {
        welcomemessages.dmOnJoinMessage = welcomemessages.dmOnJoinMessage || "";
        welcomemessages.banMessage = welcomemessages.banMessage || "";
        welcomemessages.warnMessage = welcomemessages.warnMessage || "";
        welcomemessages.dmOnLeaveMessage = welcomemessages.dmOnLeaveMessage || "";
      }

      // Logging Settings
      let logging = client.db.logging.get(guildId);
      if (!logging) {
        logging = {
          messageDeleteChannel: "",
          messageEditChannel: "",
          memberJoinLeaveChannel: "",
          roleUpdateChannel: "",
          enabled: false
        };
      }

      // Tags List
      const tags = client.db.tags.getForGuild(guildId) || [];

      // Reaction Roles List
      const reactionroles = client.db.reactionroles.getForGuild(guildId) || [];

      res.json({
        welcomemessages,
        logging,
        tags,
        reactionroles
      });
    } catch (err) {
      console.error("Dashboard API Error (get carlbot settings):", err);
      res.status(500).json({ error: "Failed to retrieve Carl-bot settings" });
    }
  });

  // POST save Welcome settings
  app.post('/api/guilds/:guildId/carlbot-settings/welcomemessages', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { welcomeChannel, welcomeMessage, goodbyeChannel, goodbyeMessage, enabled, dmOnJoinMessage, banMessage, warnMessage, dmOnLeaveMessage } = req.body;

      client.db.welcomemessages.set(guildId, {
        welcomeChannel: welcomeChannel || "",
        welcomeMessage: welcomeMessage || "Welcome {user} to {guild}!",
        goodbyeChannel: goodbyeChannel || "",
        goodbyeMessage: goodbyeMessage || "{username} has left the server.",
        enabled: !!enabled,
        dmOnJoinMessage: dmOnJoinMessage || "",
        banMessage: banMessage || "",
        warnMessage: warnMessage || "",
        dmOnLeaveMessage: dmOnLeaveMessage || ""
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Dashboard API Error (save welcomemessages):", err);
      res.status(500).json({ error: "Failed to save Welcomer settings" });
    }
  });

  // POST save Logging settings
  app.post('/api/guilds/:guildId/carlbot-settings/logging', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { messageDeleteChannel, messageEditChannel, memberJoinLeaveChannel, roleUpdateChannel, enabled } = req.body;

      client.db.logging.set(guildId, {
        messageDeleteChannel: messageDeleteChannel || "",
        messageEditChannel: messageEditChannel || "",
        memberJoinLeaveChannel: memberJoinLeaveChannel || "",
        roleUpdateChannel: roleUpdateChannel || "",
        enabled: !!enabled
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Dashboard API Error (save logging):", err);
      res.status(500).json({ error: "Failed to save logging settings" });
    }
  });

  // POST manage Tags (add/delete)
  app.post('/api/guilds/:guildId/carlbot-settings/tags', requireAuth, requireGuildPermission, (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { action, name, content } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Tag name is required" });
      }

      const cleanName = name.trim().toLowerCase();

      if (action === 'add') {
        if (!content || typeof content !== 'string') {
          return res.status(400).json({ error: "Tag content is required" });
        }
        client.db.tags.set(guildId, cleanName, content);
      } else if (action === 'delete') {
        client.db.tags.delete(guildId, cleanName);
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Dashboard API Error (manage tags):", err);
      res.status(500).json({ error: "Failed to manage tags" });
    }
  });

  // POST manage Reaction Roles (add/delete)
  app.post('/api/guilds/:guildId/carlbot-settings/reactionroles', requireAuth, requireGuildPermission, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { action, messageId, channelId, emoji, roleId, messageContent, options } = req.body;

      if (action === 'add') {
        if (!channelId) {
          return res.status(400).json({ error: "Channel ID is required" });
        }

        const reactionOptions = Array.isArray(options) && options.length
          ? options.map(option => ({
            emoji: typeof option.emoji === 'string' ? option.emoji.trim() : "",
            roleId: typeof option.roleId === 'string' ? option.roleId.trim() : ""
          }))
          : [{
            emoji: typeof emoji === 'string' ? emoji.trim() : "",
            roleId: typeof roleId === 'string' ? roleId.trim() : ""
          }];

        if (reactionOptions.length === 0 || reactionOptions.some(option => !option.emoji || !option.roleId)) {
          return res.status(400).json({ error: "Emoji and Role ID are required for every option" });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: "Guild not found" });
        }

        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          return res.status(400).json({ error: "Target channel must be a text channel" });
        }

        let targetMessageId = messageId ? String(messageId).trim() : "";
        let targetMessage = null;

        if (targetMessageId) {
          targetMessage = await channel.messages.fetch(targetMessageId).catch(() => null);
          if (!targetMessage) {
            return res.status(404).json({ error: "Message ID was not found in the selected channel" });
          }
        } else {
          const rawContent = typeof messageContent === 'string' ? messageContent.trim() : "";
          if (!rawContent) {
            return res.status(400).json({ error: "Message content/embed is required when Message ID is empty" });
          }

          let payload = { content: rawContent };
          if (rawContent.startsWith('{')) {
            try {
              const parsed = JSON.parse(rawContent);
              const embeds = Array.isArray(parsed.embeds) ? parsed.embeds : (parsed.embed ? [parsed.embed] : []);
              const normalizedEmbeds = embeds.slice(0, 10).map(embed => {
                const normalized = { ...embed };
                if (normalized.timestamp === true) {
                  normalized.timestamp = new Date().toISOString();
                } else if (normalized.timestamp === false) {
                  delete normalized.timestamp;
                }
                return normalized;
              });
              payload = {
                content: parsed.content || undefined,
                embeds: normalizedEmbeds.length ? normalizedEmbeds : undefined,
                allowedMentions: { parse: [] }
              };
            } catch (parseErr) {
              payload = { content: rawContent, allowedMentions: { parse: [] } };
            }
          } else {
            payload.allowedMentions = { parse: [] };
          }

          if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
            return res.status(400).json({ error: "Message content or embed data is required" });
          }

          targetMessage = await channel.send(payload);
          targetMessageId = targetMessage.id;
        }

        for (const option of reactionOptions) {
          await targetMessage.react(option.emoji);
          client.db.reactionroles.set(guildId, targetMessageId, channelId, option.emoji, option.roleId);
        }
      } else if (action === 'delete') {
        if (!messageId || !emoji) {
          return res.status(400).json({ error: "Message ID and Emoji are required" });
        }
        client.db.reactionroles.delete(guildId, messageId, emoji);
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Dashboard API Error (manage reactionroles):", err);
      res.status(500).json({ error: "Failed to manage reaction roles" });
    }
  });

  // Serve index.html for all other routes to support SPA feel
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(port, () => {
    client.logger.log(`[Dashboard] Running at http://localhost:${port}`, "ready");
  });
};
