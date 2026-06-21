document.addEventListener('DOMContentLoaded', () => {
  // Authentication Containers
  const loginScreen = document.getElementById('login-screen');
  const serverPickerScreen = document.getElementById('server-picker-screen');
  const appContainer = document.getElementById('app-container');
  const footerUserCard = document.getElementById('footer-user-card');
  const footerUserAvatar = document.getElementById('footer-user-avatar');
  const footerUserName = document.getElementById('footer-user-name');

  // Navigation & Tab Panels
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');
  const currentPageTitle = document.getElementById('current-page-title');
  const topGuildName = document.getElementById('top-guild-name');
  const manualRefreshBtn = document.getElementById('manual-refresh-btn');
  const refreshIcon = document.getElementById('refresh-icon');
  const lastUpdatedTime = document.getElementById('last-updated-time');
  const toast = document.getElementById('toast');

  // Placeholder Panel Select Button
  const placeholderSelectBtn = document.getElementById('placeholder-select-btn');

  // Guild Selector Widget Elements
  const guildSelectorTrigger = document.getElementById('guild-selector-trigger');
  const currentGuildAvatar = document.getElementById('current-guild-avatar');
  const currentGuildName = document.getElementById('current-guild-name');

  // Overview Panel Stats & Info Elements
  const overviewServerAvatar = document.getElementById('overview-server-avatar');
  const overviewServerName = document.getElementById('overview-server-name');
  const overviewServerMembers = document.getElementById('overview-server-members');
  const statPlayers = document.getElementById('stat-players');
  const statPing = document.getElementById('stat-ping');
  const statUptime = document.getElementById('stat-uptime');
  const statGuilds = document.getElementById('stat-guilds');
  const lavalinkNodesList = document.getElementById('lavalink-nodes-list');

  // Settings Panel Form Elements
  const guildSettingsForm = document.getElementById('guild-settings-form');
  const guildPrefix = document.getElementById('guild-prefix');
  const twofoursevenEnabled = document.getElementById('twofourseven-enabled');
  const twofoursevenChannelsGroup = document.getElementById('twofourseven-channels-group');
  const twofoursevenVoice = document.getElementById('twofourseven-voice');
  const twofoursevenText = document.getElementById('twofourseven-text');

  // Auto Roles Panel Form Elements
  const autorolesForm = document.getElementById('autoroles-form');
  const autorolesJoinSelect = document.getElementById('autoroles-join-select');
  const voicerolesChannelSelect = document.getElementById('voiceroles-channel-select');
  const voicerolesRoleSelect = document.getElementById('voiceroles-role-select');

  // Welcome Logs Panel Form Elements
  const welcomeForm = document.getElementById('welcome-form');
  const invitetrackingEnabled = document.getElementById('invitetracking-enabled');
  const invitetrackingChannelGroup = document.getElementById('invitetracking-channel-group');
  const invitetrackingChannel = document.getElementById('invitetracking-channel');

  // Automod Panel Form Elements
  const automodForm = document.getElementById('automod-form');
  const automodAntilink = document.getElementById('automod-antilink');
  const automodAntiinvite = document.getElementById('automod-antiinvite');
  const automodAntispam = document.getElementById('automod-antispam');
  const automodAntimention = document.getElementById('automod-antimention');
  const automodAnticaps = document.getElementById('automod-anticaps');
  const automodAntiemoji = document.getElementById('automod-antiemoji');
  const automodAntinsfw = document.getElementById('automod-antinsfw');
  const automodMaxmentions = document.getElementById('automod-maxmentions');
  const automodMaxemojis = document.getElementById('automod-maxemojis');
  const automodLogchannel = document.getElementById('automod-logchannel');

  // Global Presence Panel Form Elements
  const presenceForm = document.getElementById('presence-form');
  const presenceEnabled = document.getElementById('presence-enabled');
  const statusType = document.getElementById('status-type');
  const statusState = document.getElementById('status-state');
  const statusText = document.getElementById('status-text');
  const streamUrlGroup = document.getElementById('stream-url-group');
  const streamUrl = document.getElementById('stream-url');
  const savePresenceBtn = document.getElementById('save-presence-btn');
  
  // Carl-bot Welcomer Form Elements
  const welcomerForm = document.getElementById('carlbot-welcomer-form');
  const welcomerEnabled = document.getElementById('welcomer-enabled');
  const welcomerWelcomeChannel = document.getElementById('welcomer-welcome-channel');
  const welcomerWelcomeMessage = document.getElementById('welcomer-welcome-message');
  const welcomerGoodbyeChannel = document.getElementById('welcomer-goodbye-channel');
  const welcomerGoodbyeMessage = document.getElementById('welcomer-goodbye-message');
  const welcomerDmMessage = document.getElementById('welcomer-dm-message');
  const welcomerBanMessage = document.getElementById('welcomer-ban-message');
  const welcomerWarnMessage = document.getElementById('welcomer-warn-message');
  const welcomerDmLeaveMessage = document.getElementById('welcomer-dm-leave-message');

  // Carl-bot Tags Form Elements
  const addTagForm = document.getElementById('carlbot-add-tag-form');
  const tagNewName = document.getElementById('tag-new-name');
  const tagNewContent = document.getElementById('tag-new-content');
  const tagsListTableBody = document.getElementById('tags-list-table-body');

  // Carl-bot Reaction Roles Form Elements
  const addRrForm = document.getElementById('carlbot-add-rr-form');
  const rrChannel = document.getElementById('rr-channel');
  const rrMessageId = document.getElementById('rr-message-id');
  const rrMessageContent = document.getElementById('rr-message-content');
  const rrEmoji = document.getElementById('rr-emoji');
  const rrRole = document.getElementById('rr-role');
  const rrExtraOptions = document.getElementById('rr-extra-options');
  const rrAddOptionBtn = document.getElementById('rr-add-option-btn');
  const rrListTableBody = document.getElementById('rr-list-table-body');

  // Carl-bot Logging Form Elements
  const loggingForm = document.getElementById('carlbot-logging-form');
  const loggingEnabled = document.getElementById('logging-enabled');
  const loggingMsgDelete = document.getElementById('logging-msg-delete');
  const loggingMsgEdit = document.getElementById('logging-msg-edit');
  const loggingMemberJoinLeave = document.getElementById('logging-member-join-leave');
  const loggingRoleUpdate = document.getElementById('logging-role-update');

  // Presence Preview Elements
  const previewAvatar = document.getElementById('preview-avatar');
  const previewStatusDot = document.getElementById('preview-status-dot');
  const previewName = document.getElementById('preview-name');
  const previewPresenceText = document.getElementById('preview-presence-text');

  // Application State
  let activeGuildId = null;
  let allGuilds = [];
  let guildRoles = [];
  let guildTextChannels = [];
  let guildVoiceChannels = [];
  let isRefreshing = false;
  let loggedInUser = null;
  let botClientId = null;

  // Session Checker (Verify Auth Status)
  async function checkAuthentication() {
    try {
      const response = await fetch('/api/auth/user');
      if (response.status === 401) {
        // Unauthenticated -> Show Login screen
        loginScreen.style.display = 'flex';
        serverPickerScreen.style.display = 'none';
        appContainer.style.display = 'none';
        return false;
      }
      
      if (!response.ok) throw new Error();

      const user = await response.json();
      loggedInUser = user;

      // Update greeting message
      const pickerGreeting = document.getElementById('server-picker-greeting');
      if (pickerGreeting) {
        pickerGreeting.textContent = `Hello, ${user.username}! Please select a server to get started`;
      }

      // Update sidebar user card
      footerUserAvatar.src = user.avatar;
      footerUserName.textContent = user.username;
      
      // Show server picker full screen first (hide login and dashboard)
      loginScreen.style.display = 'none';
      serverPickerScreen.style.display = 'flex';
      appContainer.style.display = 'none';

      // Load initial dashboard statistics and servers
      fetchStats(false);
      fetchGuilds();
      fetchPresenceSettings();

      return true;
    } catch (err) {
      console.error("Auth check failed:", err);
      loginScreen.style.display = 'flex';
      serverPickerScreen.style.display = 'none';
      appContainer.style.display = 'none';
      return false;
    }
  }

  // SPA Tab Navigation Click listener
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');

      // Global Presence tab does not require an active guild
      if (targetTab !== 'presence' && !activeGuildId) {
        showToast('Please select a server first!', true);
        goBackToServerPicker();
        return;
      }

      switchTab(targetTab);
    });
  });

  // Switch Active Tab Panel
  function switchTab(tabId) {
    navItems.forEach(n => {
      if (n.getAttribute('data-tab') === tabId) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    panels.forEach(p => {
      p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Set page title
    const matchingNavItem = Array.from(navItems).find(n => n.getAttribute('data-tab') === tabId);
    currentPageTitle.textContent = matchingNavItem ? matchingNavItem.textContent.trim() : 'Dashboard';
  }

  // Toast Notification Trigger
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = 'toast show';
    if (isError) toast.classList.add('error');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Uptime Formatter
  function formatUptime(ms) {
    if (!ms || isNaN(ms)) return '0d 0h 0m';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  // Navigate back to server picker when clicking the guild card in sidebar
  function goBackToServerPicker() {
    appContainer.style.display = 'none';
    serverPickerScreen.style.display = 'flex';
    activeGuildId = null;
    currentGuildName.textContent = 'Select Server';
    currentGuildAvatar.style.backgroundImage = 'none';
    currentGuildAvatar.textContent = '?';
    topGuildName.textContent = 'No server selected';
    fetchGuilds(); // Refresh the grid
  }

  guildSelectorTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    goBackToServerPicker();
  });

  if (placeholderSelectBtn) {
    placeholderSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goBackToServerPicker();
    });
  }

  // Picker Refresh button - re-fetch guild list
  const pickerRefreshBtn = document.getElementById('picker-refresh-btn');
  if (pickerRefreshBtn) {
    pickerRefreshBtn.addEventListener('click', () => {
      fetchGuilds();
      showToast('Server list refreshed!');
    });
  }

  // Back to Server Picker button (from dashboard placeholder panel)
  const backToPickerBtn = document.getElementById('back-to-picker-btn');
  if (backToPickerBtn) {
    backToPickerBtn.addEventListener('click', () => {
      goBackToServerPicker();
    });
  }



  // GET global statistics & bot details
  async function fetchStats(quiet = false) {
    if (isRefreshing) return;
    isRefreshing = true;

    if (!quiet) {
      refreshIcon.classList.add('spinning');
      lastUpdatedTime.textContent = 'Updating...';
    }

    try {
      const response = await fetch('/api/stats');
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      const data = await response.json();
      botClientId = data.clientId;

      // Update overview avatar favicon
      favicon.href = data.avatar || '';
      previewAvatar.src = data.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
      previewName.textContent = data.username || 'Voltix Bot';

      // Update Overview/Global elements
      statPlayers.textContent = data.activePlayers.toLocaleString();
      statPing.textContent = `${data.ping} ms`;
      statUptime.textContent = formatUptime(data.uptime);
      statGuilds.textContent = data.guilds.toLocaleString();

      // Update Node list
      lavalinkNodesList.innerHTML = '';
      if (data.nodes && data.nodes.length > 0) {
        data.nodes.forEach(node => {
          const nodeCard = document.createElement('div');
          nodeCard.className = 'node-card';
          
          let stateClass = 'disconnected';
          let stateText = 'Disconnected';
          if (node.state === 'CONNECTED' || node.state === 1) {
            stateClass = 'connected';
            stateText = 'Connected';
          } else if (node.state === 'CONNECTING' || node.state === 0) {
            stateClass = 'connecting';
            stateText = 'Connecting';
          }

          nodeCard.innerHTML = `
            <div class="node-info-left">
              <div class="node-status-indicator ${stateClass}"></div>
              <div>
                <div class="node-name">${node.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">Status: ${stateText}</div>
              </div>
            </div>
            <div class="node-ping-val">Ping: ${node.ping}ms</div>
          `;
          lavalinkNodesList.appendChild(nodeCard);
        });
      } else {
        lavalinkNodesList.innerHTML = `
          <div class="node-card loading" style="color: var(--accent-red); border-color: rgba(239, 68, 68, 0.2);">
            <span>⚠️ No Lavalink nodes connected. Music commands will fail.</span>
          </div>
        `;
      }

      lastUpdatedTime.textContent = 'Just now';
    } catch (err) {
      console.error('Failed to fetch bot stats:', err);
      lastUpdatedTime.textContent = 'Failed to sync';
    } finally {
      isRefreshing = false;
      setTimeout(() => {
        refreshIcon.classList.remove('spinning');
      }, 500);
    }
  }

  // GET list of guilds to load dropdown
  async function fetchGuilds() {
    try {
      const response = await fetch('/api/guilds');
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      allGuilds = await response.json();
      renderServerPickerGrid(allGuilds);
    } catch (err) {
      console.error('Failed to load server list:', err);
    }
  }




  // Select guild and trigger settings fetch
  async function selectGuild(guild) {
    activeGuildId = guild.id;
    
    // Hide server picker overlay and show full dashboard
    serverPickerScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    footerUserCard.style.display = 'flex';

    // Update trigger UI card
    currentGuildName.textContent = guild.name;
    if (guild.icon) {
      currentGuildAvatar.textContent = '';
      currentGuildAvatar.style.backgroundImage = `url('${guild.icon}')`;
    } else {
      currentGuildAvatar.style.backgroundImage = 'none';
      currentGuildAvatar.textContent = guild.name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2);
    }

    // Update Overview banner
    overviewServerName.textContent = guild.name;
    overviewServerMembers.textContent = guild.memberCount.toLocaleString();
    if (guild.icon) {
      overviewServerAvatar.textContent = '';
      overviewServerAvatar.style.backgroundImage = `url('${guild.icon}')`;
    } else {
      overviewServerAvatar.style.backgroundImage = 'none';
      overviewServerAvatar.textContent = guild.name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2);
    }

    topGuildName.textContent = guild.name;

    // Load guild roles/channels first, then get settings from DB
    await loadGuildData(guild.id);
    await loadGuildSettings(guild.id);
    await loadCarlbotSettings(guild.id);

    // Always switch to overview panel when selecting a server
    switchTab('overview');
  }

  // Fetch Channels & Roles of selected guild
  async function loadGuildData(guildId) {
    try {
      const response = await fetch(`/api/guilds/${guildId}/data`);
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      const data = await response.json();
      guildRoles = data.roles;
      guildTextChannels = data.textChannels;
      guildVoiceChannels = data.voiceChannels;

      // Populate Select Elements
      populateSelects();
    } catch (err) {
      console.error('Failed to load guild channels and roles:', err);
      showToast('Error syncing server details!', true);
    }
  }

  // Populate Select drop-down items dynamically
  function populateSelects() {
    // 24/7 Channel selectors
    populateChannelSelect(twofoursevenVoice, guildVoiceChannels, '-- Select Voice Channel --');
    populateChannelSelect(twofoursevenText, guildTextChannels, '-- Select Text Channel --');

    // Auto roles Member Join selectors
    autorolesJoinSelect.innerHTML = '';
    guildRoles.forEach(role => {
      const opt = document.createElement('option');
      opt.value = role.id;
      opt.textContent = role.name;
      autorolesJoinSelect.appendChild(opt);
    });

    // Voice role selectors
    populateChannelSelect(voicerolesChannelSelect, guildVoiceChannels, '-- Disable Voice Role / No Channel --');
    populateRoleSelect(voicerolesRoleSelect, guildRoles, '-- Select Role --');

    // Invite tracking log channel selector
    populateChannelSelect(invitetrackingChannel, guildTextChannels, '-- Select Text Channel --');

    // Carl-bot selectors
    populateChannelSelect(welcomerWelcomeChannel, guildTextChannels, '-- Select Text Channel --');
    populateChannelSelect(welcomerGoodbyeChannel, guildTextChannels, '-- Select Text Channel --');
    populateChannelSelect(rrChannel, guildTextChannels, '-- Select Text Channel --');
    populateRoleSelect(rrRole, guildRoles, '-- Select Role --');
    rrExtraOptions.querySelectorAll('.rr-extra-role').forEach(select => {
      populateRoleSelect(select, guildRoles, '-- Select Role --');
    });
    
    populateChannelSelect(loggingMsgDelete, guildTextChannels, '-- Select Text Channel --');
    populateChannelSelect(loggingMsgEdit, guildTextChannels, '-- Select Text Channel --');
    populateChannelSelect(loggingMemberJoinLeave, guildTextChannels, '-- Select Text Channel --');
    populateChannelSelect(loggingRoleUpdate, guildTextChannels, '-- Select Text Channel --');

    // Automod logs channel selector
    populateChannelSelect(automodLogchannel, guildTextChannels, '-- No log channel / Logging disabled --');
  }

  function populateChannelSelect(selectElement, channels, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    channels.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = `# ${ch.name}`;
      selectElement.appendChild(opt);
    });
  }

  function populateRoleSelect(selectElement, roles, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    roles.forEach(role => {
      const opt = document.createElement('option');
      opt.value = role.id;
      opt.textContent = role.name;
      selectElement.appendChild(opt);
    });
  }

  const fullEmojiPickerModule = import('https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js').catch(() => null);

  const reactionRoleEmojiChoices = [
    '\u2705', '\u274c', '\u2b50', '\ud83c\udf89', '\ud83d\udc4d', '\ud83d\udc4e',
    '\ud83d\udd25', '\ud83d\udc8e', '\ud83c\udfb5', '\ud83c\udfae', '\ud83d\udc9c', '\ud83d\udc99',
    '\ud83d\udc9a', '\ud83d\udc9b', '\ud83e\udde1', '\ud83d\udda4', '\ud83d\udd34', '\ud83d\udfe0',
    '\ud83d\udfe1', '\ud83d\udfe2', '\ud83d\udd35', '\ud83d\udfe3', '\u26aa', '\u26ab',
    '\ud83c\udf08', '\ud83d\udce2', '\ud83d\udd14', '\ud83d\udc51', '\u2694\ufe0f', '\ud83d\udee1\ufe0f',
    '\ud83d\udcbb', '\ud83c\udfa8', '\ud83d\udcf7', '\ud83c\udf7f', '\u26bd', '\ud83c\udfc6'
  ];

  function closeEmojiPickers() {
    document.querySelectorAll('.rr-emoji-picker').forEach(picker => picker.remove());
  }

  function setReactionRoleEmoji(input, emojiValue) {
    input.value = emojiValue;
    input.dispatchEvent(new Event('input'));
    closeEmojiPickers();
  }

  function renderQuickEmojiPicker(input, picker) {
    const fallbackTitle = document.createElement('div');
    fallbackTitle.className = 'rr-emoji-fallback-title';
    fallbackTitle.textContent = 'Quick Picks';
    picker.appendChild(fallbackTitle);

    const fallbackGrid = document.createElement('div');
    fallbackGrid.className = 'rr-emoji-fallback-grid';

    reactionRoleEmojiChoices.forEach(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rr-emoji-choice';
      button.textContent = choice;
      button.addEventListener('click', () => {
        setReactionRoleEmoji(input, choice);
      });
      fallbackGrid.appendChild(button);
    });

    picker.appendChild(fallbackGrid);
  }

  async function openEmojiPicker(input, wrapper) {
    const existing = wrapper.querySelector('.rr-emoji-picker');
    closeEmojiPickers();
    if (existing) return;

    const picker = document.createElement('div');
    picker.className = 'rr-emoji-picker';
    picker.addEventListener('click', (event) => event.stopPropagation());

    wrapper.appendChild(picker);

    const fullPickerLoaded = await fullEmojiPickerModule;
    if (fullPickerLoaded && customElements.get('emoji-picker')) {
      const fullPicker = document.createElement('emoji-picker');
      fullPicker.className = 'rr-full-emoji-picker';
      fullPicker.setAttribute('skin-tone-emoji', '\ud83d\udc4d');
      fullPicker.addEventListener('emoji-click', (event) => {
        const selected = event.detail?.unicode || event.detail?.emoji?.unicode || event.detail?.emoji?.native;
        if (selected) {
          setReactionRoleEmoji(input, selected);
        }
      });
      picker.appendChild(fullPicker);
      return;
    }

    renderQuickEmojiPicker(input, picker);
  }

  function enhanceEmojiInput(input) {
    if (!input || input.dataset.emojiPickerReady === 'true') return;

    const wrapper = document.createElement('div');
    wrapper.className = 'rr-emoji-input-wrap';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.dataset.emojiPickerReady = 'true';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rr-emoji-picker-btn';
    button.textContent = '\ud83d\ude00';
    button.setAttribute('aria-label', 'Select reaction emoji');
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      await openEmojiPicker(input, wrapper);
    });

    wrapper.appendChild(button);
  }

  function addReactionRoleOptionRow() {
    const row = document.createElement('div');
    row.className = 'rr-option-row';
    row.innerHTML = `
      <div class="form-group">
        <label>Reaction Emoji</label>
        <input type="text" class="rr-extra-emoji" placeholder="e.g. emoji or custom emoji" required>
      </div>
      <div class="form-group">
        <label>Role to Assign</label>
        <select class="rr-extra-role" required></select>
      </div>
      <button type="button" class="btn btn-danger rr-remove-option-btn">Remove</button>
    `;

    const roleSelect = row.querySelector('.rr-extra-role');
    populateRoleSelect(roleSelect, guildRoles, '-- Select Role --');
    enhanceEmojiInput(row.querySelector('.rr-extra-emoji'));

    row.querySelector('.rr-remove-option-btn').addEventListener('click', () => {
      row.remove();
    });

    rrExtraOptions.appendChild(row);
  }

  enhanceEmojiInput(rrEmoji);
  rrAddOptionBtn.addEventListener('click', addReactionRoleOptionRow);
  document.addEventListener('click', closeEmojiPickers);

  function collectReactionRoleOptions() {
    const options = [];
    const firstEmoji = rrEmoji.value.trim();
    const firstRoleId = rrRole.value;

    if (firstEmoji || firstRoleId) {
      options.push({ emoji: firstEmoji, roleId: firstRoleId });
    }

    rrExtraOptions.querySelectorAll('.rr-option-row').forEach(row => {
      const emojiInput = row.querySelector('.rr-extra-emoji');
      const roleSelect = row.querySelector('.rr-extra-role');
      options.push({
        emoji: emojiInput.value.trim(),
        roleId: roleSelect.value
      });
    });

    return options;
  }

  // GET guild settings configuration from SQLite DB
  async function loadGuildSettings(guildId) {
    try {
      const response = await fetch(`/api/guilds/${guildId}/settings`);
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      const settings = await response.json();

      // Hydrate General Settings
      guildPrefix.value = settings.prefix || '.';
      twofoursevenEnabled.checked = settings.twoFourSeven.enabled;
      twofoursevenVoice.value = settings.twoFourSeven.voiceId || '';
      twofoursevenText.value = settings.twoFourSeven.textId || '';
      toggleTwoFourSevenChannels();

      // Hydrate Auto Roles
      // Multi-select join roles
      const savedJoinRoles = settings.autoroles || [];
      Array.from(autorolesJoinSelect.options).forEach(opt => {
        opt.selected = savedJoinRoles.includes(opt.value);
      });
      // Voice role
      voicerolesChannelSelect.value = settings.voiceroles.voiceChannelId || '';
      voicerolesRoleSelect.value = settings.voiceroles.roleId || '';

      // Hydrate Welcome Logs & Invites
      invitetrackingEnabled.checked = settings.inviteTracking.enabled;
      invitetrackingChannel.value = settings.inviteTracking.channelId || '';
      toggleInviteTrackingChannel();

      // Hydrate Automod Settings
      automodAntilink.checked = settings.automod.antiLink;
      automodAntiinvite.checked = settings.automod.antiInvite;
      automodAntispam.checked = settings.automod.antiSpam;
      automodAntimention.checked = settings.automod.antiMention;
      automodAnticaps.checked = settings.automod.antiCaps;
      automodAntiemoji.checked = settings.automod.antiEmoji;
      automodAntinsfw.checked = settings.automod.antiNsfw;
      automodMaxmentions.value = settings.automod.maxMentions;
      automodMaxemojis.value = settings.automod.maxEmoji;
      automodLogchannel.value = settings.automod.logChannel || '';

    } catch (err) {
      console.error('Failed to load server settings:', err);
      showToast('Failed to load server configurations!', true);
    }
  }

  // Toggle Visibility helpers
  function toggleTwoFourSevenChannels() {
    if (twofoursevenEnabled.checked) {
      twofoursevenChannelsGroup.style.display = 'flex';
    } else {
      twofoursevenChannelsGroup.style.display = 'none';
    }
  }
  twofoursevenEnabled.addEventListener('change', toggleTwoFourSevenChannels);

  function toggleInviteTrackingChannel() {
    if (invitetrackingEnabled.checked) {
      invitetrackingChannelGroup.style.display = 'flex';
    } else {
      invitetrackingChannelGroup.style.display = 'none';
    }
  }
  invitetrackingEnabled.addEventListener('change', toggleInviteTrackingChannel);

  // Helper: Get multiple select values as array
  function getSelectedOptions(selectElement) {
    return Array.from(selectElement.selectedOptions).map(opt => opt.value);
  }

  // Form AJAX submission handler helper
  async function submitSettings(payload) {
    if (!activeGuildId) return;
    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings to server!', true);
    }
  }

  // Form Submit listener: General Server settings
  guildSettingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitSettings({
      prefix: guildPrefix.value.trim(),
      twoFourSeven: {
        enabled: twofoursevenEnabled.checked,
        voiceId: twofoursevenVoice.value,
        textId: twofoursevenText.value
      }
    });
  });

  // Form Submit listener: Auto Roles settings
  autorolesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitSettings({
      autoroles: getSelectedOptions(autorolesJoinSelect),
      voiceroles: {
        voiceChannelId: voicerolesChannelSelect.value,
        roleId: voicerolesRoleSelect.value
      }
    });
  });

  // Form Submit listener: Welcome Logs settings
  welcomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitSettings({
      inviteTracking: {
        enabled: invitetrackingEnabled.checked,
        channelId: invitetrackingChannel.value
      }
    });
  });

  // Form Submit listener: Automod settings
  automodForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitSettings({
      automod: {
        antiLink: automodAntilink.checked,
        antiInvite: automodAntiinvite.checked,
        antiSpam: automodAntispam.checked,
        antiMention: automodAntimention.checked,
        antiCaps: automodAnticaps.checked,
        antiEmoji: automodAntiemoji.checked,
        antiNsfw: automodAntinsfw.checked,
        maxMentions: parseInt(automodMaxmentions.value) || 5,
        maxEmoji: parseInt(automodMaxemojis.value) || 10,
        logChannel: automodLogchannel.value
      }
    });
  });

  /* GLOBAL PRESENCE LOGIC */
  // Toggle visibility of Stream URL based on Streaming type select
  function toggleStreamUrlField() {
    if (statusType.value === "1") {
      streamUrlGroup.style.display = 'flex';
    } else {
      streamUrlGroup.style.display = 'none';
    }
  }
  statusType.addEventListener('change', toggleStreamUrlField);

  // GET global presence settings
  async function fetchPresenceSettings() {
    try {
      const response = await fetch('/api/activity');
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();
      
      const config = await response.json();
      
      presenceEnabled.checked = config.enabled;
      statusType.value = config.activityType;
      statusState.value = config.status;
      statusText.value = config.activityName;
      streamUrl.value = config.streamUrl || '';

      toggleStreamUrlField();
      updatePreview();
    } catch (err) {
      console.error('Failed to load custom presence settings:', err);
    }
  }

  // Update Live Preview panel
  function updatePreview() {
    previewStatusDot.className = 'discord-status-dot';
    previewStatusDot.classList.add(statusState.value);
    previewPresenceText.innerHTML = '';

    if (!presenceEnabled.checked) {
      const muted = document.createElement('span');
      muted.className = 'presence-muted';
      muted.textContent = 'Rotating bot presence active...';
      previewPresenceText.appendChild(muted);
      return;
    }

    const typeLabels = {
      0: 'Playing',
      1: 'Streaming',
      2: 'Listening to',
      3: 'Watching',
      4: '',
      5: 'Competing in'
    };

    const verb = typeLabels[statusType.value] || '';
    const textVal = statusText.value.trim() || 'Nothing';
    
    if (statusType.value === "4") {
      previewPresenceText.textContent = textVal;
    } else if (statusType.value === "1" && streamUrl.value.trim()) {
      const live = document.createElement('span');
      live.className = 'presence-live';
      live.textContent = 'Live';
      const activity = document.createElement('span');
      activity.textContent = ` ${verb} `;
      const value = document.createElement('span');
      value.className = 'presence-activity-value';
      value.textContent = textVal;
      previewPresenceText.append(live, activity, value);
    } else {
      const activity = document.createElement('span');
      activity.textContent = verb ? `${verb} ` : '';
      const value = document.createElement('span');
      value.className = 'presence-activity-value';
      value.textContent = textVal;
      previewPresenceText.append(activity, value);
    }
  }

  statusText.addEventListener('input', updatePreview);
  statusType.addEventListener('change', updatePreview);
  statusState.addEventListener('change', updatePreview);
  presenceEnabled.addEventListener('change', updatePreview);
  streamUrl.addEventListener('input', updatePreview);

  // Form Submit listener: Global presence save
  presenceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    savePresenceBtn.disabled = true;
    savePresenceBtn.querySelector('span').textContent = 'Saving...';

    const payload = {
      enabled: presenceEnabled.checked,
      activityType: parseInt(statusType.value),
      status: statusState.value,
      activityName: statusText.value,
      streamUrl: streamUrl.value
    };

    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      showToast('Global presence updated!');
      updatePreview();
    } catch (err) {
      console.error('Failed to save presence settings:', err);
      showToast('Failed to save presence config!', true);
    } finally {
      savePresenceBtn.disabled = false;
      savePresenceBtn.querySelector('span').textContent = 'Save Changes';
    }
  });

  // GET Carl-bot settings from DB
  async function loadCarlbotSettings(guildId) {
    try {
      const response = await fetch(`/api/guilds/${guildId}/carlbot-settings`);
      if (response.status === 401) {
        checkAuthentication();
        return;
      }
      if (!response.ok) throw new Error();

      const settings = await response.json();

      // Welcomer Settings
      welcomerEnabled.checked = settings.welcomemessages.enabled;
      welcomerWelcomeChannel.value = settings.welcomemessages.welcomeChannel || '';
      welcomerWelcomeMessage.value = settings.welcomemessages.welcomeMessage || '';
      welcomerGoodbyeChannel.value = settings.welcomemessages.goodbyeChannel || '';
      welcomerGoodbyeMessage.value = settings.welcomemessages.goodbyeMessage || '';
      welcomerDmMessage.value = settings.welcomemessages.dmOnJoinMessage || '';
      welcomerBanMessage.value = settings.welcomemessages.banMessage || '';
      welcomerWarnMessage.value = settings.welcomemessages.warnMessage || '';
      welcomerDmLeaveMessage.value = settings.welcomemessages.dmOnLeaveMessage || '';

      // Logging Settings
      loggingEnabled.checked = settings.logging.enabled;
      loggingMsgDelete.value = settings.logging.messageDeleteChannel || '';
      loggingMsgEdit.value = settings.logging.messageEditChannel || '';
      loggingMemberJoinLeave.value = settings.logging.memberJoinLeaveChannel || '';
      loggingRoleUpdate.value = settings.logging.roleUpdateChannel || '';

      // Render Tags
      renderTagsList(settings.tags);

      // Render Reaction Roles
      renderReactionRolesList(settings.reactionroles);

    } catch (err) {
      console.error('Failed to load Carl-bot settings:', err);
      showToast('Failed to load Carl-bot configuration!', true);
    }
  }

  function renderTagsList(tags) {
    tagsListTableBody.innerHTML = '';
    if (tags.length === 0) {
      tagsListTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); font-style: italic;">No custom tags configured yet.</td>
        </tr>
      `;
      return;
    }

    tags.forEach(tag => {
      let isEmbed = false;
      if (tag.content && tag.content.trim().startsWith('{')) {
        try {
          JSON.parse(tag.content);
          isEmbed = true;
        } catch (e) {}
      }
      const tagContentDisplay = isEmbed 
        ? `<span class="embed-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>Discord Embed</span>` 
        : escapeHtml(tag.content);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${escapeHtml(tag.name)}</td>
        <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tagContentDisplay}</td>
        <td style="text-align: center;">
          <button class="btn btn-danger delete-tag-btn" data-name="${escapeHtml(tag.name)}">Delete</button>
        </td>
      `;
      tagsListTableBody.appendChild(tr);
    });

    // Add delete listeners
    tagsListTableBody.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tagName = btn.getAttribute('data-name');
        deleteTag(tagName);
      });
    });
  }

  function renderReactionRolesList(rrList) {
    rrListTableBody.innerHTML = '';
    if (rrList.length === 0) {
      rrListTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic;">No reaction roles configured yet.</td>
        </tr>
      `;
      return;
    }

    rrList.forEach(rr => {
      const targetChannel = guildTextChannels.find(ch => ch.id === rr.channelId);
      const targetRole = guildRoles.find(r => r.id === rr.roleId);

      const channelName = targetChannel ? `# ${targetChannel.name}` : rr.channelId;
      const roleName = targetRole ? targetRole.name : rr.roleId;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(channelName)}</td>
        <td style="font-family: monospace; font-size: 0.82rem;">${escapeHtml(rr.messageId)}</td>
        <td style="font-size: 1.1rem;">${escapeHtml(rr.emoji)}</td>
        <td><span style="background: rgba(255,255,255,0.05); padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 500;">${escapeHtml(roleName)}</span></td>
        <td style="text-align: center;">
          <button class="btn btn-danger delete-rr-btn" data-msgid="${escapeHtml(rr.messageId)}" data-emoji="${escapeHtml(rr.emoji)}">Delete</button>
        </td>
      `;
      rrListTableBody.appendChild(tr);
    });

    // Add delete listeners
    rrListTableBody.querySelectorAll('.delete-rr-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msgId = btn.getAttribute('data-msgid');
        const emoji = btn.getAttribute('data-emoji');
        deleteReactionRole(msgId, emoji);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // POST custom tag deletion
  async function deleteTag(name) {
    if (!confirm(`Are you sure you want to delete tag "${name}"?`)) return;
    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) throw new Error();
      showToast('Tag deleted successfully!');
      loadCarlbotSettings(activeGuildId);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete tag', true);
    }
  }

  // POST reaction role deletion
  async function deleteReactionRole(messageId, emoji) {
    if (!confirm(`Are you sure you want to delete this reaction role?`)) return;
    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/reactionroles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', messageId, emoji })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) throw new Error();
      showToast('Reaction role deleted!');
      loadCarlbotSettings(activeGuildId);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete reaction role', true);
    }
  }

  // Form submit: Welcomer Settings
  welcomerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeGuildId) return;

    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/welcomemessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeChannel: welcomerWelcomeChannel.value,
          welcomeMessage: welcomerWelcomeMessage.value,
          goodbyeChannel: welcomerGoodbyeChannel.value,
          goodbyeMessage: welcomerGoodbyeMessage.value,
          enabled: welcomerEnabled.checked,
          dmOnJoinMessage: welcomerDmMessage.value,
          dmOnLeaveMessage: welcomerDmLeaveMessage.value,
          banMessage: welcomerBanMessage.value,
          warnMessage: welcomerWarnMessage.value
        })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) throw new Error();
      showToast('Welcomer settings saved!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save Welcomer settings!', true);
    }
  });

  // Form submit: Logging Settings
  loggingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeGuildId) return;

    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/logging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageDeleteChannel: loggingMsgDelete.value,
          messageEditChannel: loggingMsgEdit.value,
          memberJoinLeaveChannel: loggingMemberJoinLeave.value,
          roleUpdateChannel: loggingRoleUpdate.value,
          enabled: loggingEnabled.checked
        })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) throw new Error();
      showToast('Logging settings saved!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save Logging settings!', true);
    }
  });

  // Form submit: Add Tag
  addTagForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeGuildId) return;

    const name = tagNewName.value.trim();
    const content = tagNewContent.value.trim();

    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name,
          content
        })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) throw new Error();
      showToast('Tag created successfully!');
      tagNewName.value = '';
      tagNewContent.value = '';
      loadCarlbotSettings(activeGuildId);
    } catch (err) {
      console.error(err);
      showToast('Failed to add tag!', true);
    }
  });

  // Form submit: Add Reaction Role
  addRrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeGuildId) return;

    const channelId = rrChannel.value;
    const messageId = rrMessageId.value.trim();
    const messageContent = rrMessageContent.value.trim();
    const options = collectReactionRoleOptions();

    if (!messageId && !messageContent) {
      showToast('Add message content/embed or provide an existing Message ID.', true);
      return;
    }

    if (options.length === 0 || options.some(option => !option.emoji || !option.roleId)) {
      showToast('Add an emoji and role for every reaction role option.', true);
      return;
    }

    try {
      const response = await fetch(`/api/guilds/${activeGuildId}/carlbot-settings/reactionroles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          channelId,
          messageId,
          messageContent,
          options
        })
      });
      if (response.status === 401) { checkAuthentication(); return; }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add reaction role');
      }
      showToast('Reaction role created!');
      rrMessageId.value = '';
      rrMessageContent.value = '';
      rrEmoji.value = '';
      rrRole.value = '';
      rrExtraOptions.innerHTML = '';
      loadCarlbotSettings(activeGuildId);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to add reaction role!', true);
    }
  });

  // Polling: Auto Update global stats (every 5 seconds)
  setInterval(() => {
    if (loggedInUser) {
      fetchStats(true);
    }
  }, 5000);

  // --- EMBED BUILDER INTERACTIVE LOGIC ---
  const embedBuilderModal = document.getElementById('embed-builder-modal');
  const closeEmbedBuilderBtn = document.getElementById('close-embed-builder-btn');
  const ebContent = document.getElementById('eb-content');
  const ebColor = document.getElementById('eb-color');
  const ebTimestamp = document.getElementById('eb-timestamp');
  const ebAuthorName = document.getElementById('eb-author-name');
  const ebAuthorIcon = document.getElementById('eb-author-icon');
  const ebAuthorUrl = document.getElementById('eb-author-url');
  const ebTitle = document.getElementById('eb-title');
  const ebUrl = document.getElementById('eb-url');
  const ebDescription = document.getElementById('eb-description');
  const ebThumbnail = document.getElementById('eb-thumbnail');
  const ebImage = document.getElementById('eb-image');
  const ebFooterText = document.getElementById('eb-footer-text');
  const ebFooterIcon = document.getElementById('eb-footer-icon');
  const ebFieldsContainer = document.getElementById('eb-fields-container');
  const ebAddFieldBtn = document.getElementById('eb-add-field-btn');
  const ebApplyBtn = document.getElementById('eb-apply-btn');
  const ebClearBtn = document.getElementById('eb-clear-btn');

  // Preview elements
  const previewPlainText = document.getElementById('preview-plain-text');
  const previewEmbedBox = document.getElementById('preview-embed-box');
  const previewEmbedAuthor = document.getElementById('preview-embed-author');
  const previewEmbedAuthorIcon = document.getElementById('preview-embed-author-icon');
  const previewEmbedAuthorName = document.getElementById('preview-embed-author-name');
  const previewEmbedTitleBlock = document.getElementById('preview-embed-title-block');
  const previewEmbedTitle = document.getElementById('preview-embed-title');
  const previewEmbedDescription = document.getElementById('preview-embed-description');
  const previewEmbedFields = document.getElementById('preview-embed-fields');
  const previewEmbedImage = document.getElementById('preview-embed-image');
  const previewEmbedFooter = document.getElementById('preview-embed-footer');
  const previewEmbedFooterIcon = document.getElementById('preview-embed-footer-icon');
  const previewEmbedFooterText = document.getElementById('preview-embed-footer-text');
  const previewEmbedTimestampDot = document.getElementById('preview-embed-timestamp-dot');
  const previewEmbedTimestamp = document.getElementById('preview-embed-timestamp');
  const previewEmbedThumbnail = document.getElementById('preview-embed-thumbnail');

  let currentTargetTextarea = null;
  let currentEmbedFields = [];

  // Open modal handler
  document.querySelectorAll('.btn-build-embed').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      currentTargetTextarea = document.getElementById(targetId);
      if (!currentTargetTextarea) return;

      // Populate from current textarea value
      const rawVal = currentTargetTextarea.value.trim();
      let parsed = null;
      if (rawVal.startsWith('{')) {
        try {
          parsed = JSON.parse(rawVal);
        } catch (e) {
          // Ignored, not valid JSON
        }
      }

      // Reset controls
      ebContent.value = '';
      ebColor.value = '#8b5cf6';
      ebTimestamp.checked = false;
      ebAuthorName.value = '';
      ebAuthorIcon.value = '';
      ebAuthorUrl.value = '';
      ebTitle.value = '';
      ebUrl.value = '';
      ebDescription.value = '';
      ebThumbnail.value = '';
      ebImage.value = '';
      ebFooterText.value = '';
      ebFooterIcon.value = '';
      currentEmbedFields = [];

      if (parsed) {
        // Hydrate from JSON structure
        if (parsed.content) ebContent.value = parsed.content;
        if (parsed.embeds && parsed.embeds[0]) {
          const embed = parsed.embeds[0];
          if (embed.color !== undefined && embed.color !== null) {
            // Convert decimal color to hex string
            const hex = embed.color.toString(16).padStart(6, '0');
            ebColor.value = `#${hex}`;
          }
          if (embed.timestamp) ebTimestamp.checked = true;
          if (embed.author) {
            if (embed.author.name) ebAuthorName.value = embed.author.name;
            if (embed.author.icon_url) ebAuthorIcon.value = embed.author.icon_url;
            if (embed.author.url) ebAuthorUrl.value = embed.author.url;
          }
          if (embed.title) ebTitle.value = embed.title;
          if (embed.url) ebUrl.value = embed.url;
          if (embed.description) ebDescription.value = embed.description;
          if (embed.thumbnail && embed.thumbnail.url) ebThumbnail.value = embed.thumbnail.url;
          if (embed.image && embed.image.url) ebImage.value = embed.image.url;
          if (embed.footer) {
            if (embed.footer.text) ebFooterText.value = embed.footer.text;
            if (embed.footer.icon_url) ebFooterIcon.value = embed.footer.icon_url;
          }
          if (embed.fields && Array.isArray(embed.fields)) {
            currentEmbedFields = embed.fields.map(f => ({
              name: f.name || '',
              value: f.value || '',
              inline: !!f.inline
            }));
          }
        }
      } else {
        // Plain text fallback
        ebContent.value = rawVal;
      }

      renderFieldsList();
      updateEmbedPreview();
      embedBuilderModal.style.display = 'flex';
    });
  });

  // Close modal handler
  closeEmbedBuilderBtn.addEventListener('click', () => {
    embedBuilderModal.style.display = 'none';
  });

  // Close when clicking overlay
  embedBuilderModal.addEventListener('click', (e) => {
    if (e.target === embedBuilderModal) {
      embedBuilderModal.style.display = 'none';
    }
  });

  // Add field button
  ebAddFieldBtn.addEventListener('click', () => {
    if (currentEmbedFields.length >= 25) {
      alert("Discord embeds support a maximum of 25 fields.");
      return;
    }
    currentEmbedFields.push({ name: '', value: '', inline: false });
    renderFieldsList();
    updateEmbedPreview();
  });

  // Render fields controls list
  function renderFieldsList() {
    ebFieldsContainer.innerHTML = '';
    currentEmbedFields.forEach((field, idx) => {
      const row = document.createElement('div');
      row.className = 'eb-field-row';
      row.innerHTML = `
        <div class="eb-field-row-header">
          <span class="eb-field-row-title">Field #${idx + 1}</span>
          <button type="button" class="btn-remove-field" data-index="${idx}">&times; Remove</button>
        </div>
        <div class="form-row">
          <div class="form-group col-6">
            <label>Field Name</label>
            <input type="text" class="eb-field-name-input" value="${escapeHtml(field.name)}" placeholder="Field Title">
          </div>
          <div class="form-group col-6">
            <label>Field Value</label>
            <input type="text" class="eb-field-value-input" value="${escapeHtml(field.value)}" placeholder="Field content body">
          </div>
        </div>
        <div class="form-group checkbox-group" style="border: none; background: none; padding: 0; margin-top: 0.5rem; flex-direction: row; align-items: center; gap: 0.5rem;">
          <label class="switch" style="width: 38px; height: 22px;">
            <input type="checkbox" class="eb-field-inline-checkbox" ${field.inline ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
          <div class="switch-labels">
            <span class="checkbox-title" style="font-size: 0.8rem;">Inline Field</span>
          </div>
        </div>
      `;

      // Event listeners for inputs inside row
      row.querySelector('.eb-field-name-input').addEventListener('input', (e) => {
        currentEmbedFields[idx].name = e.target.value;
        updateEmbedPreview();
      });
      row.querySelector('.eb-field-value-input').addEventListener('input', (e) => {
        currentEmbedFields[idx].value = e.target.value;
        updateEmbedPreview();
      });
      row.querySelector('.eb-field-inline-checkbox').addEventListener('change', (e) => {
        currentEmbedFields[idx].inline = e.target.checked;
        updateEmbedPreview();
      });
      row.querySelector('.btn-remove-field').addEventListener('click', () => {
        currentEmbedFields.splice(idx, 1);
        renderFieldsList();
        updateEmbedPreview();
      });

      ebFieldsContainer.appendChild(row);
    });
  }

  // Update Preview Panel
  function updateEmbedPreview() {
    const content = ebContent.value;
    const color = ebColor.value;
    const timestamp = ebTimestamp.checked;
    const authorName = ebAuthorName.value.trim();
    const authorIcon = ebAuthorIcon.value.trim();
    const authorUrl = ebAuthorUrl.value.trim();
    const title = ebTitle.value.trim();
    const url = ebUrl.value.trim();
    const description = ebDescription.value.trim();
    const thumbnail = ebThumbnail.value.trim();
    const image = ebImage.value.trim();
    const footerText = ebFooterText.value.trim();
    const footerIcon = ebFooterIcon.value.trim();

    // Plain text content
    if (content) {
      previewPlainText.style.display = 'block';
      previewPlainText.textContent = content;
    } else {
      previewPlainText.style.display = 'none';
    }

    // Embed structure check
    const hasFields = currentEmbedFields.some(f => f.name.trim() || f.value.trim());
    const hasEmbed = authorName || title || description || thumbnail || image || footerText || timestamp || hasFields;

    if (hasEmbed) {
      previewEmbedBox.style.display = 'flex';
      previewEmbedBox.style.borderLeftColor = color;

      // Author
      if (authorName) {
        previewEmbedAuthor.style.display = 'flex';
        previewEmbedAuthorName.textContent = authorName;
        previewEmbedAuthorName.href = authorUrl || '#';
        if (authorIcon) {
          previewEmbedAuthorIcon.style.display = 'block';
          previewEmbedAuthorIcon.src = authorIcon;
        } else {
          previewEmbedAuthorIcon.style.display = 'none';
        }
      } else {
        previewEmbedAuthor.style.display = 'none';
      }

      // Title
      if (title) {
        previewEmbedTitleBlock.style.display = 'block';
        previewEmbedTitle.textContent = title;
        previewEmbedTitle.href = url || '#';
      } else {
        previewEmbedTitleBlock.style.display = 'none';
      }

      // Description
      if (description) {
        previewEmbedDescription.style.display = 'block';
        previewEmbedDescription.textContent = description;
      } else {
        previewEmbedDescription.style.display = 'none';
      }

      // Thumbnail
      if (thumbnail) {
        previewEmbedThumbnail.style.display = 'block';
        previewEmbedThumbnail.src = thumbnail;
      } else {
        previewEmbedThumbnail.style.display = 'none';
      }

      // Image
      if (image) {
        previewEmbedImage.style.display = 'block';
        previewEmbedImage.src = image;
      } else {
        previewEmbedImage.style.display = 'none';
      }

      // Fields
      previewEmbedFields.innerHTML = '';
      const activeFields = currentEmbedFields.filter(f => f.name.trim() || f.value.trim());
      if (activeFields.length > 0) {
        previewEmbedFields.style.display = 'grid';
        activeFields.forEach(f => {
          const fieldEl = document.createElement('div');
          fieldEl.className = 'embed-field';
          if (f.inline) fieldEl.classList.add('inline');
          fieldEl.innerHTML = `
            <div class="embed-field-name">${escapeHtml(f.name || '\u200b')}</div>
            <div class="embed-field-value">${escapeHtml(f.value || '\u200b')}</div>
          `;
          previewEmbedFields.appendChild(fieldEl);
        });
      } else {
        previewEmbedFields.style.display = 'none';
      }

      // Footer
      if (footerText || timestamp) {
        previewEmbedFooter.style.display = 'flex';
        previewEmbedFooterText.textContent = footerText || '';
        if (footerIcon) {
          previewEmbedFooterIcon.style.display = 'block';
          previewEmbedFooterIcon.src = footerIcon;
        } else {
          previewEmbedFooterIcon.style.display = 'none';
        }

        if (timestamp) {
          previewEmbedTimestampDot.style.display = 'inline';
          previewEmbedTimestamp.style.display = 'inline';
          previewEmbedTimestamp.textContent = 'Today at 12:00 PM';
        } else {
          previewEmbedTimestampDot.style.display = 'none';
          previewEmbedTimestamp.style.display = 'none';
        }
      } else {
        previewEmbedFooter.style.display = 'none';
      }

    } else {
      previewEmbedBox.style.display = 'none';
    }
  }

  // Register inputs onchange listeners
  [ebContent, ebColor, ebTimestamp, ebAuthorName, ebAuthorIcon, ebAuthorUrl, ebTitle, ebUrl, ebDescription, ebThumbnail, ebImage, ebFooterText, ebFooterIcon].forEach(input => {
    input.addEventListener('input', updateEmbedPreview);
    input.addEventListener('change', updateEmbedPreview);
  });

  // Apply Embed button
  ebApplyBtn.addEventListener('click', () => {
    if (!currentTargetTextarea) return;

    const contentVal = ebContent.value;
    const colorVal = ebColor.value;
    const timestampVal = ebTimestamp.checked;
    const authorNameVal = ebAuthorName.value.trim();
    const authorIconVal = ebAuthorIcon.value.trim();
    const authorUrlVal = ebAuthorUrl.value.trim();
    const titleVal = ebTitle.value.trim();
    const urlVal = ebUrl.value.trim();
    const descriptionVal = ebDescription.value.trim();
    const thumbnailVal = ebThumbnail.value.trim();
    const imageVal = ebImage.value.trim();
    const footerTextVal = ebFooterText.value.trim();
    const footerIconVal = ebFooterIcon.value.trim();

    const hasFields = currentEmbedFields.some(f => f.name.trim() || f.value.trim());
    const hasEmbedData = authorNameVal || titleVal || descriptionVal || thumbnailVal || imageVal || footerTextVal || timestampVal || hasFields;

    if (hasEmbedData) {
      // Build JSON payload
      const payload = {};
      if (contentVal) payload.content = contentVal;

      const embed = {
        color: parseInt(colorVal.replace('#', ''), 16) || 0
      };

      if (titleVal) embed.title = titleVal;
      if (urlVal) embed.url = urlVal;
      if (descriptionVal) embed.description = descriptionVal;
      if (authorNameVal) {
        embed.author = { name: authorNameVal };
        if (authorIconVal) embed.author.icon_url = authorIconVal;
        if (authorUrlVal) embed.author.url = authorUrlVal;
      }
      if (thumbnailVal) embed.thumbnail = { url: thumbnailVal };
      if (imageVal) embed.image = { url: imageVal };
      if (footerTextVal) {
        embed.footer = { text: footerTextVal };
        if (footerIconVal) embed.footer.icon_url = footerIconVal;
      }
      if (timestampVal) {
        embed.timestamp = true;
      }

      const validFields = currentEmbedFields.filter(f => f.name.trim() && f.value.trim()).map(f => ({
        name: f.name.trim(),
        value: f.value.trim(),
        inline: !!f.inline
      }));

      if (validFields.length > 0) {
        embed.fields = validFields;
      }

      payload.embeds = [embed];
      currentTargetTextarea.value = JSON.stringify(payload, null, 2);
    } else {
      // Plain text fallback
      currentTargetTextarea.value = contentVal;
    }

    // Trigger input event to let form state frameworks know it changed
    currentTargetTextarea.dispatchEvent(new Event('input'));
    embedBuilderModal.style.display = 'none';
  });

  // Clear inputs button
  ebClearBtn.addEventListener('click', () => {
    if (!confirm("Are you sure you want to clear all embed builder fields?")) return;
    ebContent.value = '';
    ebColor.value = '#8b5cf6';
    ebTimestamp.checked = false;
    ebAuthorName.value = '';
    ebAuthorIcon.value = '';
    ebAuthorUrl.value = '';
    ebTitle.value = '';
    ebUrl.value = '';
    ebDescription.value = '';
    ebThumbnail.value = '';
    ebImage.value = '';
    ebFooterText.value = '';
    ebFooterIcon.value = '';
    currentEmbedFields = [];
    renderFieldsList();
    updateEmbedPreview();
  });

  // Manual Refresh Button click listener
  manualRefreshBtn.addEventListener('click', () => {
    fetchStats(false);
    if (activeGuildId) {
      loadGuildData(activeGuildId);
      loadGuildSettings(activeGuildId);
      loadCarlbotSettings(activeGuildId);
    }
  });

  // Populate Guilds in the main dashboard server picker panel
  function renderServerPickerGrid(guilds) {
    const grid = document.getElementById('server-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (guilds.length === 0) {
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId || ''}&permissions=8&scope=bot%20applications.commands`;
      grid.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-secondary); width: 100%;">
          <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">We couldn't find any Discord servers where you have administrative access.</p>
          <a href="${inviteUrl}" target="_blank" class="btn btn-primary" style="max-width: 250px; margin: 0 auto; display: block;">Invite Bot to a Server</a>
        </div>
      `;
      return;
    }

    guilds.forEach(guild => {
      const card = document.createElement('div');
      card.className = `server-card ${guild.botIn ? 'bot-present' : 'bot-absent'}`;
      card.setAttribute('title', guild.botIn ? `Configure ${guild.name}` : `Invite Bot to ${guild.name}`);

      let avatarContent = '';
      if (guild.icon) {
        avatarContent = `<div class="server-card-avatar" style="background-image: url('${guild.icon}')"></div>`;
      } else {
        const initials = guild.name.split(' ').map(w => w.charAt(0)).join('').slice(0, 3);
        avatarContent = `<div class="server-card-avatar">${initials}</div>`;
      }

      card.innerHTML = `
        ${avatarContent}
        <span class="server-card-name">${escapeHtml(guild.name)}</span>
      `;

      card.addEventListener('click', () => {
        if (guild.botIn) {
          selectGuild(guild);
        } else {
          const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;
          window.open(inviteUrl, '_blank');
        }
      });

      grid.appendChild(card);
    });
  }

  // Initial Loadings
  checkAuthentication();
});
