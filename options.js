document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  updateDataStats();
});

function setupEventListeners() {
  // Category management
  document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
  
  // Domain management
  document.getElementById('addDomainBtn').addEventListener('click', addDomain);
  
  // Data management
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  document.getElementById('resetDataBtn').addEventListener('click', () => showConfirmModal(
    'Reset All Data',
    'This will permanently delete all your tracking data. This action cannot be undone.',
    resetAllData
  ));
  
  // Settings
  document.getElementById('idleTime').addEventListener('change', updateIdleTime);
  document.getElementById('enableNotifications').addEventListener('change', updateNotificationSettings);
  
  // Modal
  document.getElementById('modalCancel').addEventListener('click', hideConfirmModal);
  document.getElementById('modalConfirm').addEventListener('click', executeConfirmAction);
}

let confirmAction = null;

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['categories', 'settings']);
    const categories = result.categories || {};
    const settings = result.settings || { idleTime: 30, enableNotifications: false };
    
    displayCategories(categories);
    populateCategorySelect(categories);
    displayDomains(categories);
    
    document.getElementById('idleTime').value = settings.idleTime;
    document.getElementById('enableNotifications').checked = settings.enableNotifications;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function displayCategories(categories) {
  const container = document.getElementById('categoriesList');
  
  container.innerHTML = Object.entries(categories).map(([name, data]) => `
    <div class="category-item" data-category="${name}">
      <div class="category-info">
        <div class="category-color" style="background-color: ${data.color}"></div>
        <div>
          <div class="category-name">${name}</div>
          <div class="category-domains">${data.domains.length} domains</div>
        </div>
      </div>
      <div class="category-actions">
        ${name !== 'Other' ? `<button class="btn btn-danger btn-small" onclick="deleteCategory('${name}')">Delete</button>` : ''}
      </div>
    </div>
  `).join('');
}

function populateCategorySelect(categories) {
  const select = document.getElementById('domainCategory');
  select.innerHTML = Object.keys(categories).map(name => 
    `<option value="${name}">${name}</option>`
  ).join('');
}

function displayDomains(categories) {
  const container = document.getElementById('domainsList');
  const domains = [];
  
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    for (const domain of categoryData.domains) {
      domains.push({ domain, category: categoryName, color: categoryData.color });
    }
  }
  
  domains.sort((a, b) => a.domain.localeCompare(b.domain));
  
  container.innerHTML = domains.map(item => `
    <div class="domain-item">
      <div class="domain-info">
        <div class="domain-name">${item.domain}</div>
        <div class="domain-category" style="background-color: ${item.color}20; color: ${item.color}">
          ${item.category}
        </div>
      </div>
      <button class="btn btn-danger btn-small" onclick="removeDomain('${item.domain}', '${item.category}')">Remove</button>
    </div>
  `).join('');
}

async function addCategory() {
  const nameInput = document.getElementById('newCategoryName');
  const colorInput = document.getElementById('newCategoryColor');
  
  const name = nameInput.value.trim();
  const color = colorInput.value;
  
  if (!name) {
    alert('Please enter a category name');
    return;
  }
  
  try {
    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || {};
    
    if (categories[name]) {
      alert('Category already exists');
      return;
    }
    
    categories[name] = {
      color: color,
      domains: []
    };
    
    await chrome.storage.local.set({ categories });
    
    nameInput.value = '';
    colorInput.value = '#3B82F6';
    
    await loadSettings();
  } catch (error) {
    console.error('Error adding category:', error);
    alert('Error adding category');
  }
}

async function deleteCategory(categoryName) {
  if (categoryName === 'Other') {
    alert('Cannot delete the "Other" category');
    return;
  }
  
  showConfirmModal(
    'Delete Category',
    `Are you sure you want to delete the "${categoryName}" category? All domains in this category will be moved to "Other".`,
    async () => {
      try {
        const result = await chrome.storage.local.get(['categories']);
        const categories = result.categories || {};
        
        // Move domains to "Other" category
        if (categories[categoryName] && categories[categoryName].domains.length > 0) {
          categories.Other.domains.push(...categories[categoryName].domains);
        }
        
        delete categories[categoryName];
        
        await chrome.storage.local.set({ categories });
        await loadSettings();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
      }
    }
  );
}

async function addDomain() {
  const domainInput = document.getElementById('newDomain');
  const categorySelect = document.getElementById('domainCategory');
  
  const domain = domainInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  
  if (!domain) {
    alert('Please enter a domain');
    return;
  }
  
  // Basic domain validation
  if (!domain.includes('.') || domain.includes(' ')) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  try {
    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || {};
    
    // Check if domain already exists
    for (const [catName, catData] of Object.entries(categories)) {
      if (catData.domains.includes(domain)) {
        alert(`Domain already exists in category "${catName}"`);
        return;
      }
    }
    
    if (!categories[category]) {
      alert('Selected category does not exist');
      return;
    }
    
    categories[category].domains.push(domain);
    
    await chrome.storage.local.set({ categories });
    
    domainInput.value = '';
    
    await loadSettings();
  } catch (error) {
    console.error('Error adding domain:', error);
    alert('Error adding domain');
  }
}

async function removeDomain(domain, category) {
  try {
    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || {};
    
    if (categories[category]) {
      categories[category].domains = categories[category].domains.filter(d => d !== domain);
      await chrome.storage.local.set({ categories });
      await loadSettings();
    }
  } catch (error) {
    console.error('Error removing domain:', error);
    alert('Error removing domain');
  }
}

async function exportData() {
  try {
    const result = await chrome.storage.local.get(['timeData', 'categories']);
    const data = {
      timeData: result.timeData || {},
      categories: result.categories || {},
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data');
  }
}

async function resetAllData() {
  try {
    await chrome.storage.local.remove(['timeData']);
    await updateDataStats();
    alert('All tracking data has been reset');
  } catch (error) {
    console.error('Error resetting data:', error);
    alert('Error resetting data');
  }
}

async function updateIdleTime() {
  const idleTime = parseInt(document.getElementById('idleTime').value);
  
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    settings.idleTime = idleTime;
    
    await chrome.storage.local.set({ settings });
    
    // Update idle detection interval
    chrome.idle.setDetectionInterval(idleTime);
  } catch (error) {
    console.error('Error updating idle time:', error);
  }
}

async function updateNotificationSettings() {
  const enableNotifications = document.getElementById('enableNotifications').checked;
  
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    settings.enableNotifications = enableNotifications;
    
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}

async function updateDataStats() {
  try {
    const result = await chrome.storage.local.get(['timeData']);
    const timeData = result.timeData || {};
    
    let totalDays = 0;
    let totalSites = 0;
    let totalTime = 0;
    
    for (const [date, dayData] of Object.entries(timeData)) {
      totalDays++;
      totalSites += Object.keys(dayData).length;
      for (const siteData of Object.values(dayData)) {
        totalTime += siteData.time;
      }
    }
    
    const statsContainer = document.getElementById('dataStats');
    statsContainer.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">Days Tracked</span>
        <span class="stat-value">${totalDays}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Unique Sites</span>
        <span class="stat-value">${totalSites}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Time Tracked</span>
        <span class="stat-value">${formatTime(totalTime)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Storage Used</span>
        <span class="stat-value">${JSON.stringify(timeData).length} bytes</span>
      </div>
    `;
  } catch (error) {
    console.error('Error updating data stats:', error);
  }
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

function showConfirmModal(title, message, action) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('confirmModal').classList.add('show');
  confirmAction = action;
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('show');
  confirmAction = null;
}

function executeConfirmAction() {
  if (confirmAction) {
    confirmAction();
  }
  hideConfirmModal();
}

// Make functions available globally for onclick handlers
window.deleteCategory = deleteCategory;
window.removeDomain = removeDomain;