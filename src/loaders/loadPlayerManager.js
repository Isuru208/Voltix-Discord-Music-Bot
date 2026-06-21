const { Kazagumo, KazagumoTrack } = require("kazagumo"); // restart trigger
const { Connectors } = require("shoukaku");
const Spotify = require("kazagumo-spotify");

const searchEngines = {
  DEEZER: "dzsearch",
  SPOTIFY: "spsearch",
  YOUTUBE: "ytsearch",
  JIO_SAAVAN: "jssearch",
  APPLE_MUSIC: "amsearch",
  YOUTUBE_MUSIC: "ytmsearch",
  GAANA: "gnsearch",
  SOUNDCLOUD: "scsearch"
};

const fallbackEngines = ["ytmsearch", "amsearch", "spsearch", "ytsearch"];

const axios = require("axios");

const spotifyCache = new Map();

async function fetchSpotifyMetadata(url) {
  const cached = spotifyCache.get(url);
  if (cached && Date.now() - cached.timestamp < 1800000) { // 30 minutes TTL
    return cached.data;
  }

  try {
    let embedUrl = url.trim();
    if (url.includes("spotify.link")) {
      const res = await axios.head(url, { maxRedirects: 5, timeout: 5000 }).catch(() => null);
      if (res && res.headers.location) {
        embedUrl = res.headers.location;
      }
    }
    
    if (embedUrl.includes("open.spotify.com") && !embedUrl.includes("/embed/")) {
      embedUrl = embedUrl.replace("open.spotify.com/", "open.spotify.com/embed/");
    }

    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      timeout: 8000
    });

    const html = response.data;
    const jsonMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([^<]+)<\/script>/i);

    let result = null;
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[1]);
      const pageProps = jsonData.props?.pageProps;
      if (pageProps && pageProps.state && pageProps.state.data && pageProps.state.data.entity) {
        const entity = pageProps.state.data.entity;
        if (entity.type === "track") {
          result = {
            type: "track",
            title: entity.name || entity.title,
            artist: entity.artists && entity.artists.length > 0 ? entity.artists.map(a => a.name).join(", ") : "Unknown Artist",
            thumbnail: entity.visualIdentity?.image && entity.visualIdentity.image.length > 0 ? entity.visualIdentity.image[0].url : null,
            duration: entity.duration || 0,
            uri: url
          };
        } else if (entity.type === "album" || entity.type === "playlist") {
          const imgObj = entity.visualIdentity?.image || [];
          const coverUrl = imgObj.length > 0 ? (imgObj.find(img => img.maxWidth === 640)?.url || imgObj[imgObj.length - 1]?.url) : null;

          const tracks = (entity.trackList || []).map(t => ({
            title: t.title,
            artist: t.subtitle || "Unknown Artist",
            duration: t.duration || 0,
            uri: t.uri ? `https://open.spotify.com/track/${t.uri.split(":").pop()}` : null,
            thumbnail: coverUrl
          }));
          result = {
            type: entity.type,
            name: entity.name || entity.title,
            tracks,
            thumbnail: coverUrl
          };
        }
      }
    }

    if (result) {
      spotifyCache.set(url, { timestamp: Date.now(), data: result });
      // Keep cache size bounded to 200 items to prevent memory growth
      if (spotifyCache.size > 200) {
        const firstKey = spotifyCache.keys().next().value;
        spotifyCache.delete(firstKey);
      }
    }

    return result;
  } catch (error) {
    console.error("[SpotifyScraper] Failed to fetch Spotify metadata:", error.message);
    return null;
  }
}

async function resolveWithTimeout(node, query, timeoutMs = 8000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Lavalink resolve timeout')), timeoutMs);
  });
  
  try {
    const result = await Promise.race([
      node.rest.resolve(query),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[LavalinkResolve] Timeout or error resolving "${query}":`, err.message || err);
    return null;
  }
}

module.exports = function loadPlayerManager(client) {
  const manager = new Kazagumo(
    {
      defaultSearchEngine: client.config.node_source || "ytmsearch",
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
      plugins: client.config.SpotifyID ? [
        new Spotify({
          clientId: client.config.SpotifyID,
          clientSecret: client.config.SpotifySecret,
          playlistPageLimit: 1,
          albumPageLimit: 1,
          searchLimit: 10,
          searchMarket: 'IN',
        }),
      ] : [],
      trackResolver: async function (options) {
        if (this.sourceName === 'spotify' && !this.track) {
          const node = options?.player?.shoukaku?.node || [...this.kazagumo.shoukaku.nodes.values()].find(n => n.state === 1) || [...this.kazagumo.shoukaku.nodes.values()][0];
          if (node) {
            const query = `${this.author} - ${this.title}`;
            console.log(`[SpotifyResolver] Resolving unresolved track: "${query}" using ytmsearch...`);
            const searchResult = await resolveWithTimeout(node, `ytmsearch:${query}`).catch(() => null);
            if (searchResult && searchResult.data && searchResult.data.length > 0) {
              const youtubeTrack = searchResult.data[0];
              this.track = youtubeTrack.encoded;
              this.realUri = youtubeTrack.info.uri;
              if (youtubeTrack.info.length) this.length = youtubeTrack.info.length;
              console.log(`[SpotifyResolver] Successfully resolved "${query}" via ytmsearch`);
              return true;
            }
            console.log(`[SpotifyResolver] Fallback to ytsearch for unresolved track: "${query}"...`);
            const ytSearchResult = await resolveWithTimeout(node, `ytsearch:${query}`).catch(() => null);
            if (ytSearchResult && ytSearchResult.data && ytSearchResult.data.length > 0) {
              const youtubeTrack = ytSearchResult.data[0];
              this.track = youtubeTrack.encoded;
              this.realUri = youtubeTrack.info.uri;
              if (youtubeTrack.info.length) this.length = youtubeTrack.info.length;
              console.log(`[SpotifyResolver] Successfully resolved "${query}" via ytsearch`);
              return true;
            }
            console.warn(`[SpotifyResolver] Failed to resolve "${query}" via both ytmsearch and ytsearch`);
          }
        }
        return false;
      },
    },
    new Connectors.DiscordJS(client),
    client.config.nodes,
    client.config.node_options
  );

  manager.searchEngines = searchEngines;

  const originalSearch = manager.search.bind(manager);

  manager.search = async function (query, options = {}) {
    const node = [...this.shoukaku.nodes.values()].find(n => n.state === 1) || [...this.shoukaku.nodes.values()][0];
    if (!node) return { type: "SEARCH", tracks: [] };

    let cleanQuery = query.trim().replace(/[<>]/g, '');

    const ytIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = cleanQuery.match(ytIdRegex);
    const videoId = ytMatch ? ytMatch[1] : null;

    if (videoId) {
      cleanQuery = `https://www.youtube.com/watch?v=${videoId}`;
    }

    const isUrl = /^https?:\/\//.test(cleanQuery);
    const isYouTube = cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be') || cleanQuery.includes('music.youtube.com');

    if (isYouTube) {
      const strategies = videoId
        ? [cleanQuery, `ytsearch:${videoId}`, `ytmsearch:${videoId}`]
        : [cleanQuery, `ytsearch:${cleanQuery}`, `ytmsearch:${cleanQuery}`];

      for (const q of strategies) {
        const res = await resolveWithTimeout(node, q).catch(() => null);
        if (res && res.loadType !== 'EMPTY' && res.loadType !== 'ERROR' && res.loadType !== 'NO_MATCHES') {
          const result = processSearchResult(res, options.requester);
          if (result.tracks.length > 0) return result;
        }
      }
    }

    const isSpotify = cleanQuery.includes('spotify.com') || cleanQuery.includes('spotify.link') || cleanQuery.startsWith('spotify:');
    if (isSpotify) {
      const meta = await fetchSpotifyMetadata(cleanQuery);
      if (meta) {
        const requester = options.requester;
        if (meta.type === "track") {
          const track = new KazagumoTrack({
            encoded: '',
            pluginInfo: {
              name: 'custom-spotify-resolver',
            },
            info: {
              sourceName: 'spotify',
              identifier: cleanQuery.split("/").pop().split("?")[0],
              isSeekable: true,
              author: meta.artist,
              length: meta.duration,
              isStream: false,
              position: 0,
              title: meta.title,
              uri: meta.uri,
              artworkUrl: meta.thumbnail,
            }
          }, requester);
          return { type: 'TRACK', tracks: [track] };
        } else if (meta.type === "album" || meta.type === "playlist") {
          const trackObjects = meta.tracks.map(t => new KazagumoTrack({
            encoded: '',
            pluginInfo: {
              name: 'custom-spotify-resolver',
            },
            info: {
              sourceName: 'spotify',
              identifier: t.uri ? t.uri.split("/").pop().split("?")[0] : 'unknown',
              isSeekable: true,
              author: t.artist,
              length: t.duration,
              isStream: false,
              position: 0,
              title: t.title,
              uri: t.uri || cleanQuery,
              artworkUrl: t.thumbnail,
            }
          }, requester));
          return {
            type: 'PLAYLIST',
            playlistName: meta.name || `${meta.type === 'album' ? 'Spotify Album' : 'Spotify Playlist'}`,
            tracks: trackObjects
          };
        }
      } else {
        console.warn(`[SpotifyScraper] Scraper failed for query: "${cleanQuery}". Returning empty results to avoid hanging.`);
        return { type: 'SEARCH', tracks: [] };
      }
    }

    if (!isUrl) {
      let searchEngineList = [options.engine || this.defaultSearchEngine];
      if (!options.engine) {
        searchEngineList = [...new Set([...searchEngineList, ...fallbackEngines])];
      }

      for (const engine of searchEngineList) {
        if (!engine) continue;
        const searchQuery = engine.includes(':') ? cleanQuery : `${engine}:${cleanQuery}`;
        const searchRes = await resolveWithTimeout(node, searchQuery).catch(() => null);
        if (searchRes && searchRes.loadType !== 'EMPTY' && searchRes.loadType !== 'ERROR' && searchRes.loadType !== 'NO_MATCHES') {
          return processSearchResult(searchRes, options.requester);
        }
      }
    }

    return originalSearch(cleanQuery, options);
  };


  function processSearchResult(res, requester) {
    if (!res) return { type: "SEARCH", tracks: [] };
    const loadType = res.loadType?.toUpperCase() || '';

    try {
      if (loadType.includes('TRACK')) {
        const trackData = res.data || (res.tracks ? res.tracks[0] : null);
        if (!trackData) return { type: "SEARCH", tracks: [] };
        return { type: "TRACK", tracks: [new KazagumoTrack(trackData, requester)] };
      }

      if (loadType.includes('PLAYLIST')) {
        const playlistData = res.data || res;
        const tracks = playlistData.tracks || res.tracks || [];
        const name = playlistData.info?.name || res.playlistInfo?.name || "Unknown Playlist";
        return {
          type: "PLAYLIST",
          playlistName: name,
          tracks: (Array.isArray(tracks) ? tracks : []).map((track) => new KazagumoTrack(track, requester))
        };
      }

      if (loadType.includes('SEARCH') || Array.isArray(res.data) || Array.isArray(res.tracks)) {
        let tracks = [];
        if (Array.isArray(res.data)) tracks = res.data;
        else if (res.data?.tracks) tracks = res.data.tracks;
        else if (Array.isArray(res.tracks)) tracks = res.tracks;

        return {
          type: "SEARCH",
          tracks: tracks.map((track) => new KazagumoTrack(track, requester))
        };
      }
    } catch (e) {
      console.error("[Music] Result processing error:", e);
    }
    return { type: "SEARCH", tracks: [] };
  }

  manager.on("nodeConnect", (node) => console.log(`[Lavalink] Node "${node.name}" connected.`));
  manager.on("nodeError", (node, error) => console.log(`[Lavalink] Node "${node.name}" error: ${error.message}`));
  manager.on("nodeDisconnect", (node, reason) => console.log(`[Lavalink] Node "${node.name}" disconnected. Reason: ${reason || 'Unknown'}`));

  manager.on("error", (error) => {
    if (error.message?.includes("Connection exist but player not found")) return;
    console.error(`[Kazagumo] Error:`, error);
  });

  manager.shoukaku.on("ready", (name) => console.log(`[Lavalink-Core] ${name} is READY.`));
  manager.shoukaku.on("error", (name, error) => console.log(`[Lavalink-Core] ${name} ERROR: ${error}`));
  manager.shoukaku.on("close", (name, code, reason) => console.log(`[Lavalink-Core] ${name} CLOSED (Code: ${code}, Reason: ${reason})`));

  const originalCreatePlayer = manager.createPlayer.bind(manager);

  manager.createPlayer = async function (options) {
    try {
      return await originalCreatePlayer(options);
    } catch (error) {
      const isSessionError = error.status === 404 && error.message && error.message.includes('Session not found');
      if (isSessionError) {
        console.warn(`[Kazagumo Wrapper] Session not found error caught during createPlayer. Attempting to fix stale sessions...`);
        
        const nodes = [...this.shoukaku.nodes.values()];
        let reconnectedAny = false;
        
        for (const node of nodes) {
          if (node.state === 1) { // CONNECTED
            let isStale = false;
            try {
              await node.rest.getPlayers();
            } catch (nodeError) {
              if (nodeError.status === 404 && nodeError.message && nodeError.message.includes('Session not found')) {
                isStale = true;
              }
            }
            
            if (isStale) {
              console.log(`[Kazagumo Wrapper] Node "${node.name}" has a stale session. Reconnecting...`);
              node.sessionId = null;
              node.disconnect();
              await new Promise((resolve) => {
                node.once("ready", resolve);
                setTimeout(resolve, 8000);
              });
              reconnectedAny = true;
            }
          }
        }
        
        if (reconnectedAny) {
          console.log(`[Kazagumo Wrapper] Reconnected stale nodes. Retrying createPlayer...`);
          try {
            return await originalCreatePlayer(options);
          } catch (retryError) {
            console.error(`[Kazagumo Wrapper] Retry after session fix failed:`, retryError);
            throw retryError;
          }
        }
      }
      throw error;
    }
  };

  client.manager = manager;
  return manager;
};
