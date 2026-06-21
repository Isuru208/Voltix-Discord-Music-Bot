const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { parseMessage } = require("../../utils/messageParser");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    if (!member || !member.guild) return;

    try {
      const autoRoleData = client.db.autorole.get(member.guild.id);
      if (autoRoleData && autoRoleData.roles.length > 0) {
        for (const roleId of autoRoleData.roles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role).catch(() => { });
          }
        }
      }

      // Custom Welcomer Message
      const welcomerData = client.db.welcomemessages.get(member.guild.id);
      if (welcomerData && welcomerData.enabled && welcomerData.welcomeChannel) {
        const welcomeChannel = member.guild.channels.cache.get(welcomerData.welcomeChannel);
        if (welcomeChannel) {
          const rawMessage = welcomerData.welcomeMessage || "Welcome {user} to {guild}!";
          const replacements = {
            user: `<@${member.user.id}>`,
            username: member.user.username,
            guild: member.guild.name,
            membercount: member.guild.memberCount
          };
          const messagePayload = parseMessage(rawMessage, replacements);
          await welcomeChannel.send(messagePayload).catch(() => {});
        }
      }

      // DM on Join Message
      if (welcomerData && welcomerData.enabled && welcomerData.dmOnJoinMessage) {
        const rawDm = welcomerData.dmOnJoinMessage.trim();
        if (rawDm) {
          const replacements = {
            user: `<@${member.user.id}>`,
            username: member.user.username,
            guild: member.guild.name,
            membercount: member.guild.memberCount
          };
          const dmPayload = parseMessage(rawDm, replacements);
          await member.send(dmPayload).catch(() => {});
        }
      }

      // Action Logging: Member Join
      const logData = client.db.logging.get(member.guild.id);
      if (logData && logData.enabled && logData.memberJoinLeaveChannel) {
        const logChannel = member.guild.channels.cache.get(logData.memberJoinLeaveChannel);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: "Member Joined", iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${member} (${member.user.tag}) joined the server.`)
            .setColor("#00ff00")
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: "Account Age", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: "Member Count", value: `${member.guild.memberCount}`, inline: true }
            )
            .setFooter({ text: `ID: ${member.user.id}` })
            .setTimestamp();

          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      const trackingEnabled = client.db.invitetracking.get(member.guild.id);

      if (trackingEnabled && trackingEnabled.status === 1) {

        if (member.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await trackInvite(client, member);
        }
      }

    } catch (error) {
      console.error("Error in guildMemberAdd event:", error);
    }
  },
};

async function trackInvite(client, member) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newInvites = await member.guild.invites.fetch().catch(() => null);
    if (!newInvites) return;

    const cachedInvites = client.invites?.get(member.guild.id);
    let usedInvite = null;
    let inviter = null;

    if (!cachedInvites) {
      client.invites = client.invites || new Map();
      const inviteCache = new Map();
      newInvites.forEach(invite => {
        inviteCache.set(invite.code, {
          uses: invite.uses,
          inviter: invite.inviter
        });
      });
      client.invites.set(member.guild.id, inviteCache);
    } else {
      for (const [code, newInvite] of newInvites) {
        const cachedInvite = cachedInvites.get(code);

        if (!cachedInvite) {
          if (newInvite.uses > 0) {
            usedInvite = newInvite;
            inviter = newInvite.inviter;
            break;
          }
        } else if (newInvite.uses > cachedInvite.uses) {
          usedInvite = newInvite;
          inviter = newInvite.inviter;
          break;
        }
      }

      const inviteCache = new Map();
      newInvites.forEach(invite => {
        inviteCache.set(invite.code, {
          uses: invite.uses,
          inviter: invite.inviter
        });
      });
      client.invites.set(member.guild.id, inviteCache);
    }

    const accountAge = Date.now() - member.user.createdTimestamp;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const isFake = accountAge < sevenDays;

    const previousJoin = client.db.invite_logs.get(member.guild.id, member.user.id);

    let isRejoin = false;
    if (previousJoin) {
      const tenDays = 10 * 24 * 60 * 60 * 1000;
      const timeSinceLastJoin = Date.now() - new Date(previousJoin.joinedAt).getTime();
      isRejoin = timeSinceLastJoin <= tenDays;
    }

    if (!inviter) {
      return;
    }

    client.db.invite_logs.create({
      guildId: member.guild.id,
      userId: member.user.id,
      inviterId: inviter.id,
      inviteCode: usedInvite.code,
      joinedAt: new Date().toISOString(),
      isLeft: 0,
      isFake: isFake ? 1 : 0,
      isRejoin: isRejoin ? 1 : 0
    });

  } catch (error) {
    console.error("Error tracking invite:", error);
  }
}
