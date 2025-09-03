// Popup script for roof measurement extension
class RoofMeasurementPopup {
    constructor() {
        this.isMapPage = false;
        this.currentMeasurements = null;
        this.initializeUI();
        this.checkCurrentPage();
        this.bindEvents();
    }

    initializeUI() {
        this.elements = {
            status: document.getElementById('status'),
            startBtn: document.getElementById('startMeasurement'),
            toggleAdvanced: document.getElementById('toggleAdvanced'),
            advancedOptions: document.getElementById('advancedOptions'),
            results: document.getElementById('results'),
            // Result elements
            groundArea: document.getElementById('groundArea'),
            roofArea: document.getElementById('roofArea'),
            calculatedPitch: document.getElementById('calculatedPitch'),
            shingleSquares: document.getElementById('shingleSquares'),
            roofAge: document.getElementById('roofAge'),
            materialCost: document.getElementById('materialCost'),
            // Input elements
            roofType: document.getElementById('roofType'),
            roofPitch: document.getElementById('roofPitch'),
            constructionYear: document.getElementById('constructionYear'),
            exportBtn: document.getElementById('exportBtn'),
            saveBtn: document.getElementById('saveBtn')
        };
    }

    async checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url;

            this.isMapPage = url.includes('maps.google.com') || url.includes('maps.bing.com');

            if (this.isMapPage) {
                this.updateStatus('Ready to measure - click "Start" below', 'info');
                this.elements.startBtn.disabled = false;
            } else {
                this.updateStatus('Navigate to Google Maps or Bing Maps first', 'error');
                this.elements.startBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error checking current page:', error);
            this.updateStatus('Unable to detect page - ensure you\'re on a maps site', 'error');
        }
    }

    bindEvents() {
        // Start measurement button
        this.elements.startBtn.addEventListener('click', () => {
            this.startMeasurement();
        });

        // Advanced options toggle
        this.elements.toggleAdvanced.addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });

        // Listen for measurement completion from content script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'measurementComplete') {
                this.handleMeasurementComplete(request.data);
            }
        });

        // Input change handlers
        this.elements.roofPitch.addEventListener('change', () => {
            if (this.currentMeasurements) {
                this.recalculateWithNewPitch();
            }
        });

        this.elements.constructionYear.addEventListener('input', () => {
            if (this.currentMeasurements) {
                this.updateRoofAge();
            }
        });

        // Export button
        this.elements.exportBtn.addEventListener('click', () => {
            this.exportMeasurements();
        });

        // Save button
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveMeasurements();
        });
    }

    async startMeasurement() {
        try {
            this.updateStatus('Measurement mode activated', 'info');
            this.elements.startBtn.textContent = 'Measuring...';
            this.elements.startBtn.disabled = true;

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'startMeasurement'
            });

            if (response && response.status === 'started') {
                this.updateStatus('Click roof corners on the map to measure', 'info');
            }
        } catch (error) {
            console.error('Error starting measurement:', error);
            this.updateStatus('Error: Make sure you\'re on a supported map site', 'error');
            this.resetMeasurementButton();
        }
    }

    handleMeasurementComplete(measurements) {
        this.currentMeasurements = measurements;
        this.displayResults(measurements);
        this.resetMeasurementButton();
        this.updateStatus('Measurement complete!', 'info');
    }

    displayResults(measurements) {
        // Apply user-selected pitch if different from estimated
        const selectedPitch = this.elements.roofPitch.value.split(':');
        const userPitch = {
            rise: parseInt(selectedPitch[0]),
            run: parseInt(selectedPitch[1])
        };

        // Recalculate roof area with user-selected pitch
        const pitchMultiplier = Math.sqrt(1 + Math.pow(userPitch.rise / userPitch.run, 2));
        const adjustedRoofArea = measurements.groundArea * pitchMultiplier;
        const adjustedShingleSquares = adjustedRoofArea / 100;

        // Update display values
        this.elements.groundArea.textContent = `${measurements.groundArea.toLocaleString()} sq ft`;
        this.elements.roofArea.textContent = `${Math.round(adjustedRoofArea).toLocaleString()} sq ft`;
        this.elements.calculatedPitch.textContent = `${userPitch.rise}:${userPitch.run}`;
        this.elements.shingleSquares.textContent = `${Math.ceil(adjustedShingleSquares * 10) / 10} squares`;

        // Calculate material cost estimate
        const materialCost = this.calculateMaterialCost(adjustedShingleSquares);
        this.elements.materialCost.textContent = materialCost;

        // Update roof age
        this.updateRoofAge();

        // Show results
        this.elements.results.style.display = 'block';
    }

    recalculateWithNewPitch() {
        if (!this.currentMeasurements) return;

        const selectedPitch = this.elements.roofPitch.value.split(':');
        const userPitch = {
            rise: parseInt(selectedPitch[0]),
            run: parseInt(selectedPitch[1])
        };

        const pitchMultiplier = Math.sqrt(1 + Math.pow(userPitch.rise / userPitch.run, 2));
        const adjustedRoofArea = this.currentMeasurements.groundArea * pitchMultiplier;
        const adjustedShingleSquares = adjustedRoofArea / 100;

        this.elements.roofArea.textContent = `${Math.round(adjustedRoofArea).toLocaleString()} sq ft`;
        this.elements.calculatedPitch.textContent = `${userPitch.rise}:${userPitch.run}`;
        this.elements.shingleSquares.textContent = `${Math.ceil(adjustedShingleSquares * 10) / 10} squares`;

        const materialCost = this.calculateMaterialCost(adjustedShingleSquares);
        this.elements.materialCost.textContent = materialCost;
    }

    calculateMaterialCost(squares) {
        // Rough cost estimates per square of shingles (2024 prices)
        const costPerSquare = {
            'asphalt': 150,      // $100-200 per square
            'architectural': 200, // $150-250 per square
            'premium': 350       // $250-450 per square
        };

        const baseCost = squares * costPerSquare.architectural;
        const wasteFactor = 1.1; // 10% waste allowance
        const totalCost = baseCost * wasteFactor;

        return `$${Math.round(totalCost).toLocaleString()} - $${Math.round(totalCost * 1.3).toLocaleString()}`;
    }

    updateRoofAge() {
        const constructionYear = parseInt(this.elements.constructionYear.value);
        if (constructionYear && constructionYear > 1900 && constructionYear <= new Date().getFullYear()) {
            const currentYear = new Date().getFullYear();
            const roofAge = currentYear - constructionYear;

            let ageCategory = '';
            if (roofAge < 5) ageCategory = ' (New)';
            else if (roofAge < 15) ageCategory = ' (Good)';
            else if (roofAge < 25) ageCategory = ' (Aging)';
            else ageCategory = ' (Consider replacement)';

            this.elements.roofAge.textContent = `${roofAge} years${ageCategory}`;
        } else {
            this.elements.roofAge.textContent = 'Unknown';
        }
    }

    toggleAdvancedOptions() {
        const isVisible = this.elements.advancedOptions.style.display === 'block';
        this.elements.advancedOptions.style.display = isVisible ? 'none' : 'block';
        this.elements.toggleAdvanced.textContent = isVisible ? 'Advanced Options ▼' : 'Advanced Options ▲';
    }

    updateStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
    }

    resetMeasurementButton() {
        this.elements.startBtn.textContent = 'Start Roof Measurement';
        this.elements.startBtn.disabled = !this.isMapPage;
    }

    // Export measurements
    exportMeasurements() {
        if (!this.currentMeasurements) return;

        const data = {
            timestamp: new Date().toISOString(),
            groundArea: this.elements.groundArea.textContent,
            roofArea: this.elements.roofArea.textContent,
            pitch: this.elements.calculatedPitch.textContent,
            shingleSquares: this.elements.shingleSquares.textContent,
            estimatedCost: this.elements.materialCost.textContent,
            roofAge: this.elements.roofAge.textContent,
            roofType: this.elements.roofType.value,
            location: 'From Map' // Could be enhanced with actual address
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'roof-measurements.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Save measurements to chrome storage
    async saveMeasurements() {
        if (!this.currentMeasurements) return;

        try {
            const result = await chrome.storage.local.get(['measurements']);
            const measurements = result.measurements || [];
            measurements.push({
                ...this.currentMeasurements,
                roofType: this.elements.roofType.value,
                timestamp: new Date().toISOString()
            });
            await chrome.storage.local.set({ measurements });
            this.updateStatus('Measurement saved!', 'info');
        } catch (error) {
            console.error('Error saving measurement:', error);
            this.updateStatus('Error saving measurement', 'error');
        }
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RoofMeasurementPopup();
});
