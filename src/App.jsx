import React, { useState, useEffect } from 'react';

// Main App component
const App = () => {
  // State variables for user inputs and fetched data
  const [leagueId, setLeagueId] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [leagueHistory, setLeagueHistory] = useState([]); // Stores data for each season
  const [statistics, setStatistics] = useState({}); // Stores calculated statistics
  const [loading, setLoading] = useState(false); // Loading indicator
  const [error, setError] = useState(''); // Error messages

  /**
   * Fetches league history data from the Vercel serverless API.
   * This function calls an endpoint on your Vercel deployment
   * which then proxies the request to the Sleeper API.
   * This helps avoid CORS issues and keeps your direct API calls organized.
   */
  const fetchLeagueData = async () => {
    // Clear previous data and errors
    setLeagueHistory([]);
    setStatistics({});
    setError('');
    setLoading(true);

    // Basic input validation
    if (!leagueId || !startYear || !endYear) {
      setError('Please fill in all fields: League ID, Start Year, and End Year.');
      setLoading(false);
      return;
    }

    const start = parseInt(startYear);
    const end = parseInt(endYear);

    if (isNaN(start) || isNaN(end) || start > end || start < 2017) { // Sleeper data generally starts around 2017
      setError('Invalid year range. Start year must be before or equal to end year, and after 2016.');
      setLoading(false);
      return;
    }

    try {
      // Construct the URL for your Vercel API route.
      // This assumes your API route is at /api/league_data.
      const apiUrl = `/api/league_data?leagueId=${leagueId}&startYear=${startYear}&endYear=${endYear}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch league data from API.');
      }

      const data = await response.json();
      setLeagueHistory(data);
      calculateStatistics(data); // Calculate statistics after fetching data
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError(`Error fetching league data: ${err.message}. Please check your League ID and try again.`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculates various statistics based on the fetched league history.
   * Statistics include total wins, losses, points for, points against,
   * championships won, and playoff appearances for each manager.
   * @param {Array} historyData - Array of league data objects, one for each season.
   */
  const calculateStatistics = (historyData) => {
    const stats = {}; // Object to store statistics, keyed by owner_id

    historyData.forEach(seasonData => {
      const { users, rosters, matchups, playoffs } = seasonData;

      // Map owner_id to user display name for easier readability
      const userMap = users.reduce((acc, user) => {
        acc[user.user_id] = user.display_name;
        return acc;
      }, {});

      rosters.forEach(roster => {
        const ownerId = roster.owner_id;
        if (!ownerId) return; // Skip if no owner assigned to roster

        if (!stats[ownerId]) {
          stats[ownerId] = {
            displayName: userMap[ownerId] || `Unknown User (${ownerId})`,
            totalWins: 0,
            totalLosses: 0,
            totalTies: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            championships: 0,
            playoffAppearances: 0,
            seasonsPlayed: 0
          };
        }

        stats[ownerId].seasonsPlayed++; // Increment seasons played for this manager

        // Calculate regular season wins, losses, ties, and points
        if (roster.settings) {
          stats[ownerId].totalWins += roster.settings.wins || 0;
          stats[ownerId].totalLosses += roster.settings.losses || 0;
          stats[ownerId].totalTies += roster.settings.ties || 0;
          stats[ownerId].totalPointsFor += roster.settings.fpts || 0;
          stats[ownerId].totalPointsFor += (roster.settings.fpts_decimal || 0) / 100;
        }

        // Calculate points against from matchups
        if (matchups && matchups[0]) { // Check if matchups exist for this season
          matchups.forEach(weekMatchups => {
            const teamMatchup = weekMatchups.find(m => m.roster_id === roster.roster_id);
            if (teamMatchup && teamMatchup.matchup_id) {
              const opponentMatchup = weekMatchups.find(m =>
                m.matchup_id === teamMatchup.matchup_id && m.roster_id !== roster.roster_id
              );
              if (opponentMatchup) {
                stats[ownerId].totalPointsAgainst += opponentMatchup.points || 0;
              }
            }
          });
        }
      });

      // Calculate championships and playoff appearances
      if (playoffs && playoffs.length > 0) {
        // Find the playoff week (usually the last week of playoffs)
        const championshipWeek = Math.max(...playoffs.map(p => p.week));
        const finalMatchups = playoffs.filter(p => p.week === championshipWeek);

        // A roster wins if its rank is 1 in the playoff settings, or it's the winner of the final matchup
        rosters.forEach(roster => {
            const ownerId = roster.owner_id;
            if (!ownerId || !stats[ownerId]) return;

            // Check for championship win based on final rank if available, or if they won the last playoff game
            if (roster.settings && roster.settings.rank === 1) {
                stats[ownerId].championships++;
            } else {
                // Alternative check: find if this roster won a final matchup
                const championshipGame = finalMatchups.find(m => m.roster_id === roster.roster_id);
                if (championshipGame && championshipGame.points > 0) { // Check if they had points in the championship game
                    const opponentInChampionship = finalMatchups.find(m => m.matchup_id === championshipGame.matchup_id && m.roster_id !== roster.roster_id);
                    if (opponentInChampionship && championshipGame.points > opponentInChampionship.points) {
                        // This check is less reliable than `rank === 1` as `rank` directly indicates final standing.
                        // However, including it as a fallback or for custom playoff structures.
                        // To avoid double counting, only increment if rank wasn't used.
                        if (!roster.settings || roster.settings.rank !== 1) {
                            // stats[ownerId].championships++; // This could lead to overcounting if rank is also present
                        }
                    }
                }
            }

            // Check for playoff appearances: if the roster has a playoff rank or participated in playoff matchups
            if (roster.settings && roster.settings.playoff_rank) {
                stats[ownerId].playoffAppearances++;
            } else if (playoffs.some(p => p.roster_id === roster.roster_id)) {
                // If no playoff_rank, check if they are in any playoff matchup
                 stats[ownerId].playoffAppearances++; // This might overcount if multiple playoff games count as separate appearances
            }
        });
      }
    });

    setStatistics(stats);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white p-6 font-inter flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
          Fantasy Football League History
        </h1>
        <p className="text-xl text-green-200">
          Powered by Sleeper API
        </p>
      </header>

      <section className="bg-white bg-opacity-10 rounded-xl shadow-2xl p-8 max-w-2xl w-full mb-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold mb-6 text-green-100">Fetch League Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label htmlFor="leagueId" className="block text-green-200 text-sm font-medium mb-2">
              Sleeper League ID:
            </label>
            <input
              type="text"
              id="leagueId"
              className="w-full p-3 rounded-lg bg-green-800 border border-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-white placeholder-green-300 transition duration-300"
              placeholder="e.g., 1234567890"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="startYear" className="block text-green-200 text-sm font-medium mb-2">
              Start Season Year:
            </label>
            <input
              type="number"
              id="startYear"
              className="w-full p-3 rounded-lg bg-green-800 border border-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-white placeholder-green-300 transition duration-300"
              placeholder="e.g., 2018"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endYear" className="block text-green-200 text-sm font-medium mb-2">
              End Season Year:
            </label>
            <input
              type="number"
              id="endYear"
              className="w-full p-3 rounded-lg bg-green-800 border border-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-white placeholder-green-300 transition duration-300"
              placeholder="e.g., 2023"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={fetchLeagueData}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Fetch League History'
          )}
        </button>
        {error && (
          <p className="text-red-300 mt-4 text-center text-lg bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-500 shadow-md">
            {error}
          </p>
        )}
      </section>

      {Object.keys(statistics).length > 0 && (
        <section className="bg-white bg-opacity-10 rounded-xl shadow-2xl p-8 max-w-4xl w-full mb-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-green-100 text-center">League Statistics (Overall)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-600 rounded-lg overflow-hidden">
              <thead className="bg-green-800 text-green-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Manager
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Seasons
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Wins
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Losses
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Ties
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    PF
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    PA
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Championships
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Playoff Appearances
                  </th>
                </tr>
              </thead>
              <tbody className="bg-green-700 bg-opacity-40 divide-y divide-green-600">
                {Object.values(statistics).sort((a, b) => b.totalWins - a.totalWins).map((managerStats, index) => (
                  <tr key={managerStats.displayName} className={index % 2 === 0 ? 'bg-green-700 bg-opacity-20' : 'bg-green-700 bg-opacity-30'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {managerStats.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.seasonsPlayed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.totalWins}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.totalLosses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.totalTies}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.totalPointsFor.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.totalPointsAgainst.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.championships}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-100">
                      {managerStats.playoffAppearances}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {leagueHistory.length > 0 && (
        <section className="bg-white bg-opacity-10 rounded-xl shadow-2xl p-8 max-w-4xl w-full mb-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-green-100 text-center">Raw League History (Per Season)</h2>
          {leagueHistory.map((seasonData, index) => (
            <div key={seasonData.season} className="mb-8 border-b border-green-600 pb-6 last:border-b-0">
              <h3 className="text-2xl font-semibold mb-4 text-green-200">Season: {seasonData.season}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-800 bg-opacity-40 p-4 rounded-lg shadow-md">
                  <h4 className="text-xl font-medium mb-2 text-green-100">League Details</h4>
                  <p><strong>Name:</strong> {seasonData.league.name}</p>
                  <p><strong>Total Rosters:</strong> {seasonData.rosters.length}</p>
                </div>
                <div className="bg-green-800 bg-opacity-40 p-4 rounded-lg shadow-md">
                  <h4 className="text-xl font-medium mb-2 text-green-100">Users</h4>
                  <ul className="list-disc list-inside">
                    {seasonData.users.map(user => (
                      <li key={user.user_id}>{user.display_name} (ID: {user.user_id})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default App;
