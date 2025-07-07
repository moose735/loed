// src/config.js

// Removed: GOOGLE_SHEET_POWER_RANKINGS_API_URL and HISTORICAL_MATCHUPS_API_URL
// All data will now be fetched directly from Sleeper API.

// The year your league started. Used for fetching historical data from Sleeper.
// IMPORTANT: Adjust this to your league's actual first season year.
export const LEAGUE_START_YEAR = 2021;

// Custom team name mappings (Optional: for use if you want to map names from historical matchups to custom display names)
// This map is primarily used in sleeperApi.js to override Sleeper's default user display names
// with your custom team names. It's kept here for configuration clarity but its usage is
// centralized in sleeperApi.js and App.js.
export const NICKNAME_TO_SLEEPER_USER = {
  // This map is now primarily managed within sleeperApi.js's TEAM_NAME_TO_SLEEPER_ID_MAP
  // and the getMappedTeamName function in App.js.
  // You can still define specific overrides here if needed, but the primary mapping
  // should be in sleeperApi.js for consistency with Sleeper user IDs.
};
