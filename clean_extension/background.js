// Background service worker for roof measurement extension
class RoofMeasurementBackground {
    constructor() {
        this.initializeExtension();
        this.bindEvents();
    }

    initializeExtension() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.onFirstInstall();
            } else if (details.reason === 'update') {
                this.onUpdate(details.previousVersion);
            }
        });
    }

    bindEvents() {
        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle extension icon clicks
        chrome.action.onClicked.addListener((tab) => {
            this.handleIconClick(tab);
        });

        // Monitor tab updates to show/hide features based on current site
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.updateExtensionForTab(tab);
            }
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'measurementComplete':
                    await this.handleMeasurementComplete(request.data, sender);
                    break;

                case 'saveMeasurement':
                    await this.saveMeasurement(request.data);
                    break;

                case 'getMeasurementHistory':
                    const history = await this.getMeasurementHistory();
                    sendResponse({ history });
                    break;

                case 'enhanceWithBuildingData':
                    const enhancedData = await this.enhanceWithBuildingData(request.location);
                    sendResponse({ data: enhancedData });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleMeasurementComplete(measurementData, sender) {
        // Auto-save measurement
        const enhancedData = {
            ...measurementData,
            timestamp: new Date().toISOString(),
            tabUrl: sender.tab?.url,
            tabTitle: sender.tab?.title
        };

        await this.saveMeasurement(enhancedData);
    }

    async saveMeasurement(data) {
        try {
            const result = await chrome.storage.local.get(['measurements']);
            const measurements = result.measurements || [];

            measurements.push(data);

            // Keep only last 50 measurements to manage storage
            if (measurements.length > 50) {
                measurements.splice(0, measurements.length - 50);
            }

            await chrome.storage.local.set({ measurements });
        } catch (error) {
            console.error('Error saving measurement:', error);
        }
    }

    async getMeasurementHistory() {
        try {
            const result = await chrome.storage.local.get(['measurements']);
            return result.measurements || [];
        } catch (error) {
            console.error('Error getting measurement history:', error);
            return [];
        }
    }

    async enhanceWithBuildingData(location) {
        // Placeholder for integration with building data services
        return { hasData: false };
    }

    async fetchBuildingData(location) {
        // Placeholder for integration with building data APIs
        return null;
    }

    updateExtensionForTab(tab) {
        const isSupportedSite = tab.url && (
            tab.url.includes('maps.google.com') ||
            tab.url.includes('maps.bing.com')
        );

        // Update extension icon/badge based on whether we're on a supported site
        if (isSupportedSite) {
            chrome.action.setBadgeText({
                text: '📐',
                tabId: tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#1a73e8',
                tabId: tab.id
            });
        } else {
            chrome.action.setBadgeText({
                text: '',
                tabId: tab.id
            });
        }
    }

    handleIconClick(tab) {
        // Open popup (handled automatically by manifest)
    }

    onFirstInstall() {
        // Set up default settings
        chrome.storage.local.set({
            settings: {
                defaultPitch: '6:12',
                units: 'imperial',
                autoSave: true,
                showTips: true
            },
            measurements: []
        });

        // Show welcome notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Roof Measurement Tool Installed',
            message: 'Navigate to Google Maps or Bing Maps to start measuring roofs!'
        });
    }

    onUpdate(previousVersion) {
        console.log(`Updated from version ${previousVersion}`);
    }

    async migrateSettings(previousVersion) {
        // Placeholder for settings migration between versions
    }
}

// Initialize the background service
new RoofMeasurementBackground();
