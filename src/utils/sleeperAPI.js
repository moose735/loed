// src/utils/sleeperApi.js

// Easily configurable current league ID
export const CURRENT_LEAGUE_ID = '1181984921049018368'; // This is the CURRENT league ID for the 2025 season

// Centralized map linking your internal team names (e.g., last names) to Sleeper User IDs.
// YOU MUST POPULATE THIS MAP WITH ALL YOUR TEAM NAMES AND THEIR CORRESPONDING SLEEPER USER IDs.
export const TEAM_NAME_TO_SLEEPER_ID_MAP = {
  'Ainsworth': '783790952367169536',
  'Bjarnar': '783761299275382784',
  'Blumbergs': '783789717920534528',
  'Boilard': '783789669597999104',
  'Dembski': '783767734491127808',
  'Irwin': '467074573125283840',
  'Meer': '783778036578418688',
  'Neufeglise': '783763304463147008',
  'O\'Donoghue': '783758716272009216',
  'ODonoghue': '783758716272009216', // Added alias for "ODonoghue"
  'Randall': '783754997035876352',
  'Schmitt': '783761892693905408',
  'Tomczak': '787044291066380288'
};

// If you have managers who have left the league but you want to reference them, add their Sleeper User IDs here.
// This set should contain user_ids, not display names.
export const RETIRED_MANAGERS = new Set([
  // Example: '783790952367169536', // User ID of a retired manager
]);

const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';

// Caches for API data to minimize redundant fetches and improve performance
const leagueDetailsCache = new Map();
const usersCache = new Map();
const rostersCache = new Map();
const matchupsCache = new Map();
const playersCache = new Map();
const transactionsCache = new Map();
const draftsCache = new Map();
const leagueHistoryCache = new Map(); // Cache for league history lineage

const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes for cache expiration

// Helper to get cached data, checking for expiration
const getCachedData = (cache, key) => {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS)) {
    console.log(`Returning data for key "${key}" from cache.`);
    return cached.data;
  }
  return null;
};

// Helper to set data in cache with a timestamp
const setCachedData = (cache, key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Fetches league details for a given league ID.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Object>} A promise that resolves to the league details object.
 */
export async function fetchLeagueDetails(leagueId) {
  const cached = getCachedData(leagueDetailsCache, leagueId);
  if (cached) return cached;

  try {
    console.log(`Fetching league details for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}`);
    if (!response.ok) {
      console.error(`Error fetching league details for league ID ${leagueId}: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    setCachedData(leagueDetailsCache, leagueId, data);
    console.log(`Successfully fetched league details for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch league details for league ID ${leagueId}:`, error);
    return null;
  }
}

/**
 * Fetches historical league IDs for a given league lineage (past seasons).
 * @param {string} leagueId The ID of the Sleeper league (current or past).
 * @returns {Promise<Array<string>>} A promise that resolves to an array of historical league IDs.
 */
export async function fetchLeagueHistory(leagueId) {
  const cached = getCachedData(leagueHistoryCache, leagueId);
  if (cached) return cached;

  try {
    console.log(`Fetching league history for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/history`);
    if (!response.ok) {
      console.error(`Error fetching league history for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    const historicalLeagueIds = data.map(league => league.league_id);
    setCachedData(leagueHistoryCache, leagueId, historicalLeagueIds);
    console.log(`Successfully fetched league history for league ID: ${leagueId}.`);
    return historicalLeagueIds;
  } catch (error) {
    console.error(`Failed to fetch league history for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Fetches users data for a given league ID.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of user objects.
 */
export async function fetchUsersData(leagueId) {
  const cacheKey = `users-${leagueId}`;
  const cached = getCachedData(usersCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching users for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/users`);
    if (!response.ok) {
      console.error(`Error fetching users for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(usersCache, cacheKey, data);
    console.log(`Successfully fetched users for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch users for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Fetches rosters data for a given league ID.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of roster objects.
 */
export async function fetchRostersData(leagueId) {
  const cacheKey = `rosters-${leagueId}`;
  const cached = getCachedData(rostersCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching rosters for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/rosters`);
    if (!response.ok) {
      console.error(`Error fetching rosters for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(rostersCache, cacheKey, data);
    console.log(`Successfully fetched rosters for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch rosters for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Fetches NFL players data.
 * @returns {Promise<Object>} A promise that resolves to an object of NFL players.
 */
export async function fetchNFLPlayers() {
  const cacheKey = 'nflPlayers';
  const cached = getCachedData(playersCache, cacheKey);
  if (cached) return cached;

  try {
    console.log("Fetching NFL players data...");
    const response = await fetch(`${SLEEPER_API_BASE_URL}/players/nfl`);
    if (!response.ok) {
      console.error(`Error fetching NFL players: ${response.statusText}`);
      return {};
    }
    const data = await response.json();
    setCachedData(playersCache, cacheKey, data);
    console.log("Successfully fetched NFL players data.");
    return data;
  } catch (error) {
    console.error("Failed to fetch NFL players data:", error);
    return {};
  }
}

/**
 * Fetches matchup data for a given week and league ID.
 * @param {string} leagueId The ID of the Sleeper league.
 * @param {number} week The week number.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of matchup objects.
 */
export async function fetchMatchupsForWeek(leagueId, week) {
  const cacheKey = `matchups-${leagueId}-${week}`;
  const cached = getCachedData(matchupsCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching matchups for league ID: ${leagueId}, week: ${week}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/matchups/${week}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`No matchups found for league ID ${leagueId}, week ${week}. (Likely end of season or pre-season)`);
        return [];
      }
      console.error(`Error fetching matchups for league ID ${leagueId}, week ${week}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(matchupsCache, cacheKey, data);
    console.log(`Successfully fetched matchups for league ID: ${leagueId}, week: ${week}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch matchups for league ID ${leagueId}, week ${week}:`, error);
    return [];
  }
}

/**
 * Fetches transactions for a given week in a league.
 * @param {string} leagueId The ID of the Sleeper league.
 * @param {number} week The week number.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of transaction objects.
 */
export async function fetchTransactionsForWeek(leagueId, week) {
  const cacheKey = `transactions-${leagueId}-${week}`;
  const cached = getCachedData(transactionsCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching transactions for league ID: ${leagueId}, week: ${week}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/transactions/${week}`);
    if (!response.ok) {
      console.error(`Error fetching transactions for league ID ${leagueId}, week ${week}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(transactionsCache, cacheKey, data);
    console.log(`Successfully fetched transactions for league ID: ${leagueId}, week: ${week}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch transactions for league ID ${leagueId}, week ${week}:`, error);
    return [];
  }
}

/**
 * Fetches league drafts for a given league ID.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of draft objects.
 */
export async function fetchLeagueDrafts(leagueId) {
  const cacheKey = `drafts-${leagueId}`;
  const cached = getCachedData(draftsCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching drafts for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/drafts`);
    if (!response.ok) {
      console.error(`Error fetching drafts for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(draftsCache, cacheKey, data);
    console.log(`Successfully fetched drafts for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch drafts for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Helper to get the Sleeper player headshot URL.
 * @param {string} playerId The Sleeper player ID.
 * @returns {string} The URL to the player's headshot.
 */
export function getSleeperPlayerHeadshotUrl(playerId) {
  if (!playerId) {
    return 'https://sleeper.app/img/content/default_avatar.jpg'; // Default avatar if no player ID
  }
  return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
}

/**
 * Helper to get the Sleeper user avatar URL.
 * @param {string} avatarId The Sleeper avatar ID from user object.
 * @returns {string} The URL to the user's avatar.
 */
export function getSleeperAvatarUrl(avatarId) {
  if (!avatarId) {
    return 'https://sleeper.app/img/content/default_avatar.jpg'; // Default avatar if no avatarId
  }
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
}

/**
 * Fetches all historical matchups for a given league lineage from Sleeper API.
 * Transforms data into a consistent format for the application.
 * @param {string} currentLeagueId The current season's league ID.
 * @param {number} leagueStartYear The year the league started.
 * @returns {Promise<Array<Object>>} An array of historical matchup objects.
 */
export async function fetchHistoricalMatchups(currentLeagueId, leagueStartYear) {
  const allHistoricalMatchups = [];
  const processedLeagueIds = new Set();

  try {
    // Get historical league IDs for this league lineage
    // Sleeper's /history endpoint gives previous seasons. We need to include the current one too.
    const historicalLeagueIdsResponse = await fetchLeagueHistory(currentLeagueId);
    const allRelevantLeagueIds = [...new Set([currentLeagueId, ...historicalLeagueIdsResponse])];

    // Fetch details for all relevant leagues to sort them by season
    const leagueDetailsPromises = allRelevantLeagueIds.map(id => fetchLeagueDetails(id));
    const allLeagueDetails = (await Promise.all(leagueDetailsPromises)).filter(Boolean); // Filter out nulls

    // Sort leagues by season year in ascending order
    const sortedLeagueDetails = allLeagueDetails.sort((a, b) => a.season - b.season);

    console.log("All relevant league IDs for historical data (sorted):", sortedLeagueDetails.map(l => `${l.season} (${l.league_id})`));

    for (const leagueDetails of sortedLeagueDetails) {
      const leagueId = leagueDetails.league_id;
      if (processedLeagueIds.has(leagueId)) {
        continue;
      }
      processedLeagueIds.add(leagueId);

      console.log(`Processing historical data for league ID: ${leagueId} (Season: ${leagueDetails.season})`);

      const season = parseInt(leagueDetails.season);
      // Sleeper's playoff_week_start is the first week of playoffs.
      // last_regular_season_week might be present too.
      const lastRegularSeasonWeek = leagueDetails.settings?.playoff_week_start ? leagueDetails.settings.playoff_week_start - 1 : leagueDetails.settings?.last_regular_season_week || 14;
      const playoffStartWeek = leagueDetails.settings?.playoff_week_start || (lastRegularSeasonWeek + 1);


      // Fetch users and rosters for this specific season/league ID
      const users = await fetchUsersData(leagueId);
      const rosters = await fetchRostersData(leagueId); // Using fetchRostersData directly

      const userIdToDisplayName = new Map();
      users.forEach(user => {
        // Prioritize custom name from TEAM_NAME_TO_SLEEPER_ID_MAP
        const customNameEntry = Object.entries(TEAM_NAME_TO_SLEEPER_ID_MAP).find(([, id]) => id === user.user_id);
        if (customNameEntry) {
            userIdToDisplayName.set(user.user_id, customNameEntry[0]);
        } else if (user.metadata?.team_name) {
            userIdToDisplayName.set(user.user_id, user.metadata.team_name);
        } else if (user.display_name) {
            userIdToDisplayName.set(user.user_id, user.display_name);
        } else if (user.first_name) {
            userIdToDisplayName.set(user.user_id, user.first_name);
        } else {
            userIdToDisplayName.set(user.user_id, `User ${user.user_id}`);
        }
      });

      // Map roster_id to user_id
      const rosterIdToUserId = new Map(rosters.map(r => [r.roster_id, r.owner_id]));

      // Fetch matchups for regular season
      // Iterate up to a reasonable max week (e.g., 17 for NFL regular season)
      // or until fetchMatchupsForWeek returns empty array (404)
      for (let week = 1; week <= lastRegularSeasonWeek; week++) {
        const matchups = await fetchMatchupsForWeek(leagueId, week);

        // Group matchups by matchup_id to get head-to-head pairs
        const groupedMatchups = {};
        matchups.forEach(m => {
          if (!groupedMatchups[m.matchup_id]) {
            groupedMatchups[m.matchup_id] = [];
          }
          groupedMatchups[m.matchup_id].push(m);
        });

        for (const matchupId in groupedMatchups) {
          const game = groupedMatchups[matchupId];
          if (game.length === 2) { // Ensure it's a valid head-to-head matchup
            const team1Data = game[0];
            const team2Data = game[1];

            const team1UserId = rosterIdToUserId.get(team1Data.roster_id);
            const team2UserId = rosterIdToUserId.get(team2Data.roster_id);

            if (team1UserId && team2UserId) {
              allHistoricalMatchups.push({
                year: season,
                week: week,
                team1: userIdToDisplayName.get(team1UserId) || `Unknown Team (${team1Data.roster_id})`,
                team2: userIdToDisplayName.get(team2UserId) || `Unknown Team (${team2Data.roster_id})`,
                team1Score: team1Data.points,
                team2Score: team2Data.points,
                playoffs: false, // Regular season games
                finalSeedingGame: null, // Sleeper API doesn't directly provide this for regular season
                team1RosterId: team1Data.roster_id,
                team2RosterId: team2Data.roster_id,
                team1UserId: team1UserId,
                team2UserId: team2UserId,
              });
            } else {
                console.warn(`Skipping matchup for league ${leagueId}, week ${week}, matchup ${matchupId}: Could not find user IDs for roster IDs. Team1 Roster: ${team1Data.roster_id}, Team2 Roster: ${team2Data.roster_id}`);
            }
          }
        }
      }

      // Fetch matchups for playoff weeks
      // Iterate from playoffStartWeek up to a reasonable max (e.g., playoffStartWeek + 4)
      for (let week = playoffStartWeek; week <= playoffStartWeek + 4; week++) {
        const matchups = await fetchMatchupsForWeek(leagueId, week);
        if (matchups.length === 0) {
          break; // No more playoff matchups for this season
        }

        const groupedMatchups = {};
        matchups.forEach(m => {
          if (!groupedMatchups[m.matchup_id]) {
            groupedMatchups[m.matchup_id] = [];
          }
          groupedMatchups[m.matchup_id].push(m);
        });

        for (const matchupId in groupedMatchups) {
          const game = groupedMatchups[matchupId];
          if (game.length === 2) {
            const team1Data = game[0];
            const team2Data = game[1];

            const team1UserId = rosterIdToUserId.get(team1Data.roster_id);
            const team2UserId = rosterIdToUserId.get(team2Data.roster_id);

            if (team1UserId && team2UserId) {
                allHistoricalMatchups.push({
                    year: season,
                    week: week,
                    team1: userIdToDisplayName.get(team1UserId) || `Unknown Team (${team1Data.roster_id})`,
                    team2: userIdToDisplayName.get(team2UserId) || `Unknown Team (${team2Data.roster_id})`,
                    team1Score: team1Data.points,
                    team2Score: team2Data.points,
                    playoffs: true, // Mark as playoff game
                    finalSeedingGame: null, // Still setting to null for simplicity. Deriving this from Sleeper brackets is complex.
                    team1RosterId: team1Data.roster_id,
                    team2RosterId: team2Data.roster_id,
                    team1UserId: team1UserId,
                    team2UserId: team2UserId,
                });
            } else {
                console.warn(`Skipping playoff matchup for league ${leagueId}, week ${week}, matchup ${matchupId}: Could not find user IDs for roster IDs.`);
            }
          }
        }
      }
    }

    console.log("Finished fetching all historical matchups from Sleeper.", allHistoricalMatchups);
    return allHistoricalMatchups;

  } catch (error) {
    console.error("Error fetching historical matchups from Sleeper:", error);
    return [];
  }
}

/**
 * Fetches the winners bracket data for a given league ID.
 * Data is cached in memory for subsequent calls within the same session.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of bracket matchup objects, or an empty array if an error occurs.
 */
export async function fetchWinnersBracket(leagueId) {
  const cacheKey = `winnersBracket-${leagueId}`;
  const cached = getCachedData(winnersBracketCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching winners bracket for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/winners_bracket`);
    if (!response.ok) {
      console.error(`Error fetching winners bracket for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(winnersBracketCache, cacheKey, data);
    console.log(`Successfully fetched winners bracket for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch winners bracket for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Fetches the losers bracket data for a given league ID.
 * Data is cached in memory for subsequent calls within the same session.
 * @param {string} leagueId The ID of the Sleeper league.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of bracket matchup objects, or an empty array if an error occurs.
 */
export async function fetchLosersBracket(leagueId) {
  const cacheKey = `losersBracket-${leagueId}`;
  const cached = getCachedData(losersBracketCache, cacheKey);
  if (cached) return cached;

  try {
    console.log(`Fetching losers bracket for league ID: ${leagueId}...`);
    const response = await fetch(`${SLEEPER_API_BASE_URL}/league/${leagueId}/losers_bracket`);
    if (!response.ok) {
      console.error(`Error fetching losers bracket for league ID ${leagueId}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    setCachedData(losersBracketCache, cacheKey, data);
    console.log(`Successfully fetched losers bracket for league ID: ${leagueId}.`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch losers bracket for league ID ${leagueId}:`, error);
    return [];
  }
}
