// Weather source 3: wttr.in (https://wttr.in), its data comes from WorldWeatherOnline
// No API key needed. Gives back the same shape as open-meteo.js.
// wttr.in only has 3 days, in 3 hour steps. But it has a bonus:
// moonrise and moonset times, which we use on the moon card.

async function fetchWttr(latitude, longitude, timeZone) {
    const url = "https://wttr.in/" + latitude + "," + longitude + "?format=j1";
    const data = await fetchJson(url);
    const now = Date.now();
    const threeHours = 3 * 3600 * 1000;


    // The weather right now
    // Careful: wttr.in sends all its numbers as TEXT ("12" instead of 12).
    // Number() turns them into real numbers, otherwise "12" + 1 would be "121".
    const c = data.current_condition[0];
    const current = {
        temp: Number(c.temp_C),
        feels: Number(c.FeelsLikeC),
        wind: Number(c.windspeedKmph) / 3.6, // km/h -> m/s (the other sources use m/s)
        humidity: Number(c.humidity),
        precip: Number(c.precipMM),
        condition: conditionFromWwo(c.weatherCode),
    };


    // Hours and days
    //
    // Challenge: wttr.in writes the times like "0", "300", "1500", which
    // means 00:00, 03:00, 15:00 in the LOCAL time of the place, without
    // saying which time zone that is. To compare them with the other sources
    // we turn them into real moments with localTimeToMs (see utils.js),
    // using the time zone Open-Meteo told us.
    const hourly = [];
    const daily = [];

    for (const day of data.weather) {
        let middayCondition = "unknown";

        for (const hour of day.hourly) {
            const clockHour = Number(hour.time) / 100; // "1500" -> 15
            const time = localTimeToMs(day.date, clockHour, timeZone);
            const condition = conditionFromWwo(hour.weatherCode);

            if (clockHour === 12) {
                middayCondition = condition; // the icon for the whole day
            }

            // Keep the 3 hour block we are in now and everything after it,
            // 8 blocks x 3 hours = 24 hours
            const notOverYet = time > now - threeHours;
            if (notOverYet && hourly.length < 8) {
                hourly.push({
                    time: time,
                    temp: Number(hour.tempC),
                    condition: condition,
                    precip: Number(hour.precipMM),
                });
            }
        }

        daily.push({
            time: localTimeToMs(day.date, 12, timeZone),
            min: Number(day.mintempC),
            max: Number(day.maxtempC),
            condition: middayCondition,
        });
    }

    // Today's moon times, like "04:10 PM" (moon.js turns them into 24 hour time)
    const todaysAstronomy = data.weather[0].astronomy[0];

    return {
        current: current,
        hourly: hourly,
        daily: daily,
        note: "wttr.in gives the forecast in 3-hour steps and only for 3 days.",
        astronomy: {
            moonrise: todaysAstronomy.moonrise,
            moonset: todaysAstronomy.moonset,
        },
    };
}
