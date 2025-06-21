document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function loadDashboardData() {
  try {
    const result = await chrome.storage.local.get(['timeData', 'categories']);
    const timeData = result.timeData || {};
    const categories = result.categories || {};
    
    const today = new Date().toDateString();
    const todayData = timeData[today] || {};
    
    updateCurrentDate();
    updateStats(todayData, categories);
    updateTopSites(todayData);
    updateCategoriesDisplay(todayData, categories);
    updateTimeChart(todayData, categories);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateCurrentDate() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function updateStats(todayData, categories) {
  let totalTime = 0;
  let sitesVisited = 0;
  let productiveTime = 0;
  
  for (const [domain, data] of Object.entries(todayData)) {
    totalTime += data.time;
    sitesVisited++;
    
    if (data.category === 'Productive') {
      productiveTime += data.time;
    }
  }
  
  const focusScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  
  document.getElementById('totalTime').textContent = formatTime(totalTime);
  document.getElementById('sitesVisited').textContent = sitesVisited;
  document.getElementById('focusScore').textContent = `${focusScore}%`;
}

function updateTopSites(todayData) {
  const sitesContainer = document.getElementById('topSites');
  
  // Sort sites by time spent
  const sortedSites = Object.entries(todayData)
    .sort(([,a], [,b]) => b.time - a.time)
    .slice(0, 5);
  
  if (sortedSites.length === 0) {
    sitesContainer.innerHTML = `
      <div class="empty-state">
        <p>Start browsing to see your activity</p>
      </div>
    `;
    return;
  }
  
  sitesContainer.innerHTML = sortedSites.map(([domain, data]) => `
    <div class="site-item">
      <div class="site-info">
        <div class="site-domain">${domain}</div>
        <div class="site-category">${data.category}</div>
      </div>
      <div class="site-time">${formatTime(data.time)}</div>
      <div class="category-tag" style="background-color: ${getCategoryColor(data.category)}20; color: ${getCategoryColor(data.category)}">
        ${data.category}
      </div>
    </div>
  `).join('');
}

function updateCategoriesDisplay(todayData, categories) {
  const categoriesContainer = document.getElementById('categoriesList');
  
  // Calculate time per category
  const categoryTimes = {};
  for (const categoryName of Object.keys(categories)) {
    categoryTimes[categoryName] = 0;
  }
  
  for (const [domain, data] of Object.entries(todayData)) {
    categoryTimes[data.category] = (categoryTimes[data.category] || 0) + data.time;
  }
  
  // Sort categories by time
  const sortedCategories = Object.entries(categoryTimes)
    .filter(([,time]) => time > 0)
    .sort(([,a], [,b]) => b - a);
  
  if (sortedCategories.length === 0) {
    categoriesContainer.innerHTML = `
      <div class="empty-state">
        <p>No activity recorded yet</p>
      </div>
    `;
    return;
  }
  
  categoriesContainer.innerHTML = sortedCategories.map(([categoryName, time]) => `
    <div class="category-item">
      <div class="category-info">
        <div class="category-color" style="background-color: ${categories[categoryName]?.color || '#6B7280'}"></div>
        <div class="category-name">${categoryName}</div>
      </div>
      <div class="category-time" style="color: ${categories[categoryName]?.color || '#6B7280'}">${formatTime(time)}</div>
    </div>
  `).join('');
}

function updateTimeChart(todayData, categories) {
  const ctx = document.getElementById('timeChart').getContext('2d');
  
  // Calculate time per category
  const categoryTimes = {};
  const categoryColors = {};
  
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    categoryTimes[categoryName] = 0;
    categoryColors[categoryName] = categoryData.color;
  }
  
  for (const [domain, data] of Object.entries(todayData)) {
    categoryTimes[data.category] = (categoryTimes[data.category] || 0) + data.time;
  }
  
  // Filter out categories with no time
  const chartData = Object.entries(categoryTimes)
    .filter(([,time]) => time > 0)
    .sort(([,a], [,b]) => b - a);
  
  if (chartData.length === 0) {
    // Show empty state
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 300, 200);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No data to display', 150, 100);
    return;
  }
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.map(([name]) => name),
      datasets: [{
        data: chartData.map(([,time]) => Math.round(time / 60000)), // Convert to minutes
        backgroundColor: chartData.map(([name]) => categoryColors[name]),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 11
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const minutes = context.parsed;
              return `${context.label}: ${formatTime(minutes * 60000)}`;
            }
          }
        }
      },
      cutout: '60%',
      animation: {
        animateRotate: true,
        duration: 1000
      }
    }
  });
}

function formatTime(milliseconds) {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getCategoryColor(categoryName) {
  const defaultColors = {
    'Productive': '#10B981',
    'Social': '#F59E0B',
    'Entertainment': '#EF4444',
    'Shopping': '#8B5CF6',
    'News': '#3B82F6',
    'Other': '#6B7280'
  };
  return defaultColors[categoryName] || '#6B7280';
}