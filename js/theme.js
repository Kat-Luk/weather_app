// Choosing the scene
// looks at the weather, temperature, time, moon and picks scene -> sky.js 

// All the scenes
// layers = the speed of each picture layer, from the back to the front.
//   0 means the layer stays still (sky, sea, mountains, trees).
//   number means it drifts sideways (clouds), in pixels per second.
//
//challenge: deciding which layers can move. 
// Clouds can drift, but no mountains etc

const SCENES = {
    "clouds-1": { layers: [0, 3, 1.5, 6] },          
    "clouds-3": { layers: [0, 1.5, 3, 5] },          
    "clouds-4": { layers: [0, 1.5, 3, 5] },          
    "clouds-6": { layers: [0, 1, 2.5, 4, 6, 8] },    
    "clouds-7": { layers: [0, 0, 2.5, 4] },      
    "clouds-8": { layers: [0, 1.5, 2.5, 4, 5.5] },   
    "ocean-1":  { layers: [0, 1, 3] },             
    "ocean-3":  { layers: [0, 0, 3, 5] },        
    "ocean-4":  { layers: [0, 2.5, 4, 5.5] },      
    "ocean-5":  { layers: [0, 2, 3.5] },         
    "ocean-6":  { layers: [0, 0, 2] },             
    "ocean-8":  { layers: [0, 2, 3, 4.5] },    
    "winter-1": { layers: [0, 0] },           
    "winter-2": { layers: [0, 0, 0, 0] },            
    "winter-3": { layers: [0, 0, 0, 0, 0, 0, 0, 0, 0] }, 
    "winter-4": { layers: [0, 0, 0, 0] },    
};


// what time
// Personal FAV mini magical detail: golden = the magic hour, about 45 minutes around sunrise or sunset.
function timeOfDay(ms, sunTimes, timeZone) {
    const goldenTime = 45 * 60 * 1000;

    for (const day of sunTimes) {
        const nearSunset = Math.abs(ms - day.set) < goldenTime;
        const nearSunrise = Math.abs(ms - day.rise) < goldenTime;
        if (nearSunset || nearSunrise) {
            return "golden";
        }
    }

    if (isDaytime(ms, sunTimes, timeZone)) {
        return "day";
    }
    return "night";
}


// picking scene
// moon =  result of getMoonInfo() in moon.js
function chooseScene(tempC, condition, time, moon) {
    let freezing = false;
    if (tempC <= 0 || condition === "snow" || condition === "sleet") {
        freezing = true;
    }

    let wet = false;
    if (condition === "rain" || condition === "showers" || condition === "drizzle" || condition === "thunder") {
        wet = true;
    }

    let grey = false;
    if (wet || condition === "cloudy" || condition === "fog") {
        grey = true;
    }

    // Night
    if (time === "night") {
        if (moon.isFull && !grey) {
            if (freezing) {
                return "winter-4";
            }
            return "ocean-6";
        }
        if (freezing) {
            return "winter-3";
        }
        if (grey) {
            return "clouds-3";
        }
        return "clouds-8";
    }

    // Sunrise or sunset
    if (time === "golden") {
        if (wet) {
            return "clouds-4";
        }
        if (freezing) {
            return "winter-4";
        }
        if (tempC >= 18) {
            return "ocean-5";
        }
        return "clouds-7";
    }

    // Daytime
    if (condition === "thunder") {
        return "clouds-4";
    }
    if (condition === "snow" || condition === "sleet") {
        return "winter-1";
    }
    if (wet) {
        if (freezing) {
            return "winter-1";
        }
        return "ocean-8";
    }
    if (grey) {
        if (freezing) {
            return "winter-1";
        }
        return "clouds-6";
    }
    if (condition === "partly" || condition === "mostlyClear") {
        if (freezing) {
            return "winter-2";
        }
        if (tempC >= 22) {
            return "ocean-4";
        }
        return "ocean-1";
    }

    // Clear sky
    if (freezing) {
        return "winter-2";
    }
    if (tempC >= 22) {
        return "ocean-3"; // beach day!
    }
    return "clouds-1";
}


// Putting it all on screen
// current = forecast.current (temp, condition, wind, precip)
function applyTheme(current, time, moon) {
    const sceneName = chooseScene(current.temp, current.condition, time, moon);
    showScene(sceneName, SCENES[sceneName], current.wind);

    // Rain, snow, lightning, fog and the flying visitors (sky.js)
    setWeatherEffects(current.condition, current.precip, current.wind, time);
}
