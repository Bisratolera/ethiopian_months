const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

// --- Data Caching ---
let calendarDataCache = null;

async function loadAndCacheData() {
    try {
        console.log('Loading and caching calendar data...');
        const files = [
            'ethiopic-months.json',
            'liturgical-calendar.json',
            'monthly-saints.json',
            'holidays.json'
        ];
        for (const file of files) {
            const filePath = path.join(__dirname, 'data', file);
            console.log(`Checking file: ${filePath}`);
            await fs.access(filePath); // Throws if file doesn't exist or isn't readable
        }
        // Read all JSON files in parallel for efficiency
        const [monthsData, calendarData, saintsData, holidaysData] = await Promise.all([
            fs.readFile(path.join(__dirname, 'data', 'ethiopic-months.json'), 'utf-8'),
            fs.readFile(path.join(__dirname, 'data', 'liturgical-calendar.json'), 'utf-8'),
            fs.readFile(path.join(__dirname, 'data', 'monthly-saints.json'), 'utf-8'),
            fs.readFile(path.join(__dirname, 'data', 'holidays.json'), 'utf-8')
        ]);

        // Combine the data from the files into a single structured object
        calendarDataCache = {
            months: JSON.parse(monthsData).amharic,
            dayNames: JSON.parse(monthsData).days,
            liturgicalCalendar: JSON.parse(calendarData),
            recurringSaints: JSON.parse(saintsData),
            holidays: JSON.parse(holidaysData)
        };
        console.log('Data cached successfully.');
    } catch (error) {
        console.error('FATAL: Failed to load initial data. The server cannot start without it.', error);
        process.exit(1);
    }
}

// Serve static files (like main.html) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve main.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// API endpoint to get all combined calendar data
app.get('/api/data', (req, res) => {
    if (!calendarDataCache) {
        return res.status(503).json({ error: 'Server is starting, data not yet available. Please try again.' });
    }
    res.json(calendarDataCache);
});

// Catch-all route for 404 errors
app.use((req, res) => {
    res.status(404).json({ error: `Resource not found: ${req.originalUrl}` });
});

async function startServer() {
    await loadAndCacheData();
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Open http://localhost:${port}/ in your browser.`);
    });
}

startServer();