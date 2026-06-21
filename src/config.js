const path = require('path');

const jsonConfig = path.join(__dirname, 'config.json');

let config = {};
try {
  config = require(jsonConfig);
} catch (err) {
  // If config.json doesn't exist or is invalid, we proceed with an empty object
  config = {};
}

// Override or set from environment variables if present
config.token = process.env.DISCORD_TOKEN || config.token;
config.clientSecret = process.env.CLIENT_SECRET || config.clientSecret;
config.redirectUri = process.env.REDIRECT_URI || config.redirectUri;
config.prefix = process.env.PREFIX || config.prefix || ".";

if (process.env.OWNER_IDS) {
  config.ownerID = process.env.OWNER_IDS.split(",").map(id => id.trim());
} else if (!config.ownerID) {
  config.ownerID = [];
}

config.SpotifyID = process.env.SPOTIFY_CLIENT_ID || config.SpotifyID;
config.SpotifySecret = process.env.SPOTIFY_CLIENT_SECRET || config.SpotifySecret;
config.LastFmKey = process.env.LASTFM_API_KEY || config.LastFmKey;
config.LastFmSecret = process.env.LASTFM_API_SECRET || config.LastFmSecret;
config.dashboardPort = process.env.PORT || config.dashboardPort || 3000;

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}

config.parseBoolean = parseBoolean;

module.exports = config;

