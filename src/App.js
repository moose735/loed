// App.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  LEAGUE_START_YEAR, // Import LEAGUE_START_YEAR from config.js
} from './config';

// Import existing components
import PowerRankings from './lib/PowerRankings';
import LeagueHistory from './lib/LeagueHistory';
import RecordBook from './lib/RecordBook';
import DPRAnalysis from './lib/DPRAnalysis';
import LuckRatingAnalysis from './lib/LuckRatingAnalysis';
import TeamDetailPage from './lib/TeamDetailPage';
import Head2HeadGrid from './lib/Head2HeadGrid';
import FinancialTracker from './components/FinancialTracker';
import Dashboard from './components/Dashboard';

// Import Sleeper API functions to fetch league details and historical matchups
import {
  fetchLeagueDetails,
  fetchHistoricalMatchups,
  fetchUsersData,
  CURRENT_LEAGUE_ID,
  TEAM_NAME_TO_SLEEPER_ID_MAP, // Used for custom display names
} from './utils/sleeperApi';


// Define the available tabs and their categories for the dropdown
const NAV_CATEGORIES = {
  HOME: { label: 'Dashboard', tab: 'dashboard' },
  POWER_RANKINGS: { label: 'Power Rankings', tab: 'powerRankings' },
  LEAGUE_DATA: {
    label: 'League Data',
    subTabs: [
      { label: 'League History', tab: 'leagueHistory' },
      { label: 'Record Book', tab: 'recordBook' },
      { label: 'DPR Analysis', tab: 'dprAnalysis' },
      { label: 'Luck Rating', tab: 'luckRating' },
      { label: 'Head-to-Head Grid', tab: 'headToHeadGrid' },
      { label: 'Financials', tab: 'financials' },
    ],
  },
  TEAMS: { // This category will be dynamically populated
    label: 'Teams',
    subTabs: [],
  },
};

// Flattened list of all possible tabs for conditional rendering
const TABS = {
  DASHBOARD: 'dashboard',
  POWER_RANKINGS: 'powerRankings',
  LEAGUE_HISTORY: 'leagueHistory',
  RECORD_BOOK: 'recordBook',
  DPR_ANALYSIS: 'dprAnalysis',
  LUCK_RATING: 'luckRating',
  HEAD_TO_HEAD_GRID: 'headToHeadGrid',
  FINANCIALS: 'financials',
  TEAM_DETAIL: 'teamDetail', // Special tab for individual team pages
};

const App = () => {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historicalMatchups, setHistoricalMatchups] = useState([]);
  const [leagueName, setLeagueName] = useState('Fantasy League'); // Default league name
  const [allTeamNames, setAllTeamNames] = useState([]); // For dynamic team dropdown
  const [selectedTeam, setSelectedTeam] = useState(null); // For TeamDetailPage

  // State to hold the mapping from Sleeper user_id to display name
  const [userIdToDisplayNameMap, setUserIdToDisplayNameMap] = useState(new Map());

  // Function to get the display team name, using the pre-built map
  const getDisplayTeamName = useCallback((teamIdentifier) => {
    // teamIdentifier could be a user_id or already a display name from historical data
    if (userIdToDisplayNameMap.has(teamIdentifier)) {
      return userIdToDisplayNameMap.get(teamIdentifier);
    }
    // Fallback: if it's not a user_id in our map, assume it's already a display name
    // or a name from a custom data source that needs no further mapping.
    // This is important for backward compatibility with existing data structures that
    // might pass names directly.
    return teamIdentifier;
  }, [userIdToDisplayNameMap]);


  useEffect(() => {
    const loadAllSleeperData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch current league details to get the league name
        const leagueDetails = await fetchLeagueDetails(CURRENT_LEAGUE_ID);
        if (leagueDetails && leagueDetails.name) {
          setLeagueName(leagueDetails.name);
        } else {
          console.warn("Could not fetch current league details or league name.");
        }

        // 2. Fetch all users for the CURRENT league to build the display name map
        // This map will be used for all historical data as well, assuming user_ids are consistent.
        const users = await fetchUsersData(CURRENT_LEAGUE_ID);
        const newUserIdToDisplayNameMap = new Map();
        users.forEach(user => {
            // Prioritize custom name from TEAM_NAME_TO_SLEEPER_ID_MAP
            const customNameEntry = Object.entries(TEAM_NAME_TO_SLEEPER_ID_MAP).find(([, id]) => id === user.user_id);
            if (customNameEntry) {
                newUserIdToDisplayNameMap.set(user.user_id, customNameEntry[0]);
            } else if (user.metadata?.team_name) {
                newUserIdToDisplayNameMap.set(user.user_id, user.metadata.team_name);
            } else if (user.display_name) {
                newUserIdToDisplayNameMap.set(user.user_id, user.display_name);
            } else if (user.first_name) {
                newUserIdToDisplayNameMap.set(user.user_id, user.first_name);
            } else {
                newUserIdToDisplayNameMap.set(user.user_id, `User ${user.user_id}`);
            }
        });
        setUserIdToDisplayNameMap(newUserIdToDisplayNameMap);
        console.log("Built userIdToDisplayNameMap:", newUserIdToDisplayNameMap);

        // 3. Fetch all historical matchups from Sleeper API
        console.log("App.js: Fetching historical matchups from Sleeper API...");
        const matchups = await fetchHistoricalMatchups(CURRENT_LEAGUE_ID, LEAGUE_START_YEAR);
        setHistoricalMatchups(matchups);
        console.log("App.js: Fetched historical matchups:", matchups);

        // 4. Populate dynamic team dropdown
        const uniqueTeamNames = new Set();
        // Use the fetched matchups' team names (which are already display names from sleeperApi.js transformation)
        matchups.forEach(match => {
            if (match.team1) uniqueTeamNames.add(match.team1);
            if (match.team2) uniqueTeamNames.add(match.team2);
        });
        // Also add current active user display names in case they didn't play in a historical matchup yet
        users.forEach(user => {
            const displayName = newUserIdToDisplayNameMap.get(user.user_id);
            if (displayName) uniqueTeamNames.add(displayName);
        });

        const sortedTeamNames = Array.from(uniqueTeamNames).sort();
        setAllTeamNames(sortedTeamNames);

        // Dynamically populate TEAMS subTabs
        NAV_CATEGORIES.TEAMS.subTabs = sortedTeamNames.map(team => ({
          label: team,
          tab: TABS.TEAM_DETAIL, // All team links go to the team detail tab
          teamName: team,           // Pass the team name for rendering
        }));

      } catch (err) {
        console.error("Error loading all Sleeper data in App.js:", err);
        setError("Failed to load league data from Sleeper API. Please check your network connection or Sleeper API status.");
      } finally {
        setLoading(false);
      }
    };

    loadAllSleeperData();
  }, []); // Empty dependency array means this runs once on mount

  const handleTabChange = useCallback((tab, teamName = null) => {
    setActiveTab(tab);
    setSelectedTeam(teamName);
  }, []);

  // Helper to render navigation items
  const renderNavItem = (category) => {
    if (category.subTabs) {
      return (
        <div key={category.label} className="relative group">
          <button className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium">
            {category.label}
          </button>
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
            {category.subTabs.map(subTab => (
              <a
                key={subTab.label} // Use label as key for dynamic sub-tabs
                href="#"
                onClick={(e) => { e.preventDefault(); handleTabChange(subTab.tab, subTab.teamName); }}
                className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${activeTab === subTab.tab && selectedTeam === subTab.teamName ? 'bg-gray-100 font-semibold' : ''}`}
              >
                {subTab.label}
              </a>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <a
          key={category.tab}
          href="#"
          onClick={(e) => { e.preventDefault(); handleTabChange(category.tab); }}
          className={`text-white px-3 py-2 rounded-md text-sm font-medium ${activeTab === category.tab ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
        >
          {category.label}
        </a>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-md p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold mb-2 sm:mb-0">
            {leagueName} Dashboard
          </h1>
          <nav className="flex space-x-4">
            {Object.values(NAV_CATEGORIES).map(renderNavItem)}
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-blue-600">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium">Loading league data from Sleeper API, please wait...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 text-lg mt-8">Error: {error}</div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            {activeTab === TABS.DASHBOARD && (
              <Dashboard
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.POWER_RANKINGS && (
              <PowerRankings
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.LEAGUE_HISTORY && (
              <LeagueHistory
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.RECORD_BOOK && (
              <RecordBook
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.DPR_ANALYSIS && (
              <DPRAnalysis
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.LUCK_RATING && (
              <LuckRatingAnalysis
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.HEAD_TO_HEAD_GRID && (
              <Head2HeadGrid
                historicalMatchups={historicalMatchups}
                getDisplayTeamName={getDisplayTeamName}
              />
            )}
            {activeTab === TABS.FINANCIALS && (
                <FinancialTracker
                    getDisplayTeamName={getDisplayTeamName}
                    historicalMatchups={historicalMatchups} // This prop is passed but FinancialTracker will fetch its own transactions
                />
            )}
           {activeTab === TABS.TEAM_DETAIL && selectedTeam && (
             <TeamDetailPage
               teamName={selectedTeam}
               historicalMatchups={historicalMatchups}
               getMappedTeamName={getDisplayTeamName} // Renamed prop to match getDisplayTeamName
             />
           )}
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-gray-600 text-sm pb-8 px-4">
        <p>This site displays league data powered by Sleeper API.</p>
        <p className="mt-2">
          For Sleeper API documentation, visit:{" "}
          <a href="https://docs.sleeper.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Sleeper API Docs
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
