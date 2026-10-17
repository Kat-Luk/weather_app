// Raining Cats & Witches :<
// This file ties everything together:
// asks the weather sources for data -> draws it on the page.
// helper functions live in the other files

// The weather sources
// fetch function gives back data
const PROVIDERS = [
    { id: "openMeteo", name: "Open-Meteo", color: "#2a78d6", fetch: fetchOpenMeteo },
    { id: "metNorway", name: "MET Norway (yr.no)", color: "#eb6834", fetch: fetchMetNorway },
    { id: "wttr", name: "wttr.in", color: "#1baf7a", fetch: fetchWttr },
];

// OpenWeatherMap only if there is key
if (CONFIG.OPENWEATHER_API_KEY) {
    PROVIDERS.push({ id: "openWeatherMap", name: "OpenWeatherMap", color: "#eda100", fetch: fetchOpenWeatherMap });
    document.getElementById("owm-credit").hidden = false;
}


// What the app remembers rn
// The last city you looked at
let currentCity = loadSetting("weather-last-city", CONFIG.DEFAULT_CITY);

// Which source fills the main view
let selectedProvider = loadSetting("weather-provider", "openMeteo");

// If the saved source doesn't exist anymore (like the API with key) go back to Open-Meteo
let providerExists = false;
for (const provider of PROVIDERS) {
    if (provider.id === selectedProvider) {
        providerExists = true;
    }
}
if (!providerExists) {
    selectedProvider = "openMeteo";
}

// The answers from the sourcesä
let results = {};

// Time zone and sunrise/sunset of the current place (Open-Meteo)
let place = { timeZone: "UTC", sunTimes: [] };

// Counts how many times we started loading (challenge)
let loadCounter = 0;

// A shortcut, because document.getElementById is long to write 50 times -> thank you AI as always
function $(id) {
    return document.getElementById(id);
}


// error messages
function showMessage(text) {
    $("message").textContent = text;
    $("message").hidden = false;
}

function hideMessage() {
    $("message").hidden = true;
}


// Brewing the forecast for a city
// Challenege: loading takes time, and the user can search a new city
// before the old answers have arrived. Then a slow old answer could come in
// LAST and overwrite the new city with old weather. To stop that, every load
// gets a number (myLoad). When an answer arrives we check: is this still the
// newest load? If not, we throw the answer away.
async function loadWeather(city) {
    loadCounter = loadCounter + 1;
    const myLoad = loadCounter;

    currentCity = city;
    saveSetting("weather-last-city", city);

    results = {};
    for (const provider of PROVIDERS) {
        results[provider.id] = { status: "loading" };
    }

    $("current-city").textContent = city.name;
    if (city.country) {
        $("current-country").textContent = city.country;
    } else {
        $("current-country").textContent = "";
    }
    $("current-icon").innerHTML = '<span class="loader sprite" title="Brewing the forecast…"></span>';
    $("current-description").textContent = "Brewing the forecast…";
    hideMessage();

    // Open-Meteo goes first, because the other parts need its data
    try {
        const data = await fetchOpenMeteo(city.latitude, city.longitude);
        if (myLoad !== loadCounter) {
            return;
        }
        results.openMeteo = { status: "ok", data: data };
        place = { timeZone: data.timeZone, sunTimes: data.sunTimes };
        render();
        setupTarot(place.timeZone); // card of the day use date of that place
    } catch (error) {
        console.error(error);
        showMessage("Could not load the weather. Check your internet connection and try again.");
        $("current-description").textContent = "No data";
        return;
    }

    // all the other sources at the same time.
    for (const provider of PROVIDERS) {
        if (provider.id === "openMeteo") {
            continue;
        }
        loadOneSource(provider, city, myLoad);
    }
}

async function loadOneSource(provider, city, myLoad) {
    try {
        const data = await provider.fetch(city.latitude, city.longitude, place.timeZone);
        if (myLoad !== loadCounter) {
            return;
        }
        results[provider.id] = { status: "ok", data: data };
    } catch (error) {
        console.error(provider.name, error);
        if (myLoad !== loadCounter) {
            return;
        }
        results[provider.id] = { status: "error" };
    }
    render();
}


// Drawing everything
// This runs after new data arrives -> nothing is downloaded
function render() {
    // Nothing to draw before Open-Meteo answers
    if (!results.openMeteo || results.openMeteo.status !== "ok") {
        return;
    }

    let shownId = "openMeteo";
    const chosen = results[selectedProvider];
    if (chosen && chosen.status === "ok") {
        shownId = selectedProvider;
    }
    const forecast = results[shownId].data;

    renderCurrent(forecast);
    renderHourly(forecast.hourly);
    renderDaily(forecast.daily);
    renderSources();
    renderProviderSelect(shownId);
    renderChart();
    updateFavoriteButton();
    updateUnitButtons();

    // The witchy part: moon, zodiac, holidays, cats advice
    const now = Date.now();
    const moon = getMoonInfo(now);
    const time = timeOfDay(now, place.sunTimes, place.timeZone);

    let southern = false;
    if (currentCity.latitude < 0) {
        southern = true; // below equator
    }

    // Moonrise and moonset come from wttr.in
    let moonTimes = null;
    if (results.wttr && results.wttr.status === "ok") {
        moonTimes = results.wttr.data.astronomy;
    }

    renderMoonCard(moon, moonTimes, results.openMeteo.data.hourly, place.timeZone, southern);
    renderAlmanac(now, place.timeZone, southern);
    $("cat-tip").textContent = catTip(forecast.current, time, moon);

    // sky
    applyTheme(forecast.current, time, moon);
}

function renderCurrent(forecast) {
    const current = forecast.current;
    const now = Date.now();
    const isDay = isDaytime(now, place.sunTimes, place.timeZone);

    $("current-city").textContent = currentCity.name;
    if (currentCity.country) {
        $("current-country").textContent = currentCity.country;
    } else {
        $("current-country").textContent = "";
    }
    $("current-time").textContent = formatDate(now, place.timeZone) + " · " + formatHour(now, place.timeZone);

    $("current-icon").innerHTML = getIcon(current.condition, isDay);
    $("current-word").textContent = getConditionWord(current.condition);
    $("current-temp").textContent = formatTemp(current.temp);
    $("current-description").textContent = getConditionText(current.condition);

    if (current.feels === null) {
        $("current-feels").textContent = "n/a"; // MET Norway doesn't have it
    } else {
        $("current-feels").textContent = formatTemp(current.feels);
    }

    $("current-wind").textContent = Math.round(current.wind) + " m/s";
    $("current-humidity").textContent = current.humidity + "%";
    $("current-precipitation").textContent = Number(current.precip).toFixed(1) + " mm";
}

function renderHourly(hourly) {
    const list = $("hourly-list");
    list.innerHTML = "";

    for (let i = 0; i < hourly.length; i++) {
        const hour = hourly[i];
        const isDay = isDaytime(hour.time, place.sunTimes, place.timeZone);

        let timeText = formatHour(hour.time, place.timeZone);
        if (i === 0) {
            timeText = "Now";
        }

        let rainText = "";
        if (hour.precip > 0) {
            rainText = hour.precip.toFixed(1) + " mm";
        }

        const li = document.createElement("li");
        li.className = "hourly__item";
        li.innerHTML =
            '<span class="hourly__time">' + timeText + "</span>" +
            '<span class="hourly__icon" title="' + getConditionText(hour.condition) + '">' + getIcon(hour.condition, isDay) + "</span>" +
            '<span class="hourly__temp">' + formatTemp(hour.temp) + "</span>" +
            '<span class="hourly__rain">' + rainText + "</span>";
        list.appendChild(li);
    }
}

function renderDaily(daily) {
    const list = $("daily-list");
    list.innerHTML = "";

    for (let i = 0; i < daily.length; i++) {
        const day = daily[i];
        const li = document.createElement("li");
        li.className = "daily__item";
        // Days always use same icon
        li.innerHTML =
            '<span class="daily__day">' + formatDay(day.time, place.timeZone, i) + "</span>" +
            '<span class="daily__icon" title="' + getConditionText(day.condition) + '">' + getIcon(day.condition, true) + "</span>" +
            '<span class="daily__temps">' + formatTemp(day.min) + " / <strong>" + formatTemp(day.max) + "</strong></span>";
        list.appendChild(li);
    }
}

function renderSources() {
    const list = $("sources-list");
    list.innerHTML = "";
    const isDay = isDaytime(Date.now(), place.sunTimes, place.timeZone);

    for (const provider of PROVIDERS) {
        const result = results[provider.id];

        const button = document.createElement("button");
        button.type = "button";
        button.className = "sources__item";
        if (provider.id === selectedProvider) {
            button.classList.add("sources__item--active");
        }

        let value = "…"; //loading ...
        if (result.status === "ok") {
            const current = result.data.current;
            value = getIcon(current.condition, isDay) + " " + formatTemp(current.temp);
        } else if (result.status === "error") {
            value = "unavailable";
            button.disabled = true;
        }

        button.innerHTML =
            '<span class="sources__dot" style="background:' + provider.color + '"></span>' +
            '<span class="sources__name">' + provider.name + "</span>" +
            '<span class="sources__value">' + value + "</span>";
        button.addEventListener("click", function () {
            selectProvider(provider.id);
        });

        const li = document.createElement("li");
        li.appendChild(button);
        list.appendChild(li);
    }
}

function renderProviderSelect(shownId) {
    const select = $("provider-select");
    select.innerHTML = "";

    for (const provider of PROVIDERS) {
        const status = results[provider.id].status;
        const option = document.createElement("option");
        option.value = provider.id;

        let label = provider.name;
        if (status === "loading") {
            label = label + " (loading…)";
        } else if (status === "error") {
            label = label + " (unavailable)";
            option.disabled = true;
        }
        option.textContent = label;
        select.appendChild(option);
    }
    select.value = selectedProvider;

    //small note under select
    let note = results[shownId].data.note;
    if (shownId !== selectedProvider) {
        const chosen = results[selectedProvider];
        if (chosen && chosen.status === "error") {
            note = "The selected source could not be loaded, showing Open-Meteo.";
        } else {
            note = "The selected source is still loading, showing Open-Meteo.";
        }
    }
    $("source-note").textContent = note;
}

function renderChart() {
    // Chart.js from internet.
    if (typeof Chart === "undefined") {
        return;
    }

    // Only sources that answer
    const sources = [];
    for (const provider of PROVIDERS) {
        if (results[provider.id].status === "ok") {
            sources.push({
                name: provider.name,
                color: provider.color,
                hourly: results[provider.id].data.hourly,
            });
        }
    }

    // Open-Meteo's hours are x-axis
    const labelTimes = [];
    for (const hour of results.openMeteo.data.hourly) {
        labelTimes.push(hour.time);
    }

    drawComparisonChart(labelTimes, sources, place.timeZone);
}

function updateFavoriteButton() {
    const button = $("favorite-button");
    if (isFavorite(currentCity)) {
        button.textContent = "★";
        button.title = "Remove from favorites";
        button.classList.add("star--active");
    } else {
        button.textContent = "☆";
        button.title = "Add to favorites";
        button.classList.remove("star--active");
    }
    button.setAttribute("aria-label", button.title);
}

function updateUnitButtons() {
    const buttons = document.querySelectorAll(".units__button");
    for (const button of buttons) {
        if (button.dataset.unit === currentUnit) {
            button.classList.add("units__button--active");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.classList.remove("units__button--active");
            button.setAttribute("aria-pressed", "false");
        }
    }
}

function selectProvider(id) {
    selectedProvider = id;
    saveSetting("weather-provider", id);
    render();
}


// Searching for a city (Open-Meteo Geocoding)
async function searchCity(cityName) {
    let url = "https://geocoding-api.open-meteo.com/v1/search";
    url = url + "?name=" + encodeURIComponent(cityName);
    url = url + "&count=6&language=en&format=json";

    const data = await fetchJson(url);
    if (!data.results) {
        throw new Error("City not found: " + cityName);
    }

    const places = [];
    for (const result of data.results) {
        places.push({
            name: result.name,
            country: result.country || "",
            region: result.admin1 || "",
            latitude: result.latitude,
            longitude: result.longitude,
        });
    }
    return places;
}

// show all results
function showSearchResults(places) {
    const list = $("search-results");
    list.innerHTML = "";

    for (const city of places) {
        let where = city.country;
        if (city.region && city.country) {
            where = city.region + ", " + city.country;
        } else if (city.region) {
            where = city.region;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-results__item";
        button.textContent = city.name + " – " + where;
        button.addEventListener("click", function () {
            hideSearchResults();
            $("search-input").value = "";
            loadWeather(city);
        });

        const li = document.createElement("li");
        li.appendChild(button);
        list.appendChild(li);
    }
    list.hidden = false;
}

function hideSearchResults() {
    $("search-results").hidden = true;
}

$("search-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const cityName = $("search-input").value.trim();
    if (cityName === "") {
        return;
    }

    try {
        const places = await searchCity(cityName);
        if (places.length === 1) {
            hideSearchResults();
            $("search-input").value = "";
            loadWeather(places[0]);
        } else {
            showSearchResults(places);
        }
    } catch (error) {
        console.error(error);
        hideSearchResults();
        showMessage(error.message);
    }
});

$("search-input").addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        hideSearchResults();
    }
});
document.addEventListener("click", function (event) {
    if (!event.target.closest(".header__search")) {
        hideSearchResults();
    }
    if (!event.target.closest(".favorites")) {
        $("favorites-menu").open = false;
    }
});


// Using users location (Geolocation API)
// GPS gives coordinations.
// BigDataCloud turns the numbers into a name (no key).
async function placeNameFor(latitude, longitude) {
    try {
        let url = "https://api-bdc.io/data/reverse-geocode-client";
        url = url + "?latitude=" + latitude;
        url = url + "&longitude=" + longitude;
        url = url + "&localityLanguage=en";
        const data = await fetchJson(url);

        let name = "My location";
        if (data.city) {
            name = data.city;
        } else if (data.locality) {
            name = data.locality;
        }
        return { name: name, country: data.countryName || "" };
    } catch (error) {
        return { name: "My location", country: "" };
    }
}

// Challenge: browsers only allow location on "secure" pages, which means
// https:// or localhost. If you open index.html by double-clicking it, the
// button can fail. That's why the README says to run a small local server.
$("location-button").addEventListener("click", function () {
    if (!navigator.geolocation) {
        showMessage("Your browser does not support location.");
        return;
    }
    showMessage("Finding your location…");

    navigator.geolocation.getCurrentPosition(
        // It worked
        async function (position) {
            // Two decimals is about 1 km, plenty for weather
            const latitude = Math.round(position.coords.latitude * 100) / 100;
            const longitude = Math.round(position.coords.longitude * 100) / 100;
            const placeName = await placeNameFor(latitude, longitude);
            loadWeather({
                name: placeName.name,
                country: placeName.country,
                latitude: latitude,
                longitude: longitude,
            });
        },
        function (error) {
            if (error.code === 1) {
                showMessage("Location permission was denied. You can still search for a city.");
            } else {
                showMessage("Could not find your location. Try searching instead.");
            }
        },
        { timeout: 10000 }
    );
});


// C ,F, K
const unitButtons = document.querySelectorAll(".units__button");
for (const button of unitButtons) {
    button.addEventListener("click", function () {
        setUnit(button.dataset.unit);
        render();
    });
}

// data source drop down
$("provider-select").addEventListener("change", function (event) {
    selectProvider(event.target.value);
});
//fav star
$("favorite-button").addEventListener("click", function () {
    toggleFavorite(currentCity);
    updateFavoriteButton();
    refreshFavoritesMenu();
});

function refreshFavoritesMenu() {
    renderFavorites(
        function (city) {
            $("favorites-menu").open = false;
            loadWeather(city);
        },
        function () {
            refreshFavoritesMenu();
            updateFavoriteButton();
        }
    );
}


// run! :3
updateUnitButtons();
refreshFavoritesMenu();
loadWeather(currentCity);
