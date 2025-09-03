// Content script for roof measurement on map platforms
class RoofMeasurementTool {
    constructor() {
        this.isActive = false;
        this.measurementPoints = [];
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.scale = null;
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
            min-width: 200px;
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
            <div id="current-measurements" style="margin-top: 8px; font-size: 12px; color: #666;">
                Points: <span id="point-count">0</span>
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

        // Bind panel buttons
        document.getElementById('finish-measurement').addEventListener('click', () => this.finishMeasurement());
        document.getElementById('clear-measurement').addEventListener('click', () => this.clearMeasurement());
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
            const match = scaleText.match(/(\\d+)\\s*(m|ft|km|mi)/);
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
        // This is a simplified estimation
        const viewportWidth = window.innerWidth;
        const estimatedRealWorldWidth = this.scale ? this.scale.value * 10 : 500; // feet
        return viewportWidth / estimatedRealWorldWidth;
    }

    estimateRoofPitch() {
        // Default pitch estimation - could be enhanced with shadow analysis
        return { rise: 6, run: 12 }; // 6:12 pitch (common residential)
    }

    sendMeasurementsToPopup(measurements) {
        chrome.runtime.sendMessage({
            action: 'measurementComplete',
            data: measurements
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
