// Weather source 1: Open-Meteo (https://open-meteo.com)
// No API key needed. This is the head witch of the coven: it is loaded
// first, because it also tells us the time zone of the place and the
// sunrise and sunset times, which the other parts of the app need.
//
// Every provider file gives back its data in the SAME shape,
// so app.js doesn't care which source it is talking to:
// {
//   current: { temp, feels, wind, humidity, precip, condition },
//   hourly:  [ { time, temp, condition, precip }, ... ]   (next 24 hours)
//   daily:   [ { time, min, max, condition }, ... ]       (7 days)
//   note:    "extra info shown to the user"
// }
// temp is in °C, wind in m/s, precip in mm, and time in milliseconds.

async function fetchOpenMeteo(latitude, longitude) {
    // The part after "?" tells Open-Meteo which place and which values we want
    let url = "https://api.open-meteo.com/v1/forecast";
    url = url + "?latitude=" + latitude;
    url = url + "&longitude=" + longitude;
    url = url + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation";
    url = url + "&hourly=temperature_2m,weather_code,precipitation";
    url = url + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset";
    url = url + "&forecast_days=8";
    url = url + "&wind_speed_unit=ms";
    url = url + "&timezone=auto";
    // Times as seconds since 1970. Plain numbers are much easier to compare than date texts.
    url = url + "&timeformat=unixtime";

    const data = await fetchJson(url);
    const now = Date.now();


    // The weather right now
    const current = {
        temp: data.current.temperature_2m,
        feels: data.current.apparent_temperature,
        wind: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        precip: data.current.precipitation,
        condition: conditionFromWmo(data.current.weather_code),
    };


    // The next 24 hours
    //
    // Challenge: Open-Meteo doesn't give a list of hours. It gives separate
    // lists: one with all the times, one with all the temperatures, one with all
    // the weather codes... Item number i in each list belongs to the same hour.
    // So we walk through them with an index and glue them together into one
    // object per hour.
    const hourly = [];
    const oneHour = 3600 * 1000;

    for (let i = 0; i < data.hourly.time.length; i++) {
        const time = data.hourly.time[i] * 1000; // seconds -> milliseconds

        // Skip the hours that are already over, but keep the hour we are in now
        if (time <= now - oneHour) {
            continue;
        }

        hourly.push({
            time: time,
            temp: data.hourly.temperature_2m[i],
            condition: conditionFromWmo(data.hourly.weather_code[i]),
            precip: data.hourly.precipitation[i],
        });

        // 24 is enough
        if (hourly.length === 24) {
            break;
        }
    }


    // The next 7 days, plus sunrise and sunset (for the day and night icons)
    const daily = [];
    const sunTimes = [];

    for (let i = 0; i < data.daily.time.length; i++) {
        // Sun times for all 8 days (the 8th helps after midnight)
        sunTimes.push({
            rise: data.daily.sunrise[i] * 1000,
            set: data.daily.sunset[i] * 1000,
        });

        // ...but only 7 days for the list
        if (daily.length < 7) {
            daily.push({
                time: data.daily.time[i] * 1000,
                min: data.daily.temperature_2m_min[i],
                max: data.daily.temperature_2m_max[i],
                condition: conditionFromWmo(data.daily.weather_code[i]),
            });
        }
    }

    return {
        current: current,
        hourly: hourly,
        daily: daily,
        note: "",
        // Extra things that only Open-Meteo gives us:
        timeZone: data.timezone,
        sunTimes: sunTimes,
    };
}
