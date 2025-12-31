import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// CONFIGURATION - Update this after deployment!
// ============================================
const APP_VERSION = '1.0.9';
const API_URL = 'https://web-production-5c18.up.railway.app';

// ============================================
// API CLIENT
// ============================================
const api = {
  async getDeals(filters = {}) {
    const params = new URLSearchParams();
    if (filters.sport && filters.sport !== 'all') params.append('sport', filters.sport);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.minDealScore) params.append('minDealScore', filters.minDealScore);
    if (filters.search) params.append('search', filters.search);
    if (filters.gradeType && filters.gradeType !== 'all') params.append('grade', filters.gradeType);
    params.append('sortBy', filters.sortBy || 'dealScore');
    
    const response = await fetch(`${API_URL}/api/deals?${params}`);
    if (!response.ok) throw new Error('Failed to fetch deals');
    return response.json();
  },
  
  async clearData() {
    const response = await fetch(API_URL + "/api/clear-data", { method: "DELETE" });
    if (!response.ok) throw new Error('Failed to clear data');
    return response.json();
  },
  
  async getStats() {
    const response = await fetch(`${API_URL}/api/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async getSettings() {
    const response = await fetch(`${API_URL}/api/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },

  async updateSettings(settings) {
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error('Failed to update settings');
    return response.json();
  },

  async reportIssue(report) {
    const response = await fetch(`${API_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    if (!response.ok) throw new Error('Failed to submit report');
    return response.json();
  },

  async getScanLog(filters = {}) {
    const params = new URLSearchParams();
    if (filters.outcome) params.append('outcome', filters.outcome);
    if (filters.sport) params.append('sport', filters.sport);
    params.append('limit', filters.limit || 100);
    const response = await fetch(`${API_URL}/api/scan-log?${params}`);
    if (!response.ok) throw new Error('Failed to fetch scan log');
    return response.json();
  },

  async getPlayers() {
    const response = await fetch(`${API_URL}/api/players`);
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  },

  async addPlayer(name, sport) {
    const response = await fetch(`${API_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to add player');
    }
    return response.json();
  },

  async togglePlayer(id, active) {
    const response = await fetch(`${API_URL}/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    if (!response.ok) throw new Error('Failed to update player');
    return response.json();
  },

  async deletePlayer(id) {
    const response = await fetch(`${API_URL}/api/players/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete player');
    return response.json();
  },

  async getTeams() {
    const response = await fetch(`${API_URL}/api/teams`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  },

  async importTeam(sport, team) {
    const response = await fetch(`${API_URL}/api/players/import-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, team })
    });
    if (!response.ok) throw new Error('Failed to import team');
    return response.json();
  },

  async getScanCount() {
    const response = await fetch(`${API_URL}/api/scan-count`);
    if (!response.ok) throw new Error('Failed to fetch scan count');
    return response.json();
  },

  async uploadPriceData(file, sport) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sport', sport);
    const response = await fetch(`${API_URL}/api/price-data/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Upload failed');
    }
    return response.json();
  },

  async getPriceDataStats() {
    const response = await fetch(`${API_URL}/api/price-data/stats`);
    if (!response.ok) throw new Error('Failed to fetch price data stats');
    return response.json();
  },

  async deletePriceData() {
    const response = await fetch(`${API_URL}/api/price-data`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete price data');
    return response.json();
  }
};

// ============================================
// MAIN COMPONENT
// ============================================
const CardDealFinder = () => {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    sport: 'all',
    type: 'all',
    minDealScore: 0,
    search: '',
    gradeType: 'all',
    sortBy: 'dealScore'
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isDemo, setIsDemo] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [settings, setSettings] = useState({ minPrice: 0, maxPrice: 500, minDealScore: 10, cardYear: null });
  const [showSettings, setShowSettings] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, listing: null });
  const [reportForm, setReportForm] = useState({ issue: 'wrong_parallel', notes: '' });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', sport: 'basketball' });
  const [showPlayers, setShowPlayers] = useState(false);
  const [teams, setTeams] = useState({ basketball: [], baseball: [] });
  const [selectedImport, setSelectedImport] = useState({ sport: 'basketball', team: '' });
  const [importing, setImporting] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanStartTime, setScanStartTime] = useState(null);
  const [showScanLog, setShowScanLog] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const [scanLogFilter, setScanLogFilter] = useState('rejected');
  const [scanLogSort, setScanLogSort] = useState({ field: 'scanned_at', dir: 'desc' });
  const [showPriceData, setShowPriceData] = useState(false);
  const [priceDataStats, setPriceDataStats] = useState(null);
  const [uploadingSport, setUploadingSport] = useState('basketball');
  const [uploading, setUploading] = useState(false);

  // Fetch deals from API
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dealsResponse, statsResponse] = await Promise.all([
        api.getDeals(filters),
        api.getStats()
      ]);
      
      setListings(dealsResponse.data || []);
      setStats(statsResponse.data);
      setLastRefresh(new Date());
      setIsDemo(false);
    } catch (err) {
      console.error('API Error:', err);
      // Fall back to demo mode
      setIsDemo(true);
      setListings(generateDemoData());
      setStats({
        total_deals: 47,
        hot_deals: 12,
        ending_soon: 8,
        total_potential_profit: 4250,
        avg_deal_score: 28
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch settings
  useEffect(() => {
    api.getSettings().then(res => {
      if (res.success) setSettings(res.data);
    }).catch(() => {});
  }, []);

  // Poll scan count every 5 seconds
  useEffect(() => {
    const fetchScanCount = () => {
      api.getScanCount().then(res => {
        if (res.success) {
          setScanCount(res.data.total);
          if (res.data.lastReset) {
            setScanStartTime(new Date(res.data.lastReset));
          }
        }
      }).catch(() => {});
    };
    fetchScanCount();
    const interval = setInterval(fetchScanCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch scan log when modal opens or filter changes
  useEffect(() => {
    if (showScanLog) {
      api.getScanLog({ outcome: scanLogFilter, limit: 200 }).then(res => {
        if (res.success) setScanLog(res.data);
      }).catch(() => {});
    }
  }, [showScanLog, scanLogFilter]);

  // Fetch price data stats when panel opens
  useEffect(() => {
    if (showPriceData) {
      api.getPriceDataStats().then(res => {
        if (res.success) setPriceDataStats(res.data);
      }).catch(() => setPriceDataStats(null));
    }
  }, [showPriceData]);

  // Sort scan log
  const sortedScanLog = [...scanLog].sort((a, b) => {
    const aVal = a[scanLogSort.field];
    const bVal = b[scanLogSort.field];
    if (scanLogSort.dir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Fetch players and teams when panel opens
  useEffect(() => {
    if (showPlayers) {
      api.getPlayers().then(res => {
        if (res.success) setPlayers(res.data);
      }).catch((err) => console.error('Failed to fetch players:', err));
      api.getTeams().then(res => {
        console.log('Teams response:', res);
        if (res.success) setTeams(res.data);
      }).catch((err) => console.error('Failed to fetch teams:', err));
    }
  }, [showPlayers]);

  const addPlayer = async () => {
    if (!newPlayer.name.trim()) return;
    try {
      const res = await api.addPlayer(newPlayer.name, newPlayer.sport);
      if (res.success) {
        setPlayers([...players, res.data]);
        setNewPlayer({ name: '', sport: newPlayer.sport });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const togglePlayer = async (id, active) => {
    try {
      const res = await api.togglePlayer(id, active);
      if (res.success) {
        setPlayers(players.map(p => p.id === id ? res.data : p));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const deletePlayer = async (id) => {
    if (!window.confirm('Remove this player from monitoring?')) return;
    try {
      await api.deletePlayer(id);
      setPlayers(players.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const importTeam = async () => {
    if (!selectedImport.team) return;
    try {
      setImporting(true);
      const res = await api.importTeam(selectedImport.sport, selectedImport.team);
      if (res.success) {
        alert(res.message);
        // Refresh players list
        const playersRes = await api.getPlayers();
        if (playersRes.success) setPlayers(playersRes.data);
        setSelectedImport({ ...selectedImport, team: '' });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const uploadPriceCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await api.uploadPriceData(file, uploadingSport);
      console.log('Upload response:', res);
      if (res.success && res.data) {
        alert(`Uploaded ${res.data.imported || 0} prices from ${file.name}`);
        // Refresh stats
        const statsRes = await api.getPriceDataStats();
        if (statsRes.success) setPriceDataStats(statsRes.data);
      } else if (res.success) {
        // Old response format fallback
        alert(`Upload successful for ${file.name}`);
        const statsRes = await api.getPriceDataStats();
        if (statsRes.success) setPriceDataStats(statsRes.data);
      } else {
        alert('Upload failed: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const clearPriceData = async () => {
    if (!window.confirm('Delete all price data? The worker will fall back to API lookups.')) return;
    try {
      const res = await api.deletePriceData();
      if (res.success) {
        alert(`Deleted ${res.data.deleted} price records`);
        setPriceDataStats(null);
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    fetchDeals();
    const interval = setInterval(fetchDeals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDeals]);

  // Countdown timer update
  useEffect(() => {
    const interval = setInterval(() => {
      setListings(prev => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Apply local filters for demo mode
  const filteredListings = isDemo ? listings.filter(l => {
    if (filters.sport !== 'all' && l.sport !== filters.sport) return false;
    if (filters.type === 'auction' && !l.isAuction) return false;
    if (filters.type === 'buyNow' && l.isAuction) return false;
    if (l.dealScore < filters.minDealScore) return false;
    if (filters.search && !l.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }) : listings;

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return null;
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear all data from the database?')) return;
    try {
      setClearing(true);
      const result = await api.clearData();
      setScanCount(0); // Reset scan counter display
      setScanStartTime(new Date()); // Reset scan start time
      setListings([]); // Immediately clear displayed listings
      setStats(null); // Clear stats
      setIsDemo(false); // Ensure not in demo mode
      alert('Cleared ' + (result.deleted || 0) + ' listings. Refreshing...');
      // Wait a moment then refresh
      setTimeout(() => fetchDeals(), 500);
    } catch (err) {
      alert('Failed to clear data: ' + err.message);
      setListings([]); // Still clear on error
    } finally {
      setClearing(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const res = await api.updateSettings(newSettings);
      if (res.success) {
        setSettings(res.data);
        alert('Settings saved! Changes will apply on next scan.');
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const openReportModal = (listing, e) => {
    e.preventDefault();
    e.stopPropagation();
    setReportModal({ open: true, listing });
    setReportForm({ issue: 'wrong_parallel', notes: '' });
  };

  const submitReport = async () => {
    if (!reportModal.listing) return;
    try {
      setSubmittingReport(true);
      await api.reportIssue({
        listingId: reportModal.listing.id,
        ebayUrl: reportModal.listing.listingUrl || reportModal.listing.listing_url,
        scpUrl: reportModal.listing.market_value_url,
        issue: reportForm.issue,
        notes: reportForm.notes
      });
      alert('Report submitted! Thank you for helping improve accuracy.');
      setReportModal({ open: false, listing: null });
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Calculate scan rate (cards per second)
  const getScanRate = () => {
    if (!scanStartTime || scanCount === 0) return '0.00';
    const elapsedSeconds = (Date.now() - scanStartTime.getTime()) / 1000;
    if (elapsedSeconds < 1) return '0.00';
    const rate = scanCount / elapsedSeconds;
    return rate.toFixed(2);
  };

  const getDealScoreColor = (score) => {
    if (score >= 40) return 'bg-green-500';
    if (score >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getUrgencyClass = (endTime) => {
    if (!endTime) return '';
    const diff = new Date(endTime) - new Date();
    if (diff < 5 * 60 * 1000) return 'animate-pulse bg-red-900/30';
    if (diff < 30 * 60 * 1000) return 'bg-orange-900/20';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🃏</span> CardSnipe
              <span className={`text-sm font-normal px-2 py-1 rounded-full ${isDemo ? 'bg-yellow-600' : 'bg-green-600'}`}>
                {isDemo ? 'DEMO' : 'LIVE'}
              </span>
              <span className="text-xs font-normal text-gray-500">v{APP_VERSION}</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time undervalued card finder • {filteredListings.length} deals found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanLog(true)}
              className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-center transition-colors"
              title="Click to view scan log"
            >
              <div className="text-lg font-bold text-blue-400">{scanCount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Cards Scanned</div>
            </button>
            <div className="bg-gray-800 px-3 py-1.5 rounded-lg text-center">
              <div className="text-lg font-bold text-green-400">{getScanRate()}</div>
              <div className="text-xs text-gray-500">Cards/sec</div>
            </div>
            <span className="text-xs text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium"
            >
              👤 Players
            </button>
            <button
              onClick={() => setShowPriceData(!showPriceData)}
              className={`px-4 py-2 rounded-lg font-medium ${priceDataStats?.total > 0 ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              💰 Prices
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={clearAllData}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear Data'}
            </button>
            <button
              onClick={fetchDeals}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <span className="animate-spin">⟳</span> : <span>⟳</span>}
              Refresh
            </button>
          </div>
        </div>

        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4 text-sm">
            <strong>Demo Mode:</strong> Backend not connected. Showing sample data. 
            <a href="#setup" className="underline ml-2">Set up your backend →</a>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-bold mb-3">⚙️ Search Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400">Card Year</label>
                <select
                  value={settings.cardYear || ''}
                  onChange={(e) => setSettings({ ...settings, cardYear: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">All Years</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                  <option value="2019">2019</option>
                  <option value="2018">2018</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Max Price ($)</label>
                <input
                  type="number"
                  value={settings.maxPrice}
                  onChange={(e) => setSettings({ ...settings, maxPrice: Number(e.target.value) })}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Min Deal Score (%)</label>
                <input
                  type="number"
                  value={settings.minDealScore}
                  onChange={(e) => setSettings({ ...settings, minDealScore: Number(e.target.value) })}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => updateSettings(settings)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium w-full"
                >
                  Save Settings
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: Only PSA 9 and PSA 10 graded cards are searched.
            </p>
          </div>
        )}

        {/* Price Data Panel */}
        {showPriceData && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-bold mb-3">💰 Local Price Data</h3>
            <p className="text-sm text-gray-400 mb-4">
              Upload CSV exports from SportsCardPro for instant local price lookups (no API rate limits!)
            </p>

            {/* Stats */}
            {priceDataStats && priceDataStats.total > 0 ? (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-4">
                <div className="text-green-400 font-medium mb-1">Local pricing active</div>
                <div className="text-sm text-gray-300">
                  {priceDataStats.total.toLocaleString()} prices loaded
                  {priceDataStats.basketball > 0 && ` | Basketball: ${priceDataStats.basketball.toLocaleString()}`}
                  {priceDataStats.baseball > 0 && ` | Baseball: ${priceDataStats.baseball.toLocaleString()}`}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                <div className="text-yellow-400 font-medium">No local price data</div>
                <div className="text-sm text-gray-300">Upload SportsCardPro CSVs below to enable fast local lookups.</div>
              </div>
            )}

            {/* Upload Form */}
            <div className="flex gap-3 items-center mb-4">
              <select
                value={uploadingSport}
                onChange={(e) => setUploadingSport(e.target.value)}
                className="bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="basketball">Basketball</option>
                <option value="baseball">Baseball</option>
              </select>
              <label className={`flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-center cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? 'Uploading...' : 'Upload CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={uploadPriceCSV}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {priceDataStats?.total > 0 && (
                <button
                  onClick={clearPriceData}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Download CSVs from SportsCardPro console pages (e.g., "2023 Panini Prizm Basketball").
              Expected columns: id, console-name, product-name, loose-price, cib-price, new-price, graded-price, box-only-price, manual-only-price, bgs-10-price, condition-17-price, condition-18-price, gamestop-price, gamestop-trade-price, retail-loose-buy, retail-loose-sell, retail-cib-buy, retail-cib-sell, retail-new-buy, retail-new-sell, upc, sales-volume, genre, tcg-id, asin, epid, release-date
            </p>
          </div>
        )}

        {/* Players Panel */}
        {showPlayers && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-bold mb-3">👤 Monitored Players</h3>

            {/* Add New Player Form */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Player name..."
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={newPlayer.sport}
                onChange={(e) => setNewPlayer({ ...newPlayer, sport: e.target.value })}
                className="bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="basketball">Basketball</option>
                <option value="baseball">Baseball</option>
              </select>
              <button
                onClick={addPlayer}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium"
              >
                Add
              </button>
            </div>

            {/* Import Team */}
            <div className="flex gap-2 mb-4 pb-4 border-b border-gray-700">
              <select
                value={selectedImport.sport}
                onChange={(e) => setSelectedImport({ sport: e.target.value, team: '' })}
                className="bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="basketball">NBA</option>
                <option value="baseball">MLB</option>
              </select>
              <select
                value={selectedImport.team}
                onChange={(e) => setSelectedImport({ ...selectedImport, team: e.target.value })}
                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a team...</option>
                {teams[selectedImport.sport]?.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <button
                onClick={importTeam}
                disabled={!selectedImport.team || importing}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import Team'}
              </button>
            </div>

            {/* Players List by Sport */}
            {['basketball', 'baseball'].map(sport => {
              const sportPlayers = players.filter(p => p.sport === sport);
              if (sportPlayers.length === 0) return null;
              return (
                <div key={sport} className="mb-3">
                  <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">
                    {sport === 'basketball' ? '🏀' : '⚾'} {sport}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sportPlayers.map(player => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                          player.active ? 'bg-gray-700' : 'bg-gray-700/50 text-gray-500'
                        }`}
                      >
                        <span className={player.active ? '' : 'line-through'}>{player.name}</span>
                        <button
                          onClick={() => togglePlayer(player.id, !player.active)}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            player.active
                              ? 'bg-green-600/30 text-green-400 hover:bg-green-600/50'
                              : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
                          }`}
                          title={player.active ? 'Click to disable' : 'Click to enable'}
                        >
                          {player.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="text-xs text-gray-500 hover:text-red-400"
                          title="Remove player"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {players.length === 0 && (
              <p className="text-sm text-gray-500">No players configured. Add some above!</p>
            )}

            <p className="text-xs text-gray-500 mt-3">
              The scanner will search eBay and COMC for PSA 9/10 cards of active players.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Search player, set, team..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="col-span-2 bg-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filters.sport}
              onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Sports</option>
              <option value="basketball">🏀 Basketball</option>
              <option value="baseball">⚾ Baseball</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Listings</option>
              <option value="auction">⏱️ Auctions</option>
              <option value="buyNow">💰 Buy Now</option>
            </select>
            <select
              value={filters.gradeType}
              onChange={(e) => setFilters({ ...filters, gradeType: e.target.value })}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Grades</option>
              <option value="graded">Graded Only</option>
              <option value="raw">Raw Only</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="dealScore">Best Deals</option>
              <option value="endingSoon">Ending Soon</option>
              <option value="priceLow">Price: Low</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-400">Price Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">$</span>
              <input
                type="number"
                value={settings.minPrice}
                onChange={(e) => setSettings({ ...settings, minPrice: Number(e.target.value) })}
                placeholder="Min"
                className="w-20 bg-gray-700 rounded px-2 py-1 text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={settings.maxPrice}
                onChange={(e) => setSettings({ ...settings, maxPrice: Number(e.target.value) })}
                placeholder="Max"
                className="w-20 bg-gray-700 rounded px-2 py-1 text-sm"
              />
              <button
                onClick={() => updateSettings(settings)}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm text-gray-400">Min Deal Score:</span>
            <input
              type="range"
              min="0"
              max="50"
              value={filters.minDealScore}
              onChange={(e) => setFilters({ ...filters, minDealScore: parseInt(e.target.value) })}
              className="w-32"
            />
            <span className="text-sm font-medium text-green-400">{filters.minDealScore}%+</span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats?.hot_deals || filteredListings.filter(l => l.dealScore >= 30).length}
            </div>
            <div className="text-xs text-gray-400">Hot Deals (30%+ off)</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats?.ending_soon || filteredListings.filter(l => l.isAuction && new Date(l.auctionEndTime || l.endTime) - new Date() < 60 * 60 * 1000).length}
            </div>
            <div className="text-xs text-gray-400">Ending &lt; 1 Hour</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">
              ${(stats?.total_potential_profit || filteredListings.reduce((sum, l) => sum + (l.marketValue - l.currentPrice), 0)).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Total Potential Profit</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {Math.round(stats?.avg_deal_score || (filteredListings.reduce((sum, l) => sum + l.dealScore, 0) / filteredListings.length) || 0)}%
            </div>
            <div className="text-xs text-gray-400">Avg Discount</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && listings.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⟳</div>
            <p className="text-gray-400">Loading deals...</p>
          </div>
        )}

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map(listing => (
            <a
              key={listing.id || listing.ebayItemId}
              href={listing.listingUrl || listing.listing_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer block ${getUrgencyClass(listing.auctionEndTime || listing.endTime)}`}
            >
              <div className="flex">
                {/* Card Image */}
                <div className="w-24 h-32 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {listing.imageUrl || listing.image_url ? (
                    <img 
                      src={listing.imageUrl || listing.image_url} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = listing.sport === 'basketball' ? '🏀' : '⚾'; }}
                    />
                  ) : (
                    <span className="text-4xl">{listing.sport === 'basketball' ? '🏀' : '⚾'}</span>
                  )}
                </div>
                
                {/* Card Info */}
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-bold text-sm leading-tight break-words" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{listing.title || `${listing.player} ${listing.year} ${listing.set}`}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{listing.grade}</p>
                    </div>
                    <span className={`${getDealScoreColor(listing.dealScore || listing.deal_score)} text-xs font-bold px-2 py-1 rounded-full ml-2 flex-shrink-0`}>
                      -{listing.dealScore || listing.deal_score}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{listing.platform || 'eBay'}</span>
                    {listing.sellerRating && (
                      <span className="text-xs text-gray-500">⭐ {listing.sellerRating}%</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="text-lg font-bold text-green-400">${listing.currentPrice || listing.current_price}</div>
                      {(listing.marketValue || listing.market_value) ? (
                        <a
                          href={listing.market_value_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-500 line-through hover:text-blue-400"
                          title={`Source: ${listing.market_value_source || 'unknown'}${listing.market_value_date ? ' - ' + new Date(listing.market_value_date).toLocaleDateString() : ''}`}
                        >
                          ${listing.marketValue || listing.market_value} mkt
                          {listing.market_value_source && <span className="ml-1 text-gray-600">({listing.market_value_source})</span>}
                        </a>
                      ) : (
                        <div className="text-xs text-gray-500">Unknown mkt</div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {(listing.isAuction || listing.is_auction) ? (
                        <>
                          <div className={`text-sm font-medium ${new Date(listing.auctionEndTime || listing.endTime) - new Date() < 5 * 60 * 1000 ? 'text-red-400' : 'text-orange-400'}`}>
                            ⏱️ {formatTimeRemaining(listing.auctionEndTime || listing.endTime)}
                          </div>
                          <div className="text-xs text-gray-500">{listing.bidCount || listing.bid_count || 0} bids</div>
                        </>
                      ) : (
                        <span className="text-xs bg-green-600 px-2 py-1 rounded font-medium">BUY NOW</span>
                      )}
                      <button
                        onClick={(e) => openReportModal(listing, e)}
                        className="text-xs text-gray-500 hover:text-red-400 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors"
                        title="Report incorrect match"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Empty State */}
        {!loading && filteredListings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-400">No deals match your filters. Try adjusting them!</p>
          </div>
        )}

        {/* Report Modal */}
        {reportModal.open && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setReportModal({ open: false, listing: null })}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Report Incorrect Match</h3>
              <p className="text-sm text-gray-400 mb-4 truncate" title={reportModal.listing?.title}>
                {reportModal.listing?.title}
              </p>

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Issue Type</label>
                <select
                  value={reportForm.issue}
                  onChange={(e) => setReportForm({ ...reportForm, issue: e.target.value })}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="wrong_parallel">Wrong Parallel Match</option>
                  <option value="wrong_price">Wrong Market Price</option>
                  <option value="wrong_year">Wrong Year Match</option>
                  <option value="wrong_player">Wrong Player</option>
                  <option value="wrong_set">Wrong Set/Insert</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Notes (optional)</label>
                <textarea
                  value={reportForm.notes}
                  onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                  placeholder="Describe the issue..."
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm h-24 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReportModal({ open: false, listing: null })}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  disabled={submittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Log Modal */}
        {showScanLog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowScanLog(false)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-5xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Scan Log - {scanLog.length} entries</h3>
                <button onClick={() => setShowScanLog(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
              </div>

              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <select
                  value={scanLogFilter}
                  onChange={(e) => setScanLogFilter(e.target.value)}
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="rejected">Rejected Only</option>
                  <option value="saved">Saved (Deals)</option>
                  <option value="all">All Scans</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 sticky top-0">
                    <tr>
                      <th
                        className="px-3 py-2 text-left cursor-pointer hover:bg-gray-600"
                        onClick={() => setScanLogSort({ field: 'title', dir: scanLogSort.field === 'title' && scanLogSort.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        Card {scanLogSort.field === 'title' && (scanLogSort.dir === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="px-3 py-2 text-left cursor-pointer hover:bg-gray-600"
                        onClick={() => setScanLogSort({ field: 'price', dir: scanLogSort.field === 'price' && scanLogSort.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        Price {scanLogSort.field === 'price' && (scanLogSort.dir === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="px-3 py-2 text-left cursor-pointer hover:bg-gray-600"
                        onClick={() => setScanLogSort({ field: 'outcome', dir: scanLogSort.field === 'outcome' && scanLogSort.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        Outcome {scanLogSort.field === 'outcome' && (scanLogSort.dir === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="px-3 py-2 text-left cursor-pointer hover:bg-gray-600"
                        onClick={() => setScanLogSort({ field: 'reject_reason', dir: scanLogSort.field === 'reject_reason' && scanLogSort.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        Reason {scanLogSort.field === 'reject_reason' && (scanLogSort.dir === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="px-3 py-2 text-left cursor-pointer hover:bg-gray-600"
                        onClick={() => setScanLogSort({ field: 'scanned_at', dir: scanLogSort.field === 'scanned_at' && scanLogSort.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        Time {scanLogSort.field === 'scanned_at' && (scanLogSort.dir === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedScanLog.map((log, i) => (
                      <tr key={log.id || i} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="px-3 py-2">
                          <a
                            href={log.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline block max-w-xs truncate"
                            title={log.title}
                          >
                            {log.title?.substring(0, 50) || 'Unknown'}
                          </a>
                          <span className="text-xs text-gray-500">{log.platform} • {log.sport}</span>
                        </td>
                        <td className="px-3 py-2">${log.price}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.outcome === 'saved' ? 'bg-green-600' :
                            log.outcome === 'matched' ? 'bg-blue-600' : 'bg-gray-600'
                          }`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-400 max-w-xs truncate" title={log.reject_reason}>
                          {log.reject_reason || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs">
                          {log.scanned_at ? new Date(log.scanned_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scanLog.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No scan logs found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// DEMO DATA GENERATOR (fallback when API unavailable)
// ============================================
function generateDemoData() {
  const players = {
    basketball: [
      { name: 'LeBron James', team: 'Lakers' },
      { name: 'Victor Wembanyama', team: 'Spurs' },
      { name: 'Luka Doncic', team: 'Mavericks' },
      { name: 'Anthony Edwards', team: 'Timberwolves' },
    ],
    baseball: [
      { name: 'Shohei Ohtani', team: 'Dodgers' },
      { name: 'Julio Rodriguez', team: 'Mariners' },
      { name: 'Gunnar Henderson', team: 'Orioles' },
    ]
  };

  const sets = ['Prizm', 'Optic', 'Select', 'Topps Chrome', 'Bowman'];
  const grades = ['Raw', 'PSA 9', 'PSA 10', 'BGS 9.5'];
  const years = ['2022', '2023', '2024'];
  
  const listings = [];
  let id = 1;
  
  Object.entries(players).forEach(([sport, playerList]) => {
    playerList.forEach(player => {
      for (let i = 0; i < 3; i++) {
        const grade = grades[Math.floor(Math.random() * grades.length)];
        const year = years[Math.floor(Math.random() * years.length)];
        const set = sets[Math.floor(Math.random() * sets.length)];
        const isAuction = Math.random() > 0.5;
        
        let baseValue = Math.floor(Math.random() * 400) + 50;
        if (grade.includes('10')) baseValue *= 2.5;
        
        const discount = Math.random() * 0.4 + 0.1;
        const currentPrice = Math.floor(baseValue * (1 - discount));
        const marketValue = Math.floor(baseValue);
        const dealScore = Math.floor((1 - currentPrice / marketValue) * 100);
        
        listings.push({
          id: id++,
          sport,
          title: `${year} ${set} ${player.name} #${Math.floor(Math.random() * 300)} ${grade}`,
          player: player.name,
          year, set, grade,
          isAuction,
          currentPrice,
          marketValue,
          dealScore,
          endTime: isAuction ? new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000) : null,
          bidCount: isAuction ? Math.floor(Math.random() * 20) : 0,
          platform: 'eBay',
          sellerRating: 98 + Math.random() * 2
        });
      }
    });
  });
  
  return listings.sort((a, b) => b.dealScore - a.dealScore);
}

export default CardDealFinder;
