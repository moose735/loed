// api/league_data.js
// This file will be deployed as a Vercel Serverless Function.

// >>> IMPORTANT: Configure your league details here <<<
const HARDCODED_LEAGUE_ID = '1181984921049018368'; // Replace with your current league ID
const HARDCODED_END_YEAR = 2025; // Replace with the current or latest season year for your league

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

    // startYear is now the only parameter passed from the frontend
    const { startYear } = req.query;

    if (!startYear) {
        return res.status(400).json({ error: 'Missing required query parameter: startYear.' });
    }

    const start = parseInt(startYear);
    const end = HARDCODED_END_YEAR; // Use the hardcoded end year

    if (isNaN(start) || start > end) {
        return res.status(400).json({ error: 'Invalid year range provided (startYear must be a number and less than or equal to hardcoded endYear).' });
    }

    const leagueHistory = [];
    let currentProcessingLeagueId = HARDCODED_LEAGUE_ID; // Start with the hardcoded latest league ID
    const fetchedSeasonIds = new Set(); // Keep track of league IDs already processed to prevent loops

    try {
        // Loop backward through the league history using 'previous_league_id'
        while (currentProcessingLeagueId) {
            let league;
            try {
                league = await fetchSleeperApi(`https://api.sleeper.app/v1/league/${currentProcessingLeagueId}`);
            } catch (err) {
                console.warn(`Could not fetch league ${currentProcessingLeagueId}: ${err.message}`);
                // If a specific league ID fails, break the chain as we can't go further back
                break;
            }

            const season = parseInt(league.season);

            // Stop if we've gone beyond the desired start year
            if (season < start) {
                break;
            }

            // Only process if the season is within the desired range and hasn't been fetched yet
            if (season >= start && season <= end && !fetchedSeasonIds.has(currentProcessingLeagueId)) {
                fetchedSeasonIds.add(currentProcessingLeagueId); // Add the league ID to the set

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
