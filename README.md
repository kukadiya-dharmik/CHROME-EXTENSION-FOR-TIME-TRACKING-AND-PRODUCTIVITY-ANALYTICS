# ProductivityTracker Chrome Extension

A beautiful and comprehensive Chrome extension for time tracking and productivity analytics.

## Features

### Time Tracking
- Automatic detection of active browser tabs
- Precise time tracking with idle detection
- Local storage for privacy (no external servers)
- Background monitoring without impacting performance

### Website Categorization
- Default categories: Productive, Social, Entertainment, Shopping, News, Other
- Custom category creation with color coding
- Automatic domain categorization
- Easy category management

### Dashboard Analytics
- Beautiful popup interface with real-time statistics
- Interactive pie chart showing time distribution
- Top 5 most visited sites display
- Focus score calculation
- Daily summaries

### Advanced Options
- Comprehensive settings page
- Domain management system
- Data export functionality
- Reset options for fresh starts
- Idle detection customization

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this extension folder
4. The ProductivityTracker icon will appear in your toolbar

## Usage

### Popup Dashboard
Click the extension icon to see:
- Total time spent today
- Number of sites visited
- Your focus score percentage
- Visual time distribution chart
- Top sites with categorization

### Options Page
Right-click the extension icon and select "Options" or click the settings gear in the popup to:
- Add/remove custom categories
- Manage domain categorizations
- Export your data
- Reset tracking data
- Adjust idle detection settings

## Privacy & Security

- All data is stored locally using Chrome's storage API
- No external servers or data transmission
- Complete offline functionality
- Data export available for backup

## Technical Details

- Manifest V3 compatible
- Service worker for background processing
- Chart.js for beautiful visualizations
- Responsive design for all screen sizes
- Modern CSS with gradient themes

## Permissions

- `tabs`: To detect active tab changes
- `activeTab`: To read current tab information
- `storage`: To save tracking data locally
- `idle`: To detect when user is away

## Development

The extension uses vanilla JavaScript, HTML, and CSS for maximum compatibility and performance. No build process required - all files are ready to load directly into Chrome.

## Support

For issues or feature requests, please create an issue in the repository.