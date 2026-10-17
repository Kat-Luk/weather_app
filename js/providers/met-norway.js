// Weather source 2: MET Norway, the people behind yr.no (https://api.met.no)
// No API key needed. Gives back the same shape as open-meteo.js.
//
// MET gives ONE long list of moments called "timeseries".
// It goes hour by hour for about 2.5 days, and after that every 6 hours.

// Each moment can have a weather symbol for the next 1, 6 or 12 hours.
// We prefer the 1 hour one, because it is the most exact.
function metSymbol(item) {
    const d = item.data;
    if (d.next_1_hours) {
        return d.next_1_hours.summary.symbol_code;
    }
    if (d.next_6_hours) {
        return d.next_6_hours.summary.symbol_code;
    }
    if (d.next_12_hours) {
        return d.next_12_hours.summary.symbol_code;
    }
    return null;
}

async function fetchMetNorway(latitude, longitude, timeZone) {
    // MET wants at most 4 decimals in the coordinates, toFixed(4) does that
    let url = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
    url = url + "?lat=" + latitude.toFixed(4);
    url = url + "&lon=" + longitude.toFixed(4);

    // Challenge: MET Norway refuses requests that don't say who they are
    // (a "User-Agent"). A normal browser sends one by itself, so this works
    // from the app, but testing the same address with a bare tool can give
    // "403 Forbidden".
    const data = await fetchJson(url);
    const series = data.properties.timeseries;
    const now = Date.now();
    const oneHour = 3600 * 1000;


    // The weather right now = the first moment in the list
    const first = series[0].data;

    let rainNow = 0;
    if (first.next_1_hours) {
        rainNow = first.next_1_hours.details.precipitation_amount;
    }

    const current = {
        temp: first.instant.details.air_temperature,
        feels: null, // MET doesn't give a "feels like" temperature
        wind: first.instant.details.wind_speed,
        humidity: Math.round(first.instant.details.relative_humidity),
        precip: rainNow,
        condition: conditionFromMet(metSymbol(series[0])),
    };


    // The next 24 hours (only the moments that have 1 hour data)
    const hourly = [];
    for (const item of series) {
        const time = new Date(item.time).getTime();

        if (time <= now - oneHour) {
            continue; // already over
        }
        if (!item.data.next_1_hours) {
            continue; // a 6 hour step, not useful for the hourly list
        }

        hourly.push({
            time: time,
            temp: item.data.instant.details.air_temperature,
            condition: conditionFromMet(metSymbol(item)),
            precip: item.data.next_1_hours.details.precipitation_amount,
        });

        if (hourly.length === 24) {
            break;
        }
    }


    // The next 7 days
    //
    // Challenge: MET has no daily forecast at all, so we brew one ourselves.
    // We sort every moment into its day (using the LOCAL date of the place, or
    // the days would be cut at the wrong midnight), then keep the lowest and
    // highest temperature of each day. The icon of the day is the weather
    // closest to 12:00, because a "day icon" from 3 am would be silly.
    const days = {};       // "2026-10-15" -> info about that day
    const dayOrder = [];   // the dates in the right order

    for (const item of series) {
        const time = new Date(item.time).getTime();
        const key = dayKey(time, timeZone);
        const temp = item.data.instant.details.air_temperature;

        // First moment of a new day: make an empty day
        if (!days[key]) {
            days[key] = {
                time: time,
                min: temp,
                max: temp,
                condition: "unknown",
                middayDistance: 99, // how far from 12:00 our current icon is
            };
            dayOrder.push(key);
        }

        const day = days[key];
        if (temp < day.min) {
            day.min = temp;
        }
        if (temp > day.max) {
            day.max = temp;
        }

        // Is this moment closer to 12:00 than the one we picked before?
        const distanceFromNoon = Math.abs(localHour(time, timeZone) - 12);
        const symbol = metSymbol(item);
        if (distanceFromNoon < day.middayDistance && symbol) {
            day.middayDistance = distanceFromNoon;
            day.condition = conditionFromMet(symbol);
        }
    }

    // Turn it into a list with max 7 days
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
        note: "MET Norway does not report a “feels like” temperature.",
    };
}
