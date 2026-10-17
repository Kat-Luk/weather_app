// The witchy part: moon, zodiac and the Wheel of the Year
// The moon phase and the zodiac signs are calculated with old school
// astronomy formulas, so they work even without internet.
// Only the moonrise and moonset times come from the internet (wttr.in).


// Moon phase

// A full cycle from new moon to new moon takes about 29.53 days
const MOON_CYCLE = 29.530588853;
// A moment we KNOW was a new moon: 6 January 2000 at 18:14 UTC.
// Now easy to count full moon on any day
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const ONE_DAY = 24 * 60 * 60 * 1000;

// The 8 phases in order.
// Challenge: the moon picture pack starts with the FULL moon as picture 1, but the cycle starts with the NEW moon.
// So the numbers don't go 1, 2, 3... here, and each phase needs its own file number.
const PHASES = [
    { name: "New Moon",        file: 5 },
    { name: "Waxing Crescent", file: 6 },
    { name: "First Quarter",   file: 7 },
    { name: "Waxing Gibbous",  file: 8 },
    { name: "Full Moon",       file: 1 },
    { name: "Waning Gibbous",  file: 2 },
    { name: "Last Quarter",    file: 3 },
    { name: "Waning Crescent", file: 4 },
];

function getMoonInfo(ms) {
    // How many days since known full moon
    const daysSince = (ms - KNOWN_NEW_MOON) / ONE_DAY;

    // How far into the current cycle (in days)
    let daysIntoCycle = daysSince % MOON_CYCLE;
    if (daysIntoCycle < 0) {
        daysIntoCycle = daysIntoCycle + MOON_CYCLE; // only for dates before 2000
    }

    // The same as a number from 0 to 1:
    // 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 1 = new moon again
    const cycle = daysIntoCycle / MOON_CYCLE;

    // How much of the moon is lit, from 0 to 1.
    // Challenge: the light doesn't grow in a straight line, it follows a cosine curve (slow at new and full moon, fast at the quarters).
    // At cycle 0 this gives 0, at cycle 0.5 it gives 1.
    const illumination = (1 - Math.cos(2 * Math.PI * cycle)) / 2;

    // Which of the 8 phases
    let phaseNumber = Math.round(cycle * 8);
    if (phaseNumber === 8) {
        phaseNumber = 0; // end of the cycle is new moon again
    }
    const phase = PHASES[phaseNumber];

    // consider it full moon when at least 97% is lit
    let isFull = false;
    if (illumination >= 0.97) {
        isFull = true;
    }

    // Days until the next full moon
    let daysToFull = 0;
    if (cycle < 0.5) {
        daysToFull = (0.5 - cycle) * MOON_CYCLE; // still coming this cycle
    } else {
        daysToFull = (1.5 - cycle) * MOON_CYCLE; // already passed, so the next cycle
    }
    if (isFull) {
        daysToFull = 0;
    }

    return {
        name: phase.name,
        image: "assets/moon/phase-" + phase.file + ".png",
        illumination: Math.round(illumination * 100),
        isFull: isFull,
        daysToFull: Math.round(daysToFull),
    };
}


// Zodiac signs
// The sun and the moon move around the sky along a path. 
// split that path into 12 pieces of 30 degrees, every piece is one zodiac sign,
// Start: aries -> 0 degrees.
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function degreesToSign(degrees) {
    // degrees between 0 & 360
    let normalized = degrees % 360;
    if (normalized < 0) {
        normalized = normalized + 360;
    }
    const signNumber = Math.floor(normalized / 30);
    return SIGNS[signNumber];
}

// Astronomy formulas count
function daysSince2000(ms) {
    return (ms - Date.UTC(2000, 0, 1, 12)) / ONE_DAY;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Where the sun is on the zodiac path.
// Challenge: the sun moves about 0.9856 degrees every day (360 degrees in a year). 
// The sin() parts correct it a little, because Earth's orbit is not a perfect circle.
// The numbers come from an astronomy almanac.
function sunSign(ms) {
    const d = daysSince2000(ms);
    const averagePosition = 280.460 + 0.9856474 * d;
    const correctionAngle = toRadians(357.528 + 0.9856003 * d);
    const position = averagePosition + 1.915 * Math.sin(correctionAngle) + 0.020 * Math.sin(2 * correctionAngle);
    return degreesToSign(position);
}

// Where the moon is on the zodiac path.
// Challenge: you can't use a date table for the moon like for the sun, because the moon goes around the WHOLE zodiac in about 27 days. 
// It moves about 13.18 degrees every day and changes sign every 2-3 days.
// This simple formula is a little rough but good enough to get the sign right.
function moonSign(ms) {
    const d = daysSince2000(ms);
    const averagePosition = 218.316 + 13.176396 * d;
    const correctionAngle = toRadians(134.963 + 13.064993 * d);
    const position = averagePosition + 6.289 * Math.sin(correctionAngle);
    return degreesToSign(position);
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}


// eight witchy holidays -> sabbats
const SABBATS = [
    { name: "Imbolc",     month: 2,  day: 1,  icon: "🕯️" },
    { name: "Ostara",     month: 3,  day: 20, icon: "🥚" },
    { name: "Beltane",    month: 5,  day: 1,  icon: "🔥" },
    { name: "Litha",      month: 6,  day: 21, icon: "🌻" },
    { name: "Lughnasadh", month: 8,  day: 1,  icon: "🌾" },
    { name: "Mabon",      month: 9,  day: 22, icon: "🍎" },
    { name: "Samhain",    month: 10, day: 31, icon: "🎃" },
    { name: "Yule",       month: 12, day: 21, icon: "🎄" },
];

// Finds the next sabbat, how many days are left
//
// challenge 1: after Yule in December, the next holiday is Imbolc in FEBRUARY NEXT YEAR.
// So we check every holiday both this year and next year, and keep the closest one that isn't in the past.
// Challenge 2: in the southern hemisphere (Australia, Argentina...) the seasons are the other way round, so the holidays move by 6 months.
// Samhain, the autumn holiday, is on 1 May there.
function nextSabbat(ms, timeZone, southern) {
    const pieces = dayKey(ms, timeZone).split("-");
    const year = Number(pieces[0]);
    const month = Number(pieces[1]);
    const day = Number(pieces[2]);
    const today = Date.UTC(year, month - 1, day);

    let best = null;

    for (const sabbat of SABBATS) {
        let sabbatMonth = sabbat.month;
        if (southern) {
            sabbatMonth = sabbat.month + 6;
            if (sabbatMonth > 12) {
                sabbatMonth = sabbatMonth - 12;
            }
        }

        const yearsToCheck = [year, year + 1];
        for (const y of yearsToCheck) {
            const date = Date.UTC(y, sabbatMonth - 1, sabbat.day);
            const daysLeft = Math.round((date - today) / ONE_DAY);

            if (daysLeft < 0) {
                continue;
            }
            if (best === null || daysLeft < best.daysLeft) {
                best = { name: sabbat.name, icon: sabbat.icon, daysLeft: daysLeft };
            }
        }
    }
    return best;
}


// What the cat says
function catTip(current, time, moon) {
    // Special moments first, they win over the normal weather tips
    if (time === "night" && moon.isFull) {
        return "Full moon tonight! Time to make moon water 🌕";
    }
    if (current.temp >= 27) {
        return "So hot even the cauldron is sweating. Stay in the shade! 🔥";
    }
    if (current.temp <= -10) {
        return "Brrr! Even my whiskers are frozen. Wear your warmest cloak 🧣";
    }

    const condition = current.condition;
    if (condition === "clear") {
        if (time === "night") {
            return "Clear skies! A perfect night for stargazing 🔭";
        }
        return "Sunshine! Charge your crystals on the windowsill ✨";
    }
    if (condition === "mostlyClear") return "Lovely weather for a broom ride 🧹";
    if (condition === "partly") return "A few clouds… good day for a walk in the woods 🍄";
    if (condition === "cloudy") return "Grey skies. Let's brew something warm 🍵";
    if (condition === "fog") return "Fog's out. The ghosts love this weather 👻";
    if (condition === "drizzle") return "Drizzly day. Perfect for reading spellbooks 📖";
    if (condition === "rain") return "Rain! Light a candle and make some tea ☕";
    if (condition === "showers") return "Showers coming and going. Bring an umbrella ☂️";
    if (condition === "sleet") return "Sleet! Stay inside and keep your paws dry 🧦";
    if (condition === "snow") return "Snow! Wrap up in your coziest cloak ❄️";
    if (condition === "thunder") return "Thunder! Hide under the blanket with me ⚡";

    return "Meow? The crystal ball is cloudy today 🔮";
}


// moon visible
// This mixes two kinds of data: the moon phase (calculated here) and the cloud forecast for the night (from the weather source).
function nightSkyReading(hourly, timeZone, moon) {
    const nightHours = [];
    for (const hour of hourly) {
        const h = localHour(hour.time, timeZone);
        if (h >= 21 || h <= 3) {
            nightHours.push(hour);
        }
    }

    if (nightHours.length === 0 || moon.illumination < 5) {
        return "The new moon is hiding. A dark sky, good for new beginnings 🌑";
    }

    let clearHours = 0;
    for (const hour of nightHours) {
        if (hour.condition === "clear" || hour.condition === "mostlyClear" || hour.condition === "partly") {
            clearHours = clearHours + 1;
        }
    }
    const share = clearHours / nightHours.length; // 0 = cloudy 1 = clear

    if (share >= 0.7) {
        return "Clear skies tonight. The moon will be watching 🔭";
    }
    if (share >= 0.3) {
        return "The moon will peek between the clouds tonight ☁️";
    }
    return "Clouds will hide the moon tonight. Stay in with tea 🍵";
}

// wttr.in writes times like -> 04:10 PM
function to24Hours(text) {
    const parts = text.split(" ");    
    if (parts.length !== 2) {
        return text;
    }
    const amOrPm = parts[1];
    if (amOrPm !== "AM" && amOrPm !== "PM") {
        return text;
    }

    const clock = parts[0].split(":");
    let hour = Number(clock[0]);
    const minutes = clock[1];

    // 12 AM is midnight (00) and 12 PM is noon (12)
    if (amOrPm === "AM" && hour === 12) {
        hour = 0;
    }
    if (amOrPm === "PM" && hour !== 12) {
        hour = hour + 12;
    }

    let hourText = String(hour);
    if (hour < 10) {
        hourText = "0" + hourText;
    }
    return hourText + ":" + minutes;
}


// Drawing the moon card and the almanac card
function renderMoonCard(moon, astronomy, hourly, timeZone, southern) {
    const image = document.getElementById("moon-image");
    image.src = moon.image;
    image.alt = moon.name;

    // southern hemisphere moon is mirrored
    if (southern) {
        image.classList.add("moon__image--south");
    } else {
        image.classList.remove("moon__image--south");
    }

    // glowing moon on full moon nights
    if (moon.isFull) {
        image.classList.add("moon__image--full");
    } else {
        image.classList.remove("moon__image--full");
    }

    document.getElementById("moon-name").textContent = moon.name;
    document.getElementById("moon-light").textContent = moon.illumination + "% lit";

    let fullText = "";
    if (moon.isFull) {
        fullText = "Full moon tonight!";
    } else if (moon.daysToFull === 1) {
        fullText = "Full moon in 1 day";
    } else {
        fullText = "Full moon in " + moon.daysToFull + " days";
    }
    document.getElementById("moon-full").textContent = fullText;

    if (astronomy) {
        document.getElementById("moon-rise").textContent = to24Hours(astronomy.moonrise);
        document.getElementById("moon-set").textContent = to24Hours(astronomy.moonset);
    } else {
        document.getElementById("moon-rise").textContent = "--";
        document.getElementById("moon-set").textContent = "--";
    }

    document.getElementById("moon-reading").textContent = nightSkyReading(hourly, timeZone, moon);
}

function renderAlmanac(ms, timeZone, southern) {
    // Zodiac signs (we use the white symbols on the dark cards)
    const sun = sunSign(ms);
    const moonIn = moonSign(ms);
    document.getElementById("sun-sign").textContent = capitalize(sun);
    document.getElementById("sun-sign-icon").src = "assets/zodiac/" + sun + "-white.png";
    document.getElementById("moon-sign").textContent = capitalize(moonIn);
    document.getElementById("moon-sign-icon").src = "assets/zodiac/" + moonIn + "-white.png";

    // Next witchy holiday
    const sabbat = nextSabbat(ms, timeZone, southern);
    document.getElementById("sabbat-name").textContent = sabbat.name;

    let daysText = "";
    if (sabbat.daysLeft === 0) {
        daysText = "is today! ✨";
    } else if (sabbat.daysLeft === 1) {
        daysText = "in 1 day";
    } else {
        daysText = "in " + sabbat.daysLeft + " days";
    }
    document.getElementById("sabbat-days").textContent = daysText;

    // Samhain gets the dancing pixel pumpkin, the other holidays get an emoji :)
    const icon = document.getElementById("sabbat-icon");
    if (sabbat.name === "Samhain") {
        icon.textContent = "";
        icon.classList.add("sabbat__icon--pumpkin");
    } else {
        icon.textContent = sabbat.icon;
        icon.classList.remove("sabbat__icon--pumpkin");
    }
}
