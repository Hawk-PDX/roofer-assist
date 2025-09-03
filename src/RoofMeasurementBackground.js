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
                    sendResponse({ status: 'received' });
                    break;

                case 'saveMeasurement':
                    await this.saveMeasurement(request.data);
                    sendResponse({ status: 'saved' });
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

        // Optionally, try to enhance with additional data
        try {
            const location = await this.extractLocationFromTab(sender.tab);
            if (location) {
                const buildingData = await this.fetchBuildingData(location);
                if (buildingData) {
                    enhancedData.buildingData = buildingData;
                    await this.saveMeasurement(enhancedData);
                }
            }
        } catch (error) {
            console.log('Could not enhance with building data:', error);
        }
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

    async extractLocationFromTab(tab) {
        if (!tab || !tab.url) return null;

        try {
            // Extract coordinates from Google Maps URL
            const googleMapsMatch = tab.url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (googleMapsMatch) {
                return {
                    lat: parseFloat(googleMapsMatch[1]),
                    lng: parseFloat(googleMapsMatch[2])
                };
            }

            // Extract from Bing Maps URL
            const bingMapsMatch = tab.url.match(/cp=(-?\d+\.\d+)~(-?\d+\.\d+)/);
            if (bingMapsMatch) {
                return {
                    lat: parseFloat(bingMapsMatch[1]),
                    lng: parseFloat(bingMapsMatch[2])
                };
            }
        } catch (error) {
            console.error('Error extracting location:', error);
        }

        return null;
    }

    async fetchBuildingData(location) {
        // This is a placeholder for integration with building data services
        // In a real implementation, you might integrate with:

        try {
            // Example: County assessor data
            // const assessorData = await this.fetchAssessorData(location);

            // Example: Building footprint data
            // const footprintData = await this.fetchBuildingFootprint(location);

            // Example: Satellite imagery analysis
            // const imageAnalysis = await this.analyzeSatelliteImagery(location);

            // For now, return null (no additional data available)
            return null;
        } catch (error) {
            console.error('Error fetching building data:', error);
            return null;
        }
    }

    async enhanceWithBuildingData(location) {
        try {
            const buildingData = await this.fetchBuildingData(location);

            if (buildingData) {
                return {
                    hasData: true,
                    yearBuilt: buildingData.yearBuilt,
                    buildingType: buildingData.buildingType,
                    roofMaterial: buildingData.roofMaterial,
                    lastRoofReplacement: buildingData.lastRoofReplacement
                };
            }
        } catch (error) {
            console.error('Error enhancing with building data:', error);
        }

        return { hasData: false };
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
        // Open popup (this is handled automatically by manifest)
        // This could be used for additional logic if needed
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
            iconUrl: 'icon48.png',
            title: 'Roof Measurement Tool Installed',
            message: 'Navigate to Google Maps or Bing Maps to start measuring roofs!'
        });
    }

    onUpdate(previousVersion) {
        // Handle extension updates
        console.log(`Updated from version ${previousVersion}`);

        // Could add migration logic here if needed
        this.migrateSettings(previousVersion);
    }

    async migrateSettings(previousVersion) {
        // Placeholder for settings migration between versions
        try {
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};

            // Example migration logic
            if (!settings.version || settings.version < '1.1.0') {
                settings.version = '1.1.0';
                settings.enhancedAccuracy = true;
                await chrome.storage.local.set({ settings });
            }
        } catch (error) {
            console.error('Error migrating settings:', error);
        }
    }

    // Utility methods for future enhancements
    async calculateRoofComplexity(measurementPoints) {
        // Analyze the shape complexity to provide better estimates
        const complexity = this.analyzeShapeComplexity(measurementPoints);
        return complexity;
    }

    analyzeShapeComplexity(points) {
        if (points.length <= 4) return 'simple';
        if (points.length <= 8) return 'moderate';
        return 'complex';
    }

    async estimateReplacementCost(roofData) {
        // More sophisticated cost estimation
        const baseCost = roofData.squares * 200; // Base cost per square
        const complexityMultiplier = roofData.complexity === 'complex' ? 1.3 : 1.1;
        const locationMultiplier = await this.getLocationCostMultiplier(roofData.location);

        return baseCost * complexityMultiplier * locationMultiplier;
    }

    async getLocationCostMultiplier(location) {
        // This could integrate with cost-of-living data by location
        return 1.0; // Default multiplier
    }
}

// Initialize the background service
new RoofMeasurementBackground();