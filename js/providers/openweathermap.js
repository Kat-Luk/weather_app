// Weather source 4: OpenWeatherMap (https://openweathermap.org)
// This one needs an API key, so it is only used when
// CONFIG.OPENWEATHER_API_KEY in js/config.js is filled in.
// The free plan gives the weather now + 5 days in 3 hour steps.

// Rain is only in the answer when it is actually raining,
// so we have to check that it exists before reading it.
function owmRain(item, key) {
    if (item.rain && item.rain[key]) {
        return item.rain[key];
    }
    return 0;
}

async function fetchOpenWeatherMap(latitude, longitude, timeZone) {
    const base = "https://api.openweathermap.org/data/2.5/";
    let query = "?lat=" + latitude;
    query = query + "&lon=" + longitude;
    query = query + "&units=metric";
    query = query + "&appid=" + CONFIG.OPENWEATHER_API_KEY;

    // OpenWeatherMap needs two separate requests: one for now, one for the forecast.
    // Promise.all sends both at the same time and waits until both have answered,
    // which is faster than asking one after the other.
    const answers = await Promise.all([
        fetchJson(base + "weather" + query),
        fetchJson(base + "forecast" + query),
    ]);
    const now = answers[0];
    const forecast = answers[1];


    // The weather right now
    const current = {
        temp: now.main.temp,
        feels: now.main.feels_like,
        wind: now.wind.speed,
        humidity: now.main.humidity,
        precip: owmRain(now, "1h"),
        condition: conditionFromOwm(now.weather[0].id),
    };


    // The next 24 hours: the first 8 steps of 3 hours
    const hourly = [];
    for (let i = 0; i < 8 && i < forecast.list.length; i++) {
        const item = forecast.list[i];
        hourly.push({
            time: item.dt * 1000,
            temp: item.main.temp,
            condition: conditionFromOwm(item.weather[0].id),
            precip: owmRain(item, "3h"),
        });
    }


    // The days: no daily list here either, so we group the 3 hour steps
    // by date, the same way as in met-norway.js
    const days = {};
    const dayOrder = [];

    for (const item of forecast.list) {
        const time = item.dt * 1000;
        const key = dayKey(time, timeZone);

        if (!days[key]) {
            days[key] = {
                time: time,
                min: item.main.temp_min,
                max: item.main.temp_max,
                condition: "unknown",
                middayDistance: 99,
            };
            dayOrder.push(key);
        }

        const day = days[key];
        if (item.main.temp_min < day.min) {
            day.min = item.main.temp_min;
        }
        if (item.main.temp_max > day.max) {
            day.max = item.main.temp_max;
        }

        // The icon of the day = the step closest to 12:00
        const distanceFromNoon = Math.abs(localHour(time, timeZone) - 12);
        if (distanceFromNoon < day.middayDistance) {
            day.middayDistance = distanceFromNoon;
            day.condition = conditionFromOwm(item.weather[0].id);
        }
    }

    const daily = [];
    for (const key of dayOrder) {
        if (daily.length < 7) {
            daily.push(days[key]);
        }
    }

    return {
        current: current,
        hourly: hourly,
        daily: daily,
        note: "OpenWeatherMap (free plan) gives 3-hour steps and 5 days.",
    };
}
