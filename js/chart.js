// The comparison chart
// One line per weather source showing the temperature for the next 24 hours.
// The drawing itself is done by the Chart.js library (loaded in index.html).

let comparisonChart = null; // keep the chart here -> update it later

// Finds the temperature a source gives for one hour on the x-axis.
// Gives back null if the source has nothing for that hour.
//
// Challenge 1: the sources don't use the same hours. Some give a value every
// hour, some only every 3 hours. So for each hour on the x-axis we look for a
// value that is close enough, and if there is none we use null. Chart.js leaves
// a gap for null, and "spanGaps" (below) draws the line across the gap.
//
// Chellenge 2: at first "close enough" was "less than 30 minutes". That broke
// in India: India is UTC+5:30, so the local hours are at :30 in UTC while
// MET Norway gives its hours at :00 UTC. Every value was exactly 30 minutes off,
// so the whole MET line disappeared. "30 minutes OR LESS" fixed it.
function valueAtHour(hourlyList, time) {
    const halfHour = 30 * 60 * 1000;

    for (const hour of hourlyList) {
        const difference = Math.abs(hour.time - time);
        if (difference <= halfHour) {
            const converted = convertTemp(hour.temp);
            return Math.round(converted * 10) / 10;
        }
    }
    return null;
}

// labelTimes = the hours on the x-axis ->  Open-Meteo's hours
// sources = [{ name, color, hourly: [...] }, ...]
function drawComparisonChart(labelTimes, sources, timeZone) {
    // text under x axis
    const labels = [];
    for (const time of labelTimes) {
        labels.push(formatHour(time, timeZone));
    }

    // One dataset for every source
    const datasets = [];
    for (const source of sources) {
        const values = [];
        for (const time of labelTimes) {
            values.push(valueAtHour(source.hourly, time));
        }

        // Sources with 3-hour steps get dots on the line -> see real values
        let dotSize = 0;
        if (source.hourly.length < 20) {
            dotSize = 3;
        }

        datasets.push({
            label: source.name,
            data: values,
            borderColor: source.color,
            backgroundColor: source.color,
            borderWidth: 2,
            tension: 0.3,     // slightly curvy lines
            spanGaps: true,   // draw the line over the empty (null) hours
            pointRadius: dotSize,
            pointHoverRadius: 5,
        });
    }

    // chart already exist -> give new data.
    if (comparisonChart !== null) {
        comparisonChart.data.labels = labels;
        comparisonChart.data.datasets = datasets;
        comparisonChart.options.scales.y.title.text = "Temperature (" + unitLabel() + ")";
        comparisonChart.update();
        return;
    }

    const canvas = document.getElementById("comparison-chart");
    comparisonChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // heigh from CSS
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#52514e", usePointStyle: true, boxHeight: 6 },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ": " + context.parsed.y + " " + unitLabel();
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#52514e", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                    grid: { display: false },
                },
                y: {
                    title: { display: true, text: "Temperature (" + unitLabel() + ")", color: "#52514e" },
                    ticks: { color: "#52514e" },
                    grid: { color: "#e6e5e0" },
                },
            },
        },
    });
}
