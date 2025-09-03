// Content script for roof measurement on map platforms
class RoofMeasurementTool {
    constructor() {
        this.isActive = false;
        this.measurementPoints = [];
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.scale = null;
        this.roofType = 'gable'; // Default roof type
        this.constructionYear = null;
        this.selectedPitch = { rise: 6, run: 12 }; // Default 6:12 pitch
        this.materialType = 'asphalt'; // Default material type
        this.measurements = null;
        this.storage = null;
        this.initializeStorage();
        this.initializeOverlay();
        this.bindEvents();
    }

    initializeOverlay() {
        // Create measurement overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'roof-measurement-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 10000;
            display: none;
        `;

        // Create canvas for drawing measurements
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            pointer-events: auto;
        `;

        this.overlay.appendChild(this.canvas);
        document.body.appendChild(this.overlay);

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Create measurement info panel
        this.createInfoPanel();
    }

    async initializeStorage() {
        this.storage = await import('localforage');
        await this.storage.config({
            name: 'RoofMeasurementTool',
            storeName: 'measurements'
        });
    }

    createInfoPanel() {
        const panel = document.createElement('div');
        panel.id = 'measurement-info-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            min-width: 300px;
            display: none;
            z-index: 10001;
        `;

        panel.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; color: #1a73e8;">
                📐 Roof Measurement
            </div>
            <div id="measurement-instructions">
                Click on roof corners to measure. Press ESC to cancel.
            </div>
            <div style="margin-top: 12px;">
                <label style="display: block; margin-bottom: 8px;">
                    Roof Type:
                    <select id="roof-type" style="margin-left: 8px;">
                        <option value="gable">Gable</option>
                        <option value="hip">Hip</option>
                        <option value="shed">Shed</option>
                        <option value="flat">Flat</option>
                    </select>
                </label>
                <label style="display: block; margin-bottom: 8px;">
                    Roof Pitch:
                    <select id="roof-pitch" style="margin-left: 8px;">
                        <option value="0,12">0:12 (Flat)</option>
                        <option value="4,12">4:12 (Low)</option>
                        <option value="6,12" selected>6:12 (Medium)</option>
                        <option value="8,12">8:12 (Steep)</option>
                        <option value="12,12">12:12 (Very Steep)</option>
                    </select>
                </label>
                <label style="display: block; margin-bottom: 8px;">
                    Construction Year:
                    <input type="number" id="construction-year" 
                           style="width: 80px; margin-left: 8px;"
                           placeholder="YYYY"
                           max="${new Date().getFullYear()}"
                           min="1900">
                </label>
                <label style="display: block; margin-bottom: 8px;">
                    Material Type:
                    <select id="material-type" style="margin-left: 8px;">
                        <option value="asphalt">Asphalt (Basic)</option>
                        <option value="architectural">Architectural</option>
                        <option value="premium">Premium</option>
                    </select>
                </label>
            </div>
            <div id="current-measurements" style="margin-top: 12px; font-size: 12px; color: #666;">
                Points: <span id="point-count">0</span><br>
                Ground Area: <span id="ground-area">-</span><br>
                Roof Area: <span id="roof-area">-</span><br>
                Shingle Squares: <span id="shingle-squares">-</span><br>
                Estimated Cost: <span id="estimated-cost">-</span>
            </div>
            <div style="margin-top: 12px;">
                <button id="finish-measurement" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-right: 8px;
                ">Finish</button>
                <button id="export-measurement" style="
                    background: #34a853;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-right: 8px;
                ">Export</button>
                <button id="clear-measurement" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">Clear</button>
            </div>
        `;

        document.body.appendChild(panel);
        this.infoPanel = panel;

        // Bind panel elements
        document.getElementById('finish-measurement').addEventListener('click', () => this.finishMeasurement());
        document.getElementById('clear-measurement').addEventListener('click', () => this.clearMeasurement());
        document.getElementById('export-measurement').addEventListener('click', () => this.exportMeasurements());
        document.getElementById('roof-type').addEventListener('change', (e) => this.roofType = e.target.value);
        document.getElementById('roof-pitch').addEventListener('change', (e) => {
            const [rise, run] = e.target.value.split(',').map(Number);
            this.selectedPitch = { rise, run };
        });
        document.getElementById('construction-year').addEventListener('change', (e) => {
            this.constructionYear = parseInt(e.target.value);
        });
        document.getElementById('material-type').addEventListener('change', (e) => {
            this.materialType = e.target.value;
            this.updateMeasurements();
        });
    }

    bindEvents() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'startMeasurement') {
                this.startMeasurement();
                sendResponse({ status: 'started' });
            } else if (request.action === 'stopMeasurement') {
                this.stopMeasurement();
                sendResponse({ status: 'stopped' });
            }
        });

        // Canvas click handler
        this.canvas.addEventListener('click', (e) => {
            if (this.isActive) {
                this.addMeasurementPoint(e);
            }
        });

        // Escape key to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.stopMeasurement();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.redrawMeasurements();
    }

    startMeasurement() {
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.infoPanel.style.display = 'block';
        this.canvas.style.cursor = 'crosshair';

        // Try to detect the current scale from the map
        this.detectMapScale();
    }

    stopMeasurement() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.infoPanel.style.display = 'none';
        this.clearMeasurement();
    }

    addMeasurementPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.measurementPoints.push({ x, y });
        this.updatePointCount();
        this.redrawMeasurements();

        // Auto-finish if we have 4+ points (assuming rectangular roof)
        if (this.measurementPoints.length >= 4) {
            setTimeout(() => this.finishMeasurement(), 500);
        }
    }

    clearMeasurement() {
        this.measurementPoints = [];
        this.updatePointCount();
        this.redrawMeasurements();
    }

    updatePointCount() {
        const pointCountEl = document.getElementById('point-count');
        if (pointCountEl) {
            pointCountEl.textContent = this.measurementPoints.length;
        }
    }

    redrawMeasurements() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.measurementPoints.length === 0) return;

        // Draw measurement points
        this.ctx.fillStyle = '#1a73e8';
        this.ctx.strokeStyle = '#1a73e8';
        this.ctx.lineWidth = 2;

        // Draw points
        this.measurementPoints.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            this.ctx.fill();

            // Label points
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText((index + 1).toString(), point.x, point.y + 4);
            this.ctx.fillStyle = '#1a73e8';
        });

        // Draw lines between points
        if (this.measurementPoints.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.measurementPoints[0].x, this.measurementPoints[0].y);

            for (let i = 1; i < this.measurementPoints.length; i++) {
                this.ctx.lineTo(this.measurementPoints[i].x, this.measurementPoints[i].y);
            }

            // Close the polygon if we have 3+ points
            if (this.measurementPoints.length >= 3) {
                this.ctx.closePath();
            }

            this.ctx.strokeStyle = 'rgba(26, 115, 232, 0.7)';
            this.ctx.stroke();

            // Fill the area
            if (this.measurementPoints.length >= 3) {
                this.ctx.fillStyle = 'rgba(26, 115, 232, 0.2)';
                this.ctx.fill();
            }
        }
    }

    detectMapScale() {
        // Try to detect scale from Google Maps
        const scaleElement = document.querySelector('[data-value]');
        if (scaleElement) {
            const scaleText = scaleElement.textContent;
            const match = scaleText.match(/(\d+)\s*(m|ft|km|mi)/);
            if (match) {
                this.scale = {
                    value: parseInt(match[1]),
                    unit: match[2]
                };
            }
        }

        // Fallback: estimate scale based on zoom level
        if (!this.scale) {
            this.scale = { value: 50, unit: 'ft' }; // Default estimate
        }
    }

    finishMeasurement() {
        if (this.measurementPoints.length < 3) {
            alert('Please mark at least 3 points to measure the roof area.');
            return;
        }

        const measurements = this.calculateMeasurements();
        this.sendMeasurementsToPopup(measurements);
        this.stopMeasurement();
    }

    calculateMeasurements() {
        // Calculate area using the shoelace formula
        const points = this.measurementPoints;
        let area = 0;

        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;

        // Convert pixel area to real-world area
        const pixelsPerUnit = this.estimatePixelsPerUnit();
        const realWorldArea = area / (pixelsPerUnit * pixelsPerUnit);

        // Calculate roof measurements
        const groundAreaSqFt = realWorldArea;
        const pitch = this.estimateRoofPitch();
        const pitchMultiplier = Math.sqrt(1 + Math.pow(pitch.rise / pitch.run, 2));
        const roofAreaSqFt = groundAreaSqFt * pitchMultiplier;
        const shingleSquares = roofAreaSqFt / 100; // 1 square = 100 sq ft

        return {
            groundArea: Math.round(groundAreaSqFt),
            roofArea: Math.round(roofAreaSqFt),
            pitch: pitch,
            shingleSquares: Math.ceil(shingleSquares * 10) / 10, // Round up to nearest 0.1
            pixelsPerUnit: pixelsPerUnit
        };
    }

    estimatePixelsPerUnit() {
        // This is a simplified estimation - in a real implementation,
        // you'd need more sophisticated scale detection
        const viewportWidth = window.innerWidth;
        const estimatedRealWorldWidth = this.scale ? this.scale.value * 10 : 500; // feet
        return viewportWidth / estimatedRealWorldWidth;
    }

    estimateRoofPitch() {
        return this.selectedPitch;
    }

    getMaterialCost(squares) {
        const costs = {
            asphalt: 150,
            architectural: 200,
            premium: 350
        };
        return squares * costs[this.materialType];
    }

    getRoofAge() {
        if (!this.constructionYear) return 'Unknown';
        const age = new Date().getFullYear() - this.constructionYear;
        if (age <= 5) return 'New';
        if (age <= 15) return 'Good';
        if (age <= 25) return 'Aging';
        return 'Consider replacement';
    }

    updateMeasurements() {
        if (!this.measurements) return;

        const groundAreaEl = document.getElementById('ground-area');
        const roofAreaEl = document.getElementById('roof-area');
        const squaresEl = document.getElementById('shingle-squares');
        const costEl = document.getElementById('estimated-cost');

        if (groundAreaEl) groundAreaEl.textContent = `${this.measurements.groundArea} sq ft`;
        if (roofAreaEl) roofAreaEl.textContent = `${this.measurements.roofArea} sq ft`;
        if (squaresEl) squaresEl.textContent = `${this.measurements.shingleSquares}`;
        if (costEl) {
            const cost = this.getMaterialCost(this.measurements.shingleSquares);
            costEl.textContent = `$${cost.toLocaleString()}`;
        }
    }

    async saveMeasurement(measurements) {
        if (!this.storage) return;

        const measurement = {
            ...measurements,
            timestamp: new Date().toISOString(),
            roofType: this.roofType,
            constructionYear: this.constructionYear,
            materialType: this.materialType,
            age: this.getRoofAge(),
            cost: this.getMaterialCost(measurements.shingleSquares),
            location: window.location.href
        };

        const measurements_list = await this.storage.getItem('measurements_list') || [];
        measurements_list.push(measurement);

        // Keep only last 50 measurements
        if (measurements_list.length > 50) {
            measurements_list.shift();
        }

        await this.storage.setItem('measurements_list', measurements_list);
    }

    exportMeasurements() {
        if (!this.measurements) {
            alert('No measurements to export');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            location: window.location.href,
            roofType: this.roofType,
            constructionYear: this.constructionYear,
            age: this.getRoofAge(),
            measurements: this.measurements,
            materialType: this.materialType,
            estimatedCost: this.getMaterialCost(this.measurements.shingleSquares)
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roof-measurement-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async sendMeasurementsToPopup(measurements) {
        this.measurements = measurements;
        this.updateMeasurements();
        await this.saveMeasurement(measurements);

        chrome.runtime.sendMessage({
            action: 'measurementComplete',
            data: {
                ...measurements,
                roofType: this.roofType,
                constructionYear: this.constructionYear,
                age: this.getRoofAge(),
                materialType: this.materialType,
                estimatedCost: this.getMaterialCost(measurements.shingleSquares)
            }
        });
    }
}

// Initialize the measurement tool
const roofTool = new RoofMeasurementTool();

// Inject CSS for better visual integration
const style = document.createElement('style');
style.textContent = `
    #roof-measurement-overlay {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #roof-measurement-overlay canvas {
        background: transparent;
    }
    
    .measurement-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10002;
    }
`;
document.head.appendChild(style);