// The weather dictionary
// Every weather source speaks its own language: Open-Meteo uses numbers,
// MET Norway uses words like "lightrainshowers_day", wttr.in uses other
// numbers, and OpenWeatherMap uses yet another set of numbers.
// This file translates all of them into ONE small list of conditions,
// so the rest of the app only has to understand one language.


// Our own list of conditions
// text = the description shown under the temperature
// word = the big word written down the side of the main screen
// day / night = the pixel icon file in assets/icons/
const CONDITIONS = {
    clear:       { text: "Clear sky",     word: "Clear",   day: "clear-day",        night: "clear-night" },
    mostlyClear: { text: "Mainly clear",  word: "Fair",    day: "mostly-clear-day", night: "mostly-clear-night" },
    partly:      { text: "Partly cloudy", word: "Partly",  day: "partly-day",       night: "partly-night" },
    cloudy:      { text: "Cloudy",        word: "Cloudy",  day: "cloudy",           night: "cloudy" },
    fog:         { text: "Fog",           word: "Foggy",   day: "fog",              night: "fog" },
    drizzle:     { text: "Drizzle",       word: "Drizzle", day: "drizzle",          night: "drizzle" },
    rain:        { text: "Rain",          word: "Rainy",   day: "rain",             night: "rain" },
    showers:     { text: "Rain showers",  word: "Showers", day: "showers",          night: "showers" },
    sleet:       { text: "Sleet",         word: "Sleet",   day: "sleet",            night: "sleet" },
    snow:        { text: "Snow",          word: "Snowy",   day: "snow",             night: "snow" },
    thunder:     { text: "Thunderstorm",  word: "Stormy",  day: "thunder",          night: "thunder" },
    unknown:     { text: "Unknown",       word: "???",     day: "unknown",          night: "unknown" },
};

// Finds the info of a condition. If the condition is something we
// don't know, we use "unknown" so nothing breaks.
function conditionInfo(condition) {
    if (CONDITIONS[condition]) {
        return CONDITIONS[condition];
    }
    return CONDITIONS.unknown;
}

// Gives back an <img> of the pixel icon. isDay is true or false.
function getIcon(condition, isDay) {
    const info = conditionInfo(condition);

    let file = info.night;
    if (isDay) {
        file = info.day;
    }

    return '<img class="pixel-icon" src="assets/icons/' + file + '.png" alt="' + info.text + '">';
}

function getConditionText(condition) {
    return conditionInfo(condition).text;
}

function getConditionWord(condition) {
    return conditionInfo(condition).word;
}


// Translator 1: Open-Meteo
// Open-Meteo uses the official "WMO weather codes" (numbers).
// The full list is in the Open-Meteo docs.
function conditionFromWmo(code) {
    if (code === 0) return "clear";
    if (code === 1) return "mostlyClear";
    if (code === 2) return "partly";
    if (code === 3) return "cloudy";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return "drizzle";
    // 66 and 67 are "freezing rain", which is basically sleet
    if (code === 66 || code === 67) return "sleet";
    if (code >= 61 && code <= 65) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "showers";
    if (code === 85 || code === 86) return "snow";
    if (code >= 95) return "thunder";
    return "unknown";
}


// Translator 2: MET Norway
// MET Norway uses words like "lightrainshowers_day" or "cloudy".
function conditionFromMet(symbol) {
    if (!symbol) {
        return "unknown";
    }

    // Cut off the ending "_day", "_night" or "_polartwilight".
    // "lightrainshowers_day".split("_") gives ["lightrainshowers", "day"]
    const name = symbol.split("_")[0];

    if (name === "clearsky") return "clear";
    if (name === "fair") return "mostlyClear";
    if (name === "partlycloudy") return "partly";
    if (name === "cloudy") return "cloudy";
    if (name === "fog") return "fog";

    // Challenge: MET has lots of mixed words like "heavysleetshowersandthunder".
    // .includes() checks if a word is anywhere inside the text.
    // The ORDER of these checks matters: thunder is checked first, because
    // "rainandthunder" also contains "rain" and we want the thunder icon.
    if (name.includes("thunder")) return "thunder";
    if (name.includes("sleet")) return "sleet";
    if (name.includes("snow")) return "snow";
    if (name.includes("rainshowers")) return "showers";
    if (name.includes("rain")) return "rain";
    return "unknown";
}


// Translator 3: wttr.in
// wttr.in uses WorldWeatherOnline codes, and sends them as text ("113"),
// so we turn them into numbers first.
function conditionFromWwo(codeText) {
    const code = Number(codeText);

    if (code === 113) return "clear";
    if (code === 116) return "partly";
    if (code === 119 || code === 122) return "cloudy";

    // For codes that are spread all over the place, a list is easier
    // than a long chain of "||". includes() checks if the code is in the list.
    const fogCodes = [143, 248, 260];
    const thunderCodes = [200, 386, 389, 392, 395];
    const drizzleCodes = [263, 266, 281, 284];
    const showerCodes = [176, 353, 356, 359];
    const sleetCodes = [179, 182, 185, 311, 314, 317, 320, 350, 362, 365, 374, 377];
    const snowCodes = [227, 230, 368, 371];

    if (fogCodes.includes(code)) return "fog";
    if (thunderCodes.includes(code)) return "thunder";
    if (drizzleCodes.includes(code)) return "drizzle";
    if (showerCodes.includes(code)) return "showers";
    if (code >= 293 && code <= 308) return "rain";
    if (sleetCodes.includes(code)) return "sleet";
    if (snowCodes.includes(code)) return "snow";
    if (code >= 323 && code <= 338) return "snow";
    return "unknown";
}


// Translator 4: OpenWeatherMap (only used if there is an API key)
// OpenWeatherMap groups its codes by hundreds: 2xx thunder, 3xx drizzle...
function conditionFromOwm(id) {
    if (id >= 200 && id < 300) return "thunder";
    if (id >= 300 && id < 400) return "drizzle";
    if (id === 511) return "sleet"; // 511 = freezing rain
    if (id >= 611 && id <= 616) return "sleet";
    // 520-531 are showers, so check them BEFORE the general rain rule
    if (id >= 520 && id < 600) return "showers";
    if (id >= 500 && id < 600) return "rain";
    if (id >= 600 && id < 700) return "snow";
    if (id >= 700 && id < 800) return "fog";
    if (id === 800) return "clear";
    if (id === 801) return "mostlyClear";
    if (id === 802) return "partly";
    if (id === 803 || id === 804) return "cloudy";
    return "unknown";
}
