// The little helper spells

// Time spells
// All times in the app are stored as milliseconds (the same thing Date.now() gives) -> use the time zone of the searched place,
// Intl.DateTimeFormat is built into every browser - THANKFULY!.
//
// challenge: the time zone of the searched city isn't the time zone of the computer. new_Date()" still thinks in computers time zone. Sooo... every function gets the timeZone and passes it to Intl.

// moment into "00:00"
function formatHour(ms, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timeZone,
    });
    return formatter.format(new Date(ms));
}

// moment into "Today", "Monday", ...
// indexing -> 0 = today, 1 = tomorrow,...
function formatDay(ms, timeZone, index) {
    if (index === 0) {
        return "Today";
    }
    const formatter = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        timeZone: timeZone,
    });
    return formatter.format(new Date(ms));
}

// moment into "Thursday 16 October"
function formatDate(ms, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: timeZone,
    });
    return formatter.format(new Date(ms));
}

// sort hourly into days
function dayKey(ms, timeZone) {
    // Fun fact: Canadian English ("en-CA") writes dates as YYYY-MM-DD, which is exactly the format we want, so we borrow it. (Thank you Claude for saving my time sm <3)
    const formatter = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: timeZone,
    });
    return formatter.format(new Date(ms));
}

// The hour (0 to 23) of a moment in that place
function localHour(ms, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: timeZone,
    });
    const text = formatter.format(new Date(ms));
    return Number(text);
}

// How many milliseconds the place is ahead of UTC at that moment.
// Challenge: JavaScript has no simple function for offset :<.
// The trick: ask Intl to write the time in that place (year, month, day, hour...), read it numbers back, let's act as they are UTC, and look at the difference.
// Difference is the offset.
// It also handles summer time and winter time by itself.
function timeZoneOffsetMs(ms, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    // formatToParts gives list
    const parts = formatter.formatToParts(new Date(ms));

    // pick numbers from list one by one
    let year = 0;
    let month = 0;
    let day = 0;
    let hour = 0;
    let minute = 0;
    let second = 0;
    for (const part of parts) {
        if (part.type === "year") {
            year = Number(part.value);
        }
        if (part.type === "month") {
            month = Number(part.value);
        }
        if (part.type === "day") {
            day = Number(part.value);
        }
        if (part.type === "hour") {
            hour = Number(part.value);
        }
        if (part.type === "minute") {
            minute = Number(part.value);
        }
        if (part.type === "second") {
            second = Number(part.value);
        }
    }

    const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const withoutMs = Math.floor(ms / 1000) * 1000;
    return asIfUtc - withoutMs;
}

// Local date "2026-10-15" + hour 15 in that place -> milliseconds.
// wttr.in gives its times like this, with no time zone at all!
function localTimeToMs(dateText, hour, timeZone) {
    const pieces = dateText.split("-");
    const year = Number(pieces[0]);
    const month = Number(pieces[1]);
    const day = Number(pieces[2]);

    // First guess: pretend the time is in UTC...
    const guess = Date.UTC(year, month - 1, day, hour);
    // ...then move it by the place's offset to get the real moment
    const offset = timeZoneOffsetMs(guess, timeZone);
    return guess - offset;
}


// Day or night?
// sunTimes is a list with one item per day: [{ rise: ms, set: ms }, ...]
//from Open-Meteo
function isDaytime(ms, sunTimes, timeZone) {
    const today = dayKey(ms, timeZone);

    for (const day of sunTimes) {
        if (dayKey(day.rise, timeZone) === today) {
            // right day -> is the moment between sunrise sunset?
            if (ms >= day.rise && ms < day.set) {
                return true;
            } else {
                return false;
            }
        }
    }

    // No sun data -> guess on time
    const hour = localHour(ms, timeZone);
    if (hour >= 7 && hour < 20) {
        return true;
    }
    return false;
}


// Fetching from the internet
// Every API call needs the same code. -> lets have function from it!
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Request failed (" + response.status + "): " + url);
    }
    const data = await response.json();
    return data;
}


// Remembering things (localStorage)
// localStorage keeps small things also after closing browser.
// Challenge: localStorage can only store text, so objects and lists  are turned into text with JSON.stringify and back with JSON.parse.
function loadSetting(key, fallback) {
    try {
        const text = localStorage.getItem(key);
        if (text === null) {
            // Nothing saved yet
            return fallback;
        }
        return JSON.parse(text);
    } catch (error) {
        return fallback;
    }
}

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Could not save setting", key);
    }
}
