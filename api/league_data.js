// api/league_data.js
// This file will be deployed as a Vercel Serverless Function.

// >>> IMPORTANT: Configure your league details here <<<
const HARDCODED_LEAGUE_ID = '1181984921049018368'; // Replace with your current league ID
// HARDCODED_END_YEAR is now determined dynamically from the API

// Helper function to fetch data from Sleeper API
async function fetchSleeperApi(url) {
    const response = await fetch(url);
    if (!response.ok) {
        let errorMsg = `Failed to fetch data from Sleeper API: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.msg || errorMsg;
        } catch (e) {
            // Ignore if response body is not JSON
        }
        throw new Error(errorMsg);
    }
    return response.json();
}

/**
 * Vercel Serverless Function entry point.
 * Handles requests to /api/league_data.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const leagueHistory = [];
    let currentProcessingLeagueId = HARDCODED_LEAGUE_ID; // Start with the hardcoded latest league ID
    const fetchedLeagueIds = new Set(); // Keep track of league IDs already processed to prevent infinite loops
    let endYearDetermined = false;
    let end; // This will store the dynamically determined end year

    try {
        // First, fetch the initial league to determine the current season (end year)
        let initialLeague;
        try {
            initialLeague = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${HARDCODED_LEAGUE_ID}`);
            end = parseInt(initialLeague.season); // Dynamically set the end year
            endYearDetermined = true;
        } catch (err) {
            console.error(`Could not fetch initial league ${HARDCODED_LEAGUE_ID} to determine end year: ${err.message}`);
            return res.status(500).json({ error: `Could not determine the latest season for your league. Please check if the League ID (${HARDCODED_LEAGUE_ID}) is valid: ${err.message}` });
        }

        // Loop backward through the league history using 'previous_league_id'
        while (currentProcessingLeagueId && !fetchedLeagueIds.has(currentProcessingLeagueId)) {
            fetchedLeagueIds.add(currentProcessingLeagueId); // Add the current league ID to the set

            let league;
            // If it's the initial league, we already fetched it. Otherwise, fetch it.
            if (currentProcessingLeagueId === HARDCODED_LEAGUE_ID && initialLeague) {
                league = initialLeague;
            } else {
                try {
                    league = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}`);
                } catch (err) {
                    console.warn(`Could not fetch league ${currentProcessingLeagueId}: ${err.message}`);
                    break; // Stop processing if a league cannot be fetched in the chain
                }
            }

            const season = parseInt(league.season);

            // Only collect data if the season is less than or equal to the dynamically determined end year
            if (season <= end) {
                const rosters = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}/rosters`);
                const users = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}/users`);

                // Determine the number of regular season weeks for matchup fetching
                const numRegularSeasonWeeks = league.settings.playoff_week_start ? (league.settings.playoff_week_start - 1) : 14;
                const matchups = [];
                for (let week = 1; week <= numRegularSeasonWeeks; week++) {
                    try {
                        const weekMatchups = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}/matchups/${week}`);
                        matchups.push(weekMatchups);
                    } catch (matchupErr) {
                        console.warn(`Could not fetch regular season matchups for league ${currentProcessingLeagueId}, week ${week}: ${matchupErr.message}`);
                    }
                }

                // Fetch playoff matchups
                const playoffMatchups = [];
                if (league.settings.playoff_week_start && league.settings.playoff_week_end) {
                    for (let week = league.settings.playoff_week_start; week <= league.settings.playoff_week_end; week++) {
                         try {
                            const weekPlayoffs = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}/matchups/${week}`);
                            playoffMatchups.push(weekPlayoffs);
                        } catch (playoffErr) {
                            console.warn(`Could not fetch playoff matchups for league ${currentProcessingLeagueId}, week ${week}: ${playoffErr.message}`);
                        }
                    }
                }

                leagueHistory.push({
                    season: season,
                    league: league,
                    rosters: rosters,
                    users: users,
                    matchups: matchups, // Regular season matchups
                    playoffs: playoffMatchups // Playoff matchups
                });
            }

            // Move to the previous league ID in the chain
            currentProcessingLeagueId = league.previous_league_id;
        }

        // Sort the collected history by season in ascending order for chronological display
        leagueHistory.sort((a, b) => a.season - b.season);

        res.status(200).json(leagueHistory);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: err.message || 'An unexpected error occurred while fetching data.' });
    }
}
