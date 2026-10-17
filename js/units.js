// Temperature units: Celsius, Fahrenheit and Kelvin
// every temperature in the app stored in Celsius.
// convertion happens at the very last step.

let currentUnit = loadSetting("weather-unit", "C");

function setUnit(unit) {
    currentUnit = unit;
    saveSetting("weather-unit", unit);
}

function convertTemp(celsius) {
    if (currentUnit === "F") {
        return celsius * 9 / 5 + 32;
    }
    if (currentUnit === "K") {
        return celsius + 273.15;
    }
    return celsius;
}

function formatTemp(celsius) {
    // Some sources leave values empty, then we show "--" instead of "NaN°"
    if (celsius === null || celsius === undefined || isNaN(celsius)) {
        return "--";
    }

    const value = Math.round(convertTemp(celsius));

    // Kelvin without the ° sign
    if (currentUnit === "K") {
        return value + " K";
    } else {
        return value + "°";
    }
}

// The unit as text for the chart
function unitLabel() {
    if (currentUnit === "F") {
        return "°F";
    }
    if (currentUnit === "K") {
        return "K";
    }
    return "°C";
}
