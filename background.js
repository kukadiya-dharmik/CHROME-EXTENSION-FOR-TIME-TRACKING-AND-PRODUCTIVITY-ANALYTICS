// Background script for tracking active tab time
let currentTabId = null;
let currentUrl = '';
let startTime = null;
let isActive = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ProductivityTracker installed');
  
  // Initialize default categories
  const defaultCategories = {
    'Productive': {
      color: '#10B981',
      domains: ['github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so']
    },
    'Social': {
      color: '#F59E0B',
      domains: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com']
    },
    'Entertainment': {
      color: '#EF4444',
      domains: ['youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com']
    },
    'Shopping': {
      color: '#8B5CF6',
      domains: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com']
    },
    'News': {
      color: '#3B82F6',
      domains: ['cnn.com', 'bbc.com', 'reuters.com', 'techcrunch.com']
    },
    'Other': {
      color: '#6B7280',
      domains: []
    }
  };
  
  const result = await chrome.storage.local.get(['categories']);
  if (!result.categories) {
    await chrome.storage.local.set({ categories: defaultCategories });
  }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await stopTracking();
  await startTracking(activeInfo.tabId);
});

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === currentTabId) {
    await stopTracking();
    await startTracking(tabId);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    isActive = false;
    await stopTracking();
  } else {
    // Window gained focus
    isActive = true;
    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs.length > 0) {
      await startTracking(tabs[0].id);
    }
  }
});

// Track idle state
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    isActive = false;
    await stopTracking();
  } else if (state === 'active') {
    isActive = true;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await startTracking(tabs[0].id);
    }
  }
});

async function startTracking(tabId) {
  if (!isActive) return;
  
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    currentTabId = tabId;
    currentUrl = tab.url;
    startTime = Date.now();
    
    console.log('Started tracking:', currentUrl);
  } catch (error) {
    console.error('Error starting tracking:', error);
  }
}

async function stopTracking() {
  if (!currentTabId || !startTime || !currentUrl) return;
  
  const endTime = Date.now();
  const timeSpent = endTime - startTime;
  
  if (timeSpent < 1000) return; // Ignore very short visits
  
  try {
    const domain = new URL(currentUrl).hostname;
    const today = new Date().toDateString();
    
    // Get existing data
    const result = await chrome.storage.local.get(['timeData', 'categories']);
    const timeData = result.timeData || {};
    const categories = result.categories || {};
    
    // Initialize today's data if not exists
    if (!timeData[today]) {
      timeData[today] = {};
    }
    
    // Add time spent
    if (!timeData[today][domain]) {
      timeData[today][domain] = {
        time: 0,
        visits: 0,
        category: getCategoryForDomain(domain, categories),
        url: currentUrl
      };
    }
    
    timeData[today][domain].time += timeSpent;
    timeData[today][domain].visits += 1;
    
    // Save data
    await chrome.storage.local.set({ timeData });
    
    console.log(`Tracked ${timeSpent}ms on ${domain}`);
  } catch (error) {
    console.error('Error stopping tracking:', error);
  }
  
  currentTabId = null;
  currentUrl = '';
  startTime = null;
}

function getCategoryForDomain(domain, categories) {
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    if (categoryData.domains.some(d => domain.includes(d))) {
      return categoryName;
    }
  }
  return 'Other';
}

// Set idle detection to 30 seconds
chrome.idle.setDetectionInterval(30);