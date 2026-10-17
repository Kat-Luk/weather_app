// This file makes the background move:
// 1) Parallax: every scene is made of several picture layers.
//     The cloud layers slide sideways at different speed.
// 2) Rain and snow, drawn as pixels on <canvas>.
// 3) Lightning, fog, and little night visitors: bats, the witch on her broom,
//    and a ghost when it's foggy.
// theme.js decides what scene this file draws it.


// Settings
const IMAGE_WIDTH = 576; 
const IMAGE_HEIGHT = 324;
const PIXEL_SIZE = 3;      // one rain or snow pixel

// Everything sky needs to remember between frames
const sky = {
    sceneName: null,   // the scene shown right now, for example "clouds-8"
    layers: [],        // the picture layers: { element, speed, loop, offset }
    windFactor: 1,     // more wind = faster clouds
    precip: { drops: [], slant: 0 },
    lastTime: 0,       // when the last frame was drawn
    thunderTimer: null,
    critterTimer: null,
};


// Scenes and their layers

// Changes the background
function showScene(name, scene, wind) {
    // Wind makes the clouds faster, but not crazyyyy fast
    if (!wind) {
        wind = 0;
    }
    sky.windFactor = 0.6 + wind / 5;
    if (sky.windFactor > 3) {
        sky.windFactor = 3;
    }

    if (name === sky.sceneName) {
        return;
    }
    sky.sceneName = name;

    // A new box for the new scene.
    const holder = document.createElement("div");
    holder.className = "sky__scene";

    const layers = [];
    for (let i = 0; i < scene.layers.length; i++) {
        const speed = scene.layers[i];

        // Challenge: a layer that moves must repeat forever without a visible
        // change where the picture ends and starts. Many of the original
        // pictures did NOT match at the edges. The fix: for every moving layer we
        // made a "-loop" version which is the picture + the same picture mirrored.
        // A mirrored copy always matches its neighbour perfectly at the edges.
        let loop = false;
        let file = "assets/backgrounds/" + name + "/" + (i + 1) + ".png";
        if (speed > 0) {
            loop = true;
            file = "assets/backgrounds/" + name + "/" + (i + 1) + "-loop.png";
        }

        const element = document.createElement("div");
        element.className = "sky__layer";
        element.style.backgroundImage = "url('" + file + "')";
        holder.appendChild(element);

        layers.push({
            element: element,
            speed: speed,
            loop: loop,
            offset: Math.random() * 500, // for not having always the same vibe
            file: file,
        });
    }

    // Wait until all the pictures have loaded, then fade the new scene in.
    // count the loaded pictures
    let loadedCount = 0;
    for (const layer of layers) {
        const img = new Image();
        img.onload = pictureReady;
        img.onerror = pictureReady;
        img.src = layer.file;
    }

    function pictureReady() {
        loadedCount = loadedCount + 1;
        if (loadedCount < layers.length) {
            return; // still waiting for some
        }

        // another scene picked while loading
        if (sky.sceneName !== name) {
            return;
        }

        const container = document.getElementById("sky-layers");
        const oldScenes = container.querySelectorAll(".sky__scene");
        container.appendChild(holder);
        sky.layers = layers;
        positionLayers(0);

        requestAnimationFrame(function () {
            holder.classList.add("sky__scene--visible");
        });

        // When the fade is done put away the old scene 
        setTimeout(function () {
            for (const old of oldScenes) {
                old.remove();
            }
        }, 1200);
    }
}

function sceneScale() {
    const scaleForWidth = window.innerWidth / IMAGE_WIDTH;
    const scaleForHeight = window.innerHeight / IMAGE_HEIGHT;
    if (scaleForWidth > scaleForHeight) {
        return scaleForWidth;
    }
    return scaleForHeight;
}


// Challenge: the screen can be any shape, from a tall phone to a very wide
// monitor, so CSS alone wasn't enough. AI calculated the size and position of the picture in JavaScript, every frame, and keep it centered.
function positionLayers(seconds) {
    const scale = sceneScale();
    const width = IMAGE_WIDTH * scale;
    const height = IMAGE_HEIGHT * scale;
    // Centered: half of the extra part goes on each side
    const startX = (window.innerWidth - width) / 2;
    const startY = (window.innerHeight - height) / 2;

    for (const layer of sky.layers) {
        // The loop pictures are twice as wide (picture + mirrored picture)
        let tileWidth = width;
        if (layer.loop) {
            tileWidth = width * 2;
        }

        layer.offset = layer.offset + layer.speed * sky.windFactor * seconds;

        // % (the remainder) keeps the number small. The picture repeats, so moving it by one full width looks exactly the same as not moving it.
        const x = (startX - layer.offset * scale) % tileWidth;

        layer.element.style.backgroundSize = tileWidth + "px " + height + "px";
        layer.element.style.backgroundPosition = x + "px " + startY + "px";
    }
}


// Rain and snow

// Challenge: if we drew raindrops at full screen size they would look smooth and modern, and not match the pixel art at all.
// So the canvas is only 1/3 of the screen size, and CSS stretches it with "image-rendering: pixelated".
// One canvas pixel becomes a 3 x 3 block on the screen, just like the art.
const canvas = document.getElementById("sky-precip");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = Math.ceil(window.innerWidth / PIXEL_SIZE);
    canvas.height = Math.ceil(window.innerHeight / PIXEL_SIZE);
}

// Makes one raindrop or snowflake.
// anywhere = true: start somewhere random on the screen (when the rain begins)
// anywhere = false: start just above the top (a new drop falling in)
function newDrop(type, anywhere) {
    const drop = {
        type: type,
        x: Math.random() * (canvas.width + 60) - 30,
        y: -5,
        speed: 0,
        length: 3 + Math.floor(Math.random() * 4), // rain drops are 3 to 6 pixels long
        size: 1,
        sway: Math.random() * Math.PI * 2,         // so the snowflakes don't all sway together
    };

    if (anywhere) {
        drop.y = Math.random() * canvas.height;
    }

    if (type === "rain") {
        drop.speed = 90 + Math.random() * 60;  // rain falls fast
    } else {
        drop.speed = 10 + Math.random() * 14;  // snow floats down slowly
        if (Math.random() < 0.3) {
            drop.size = 2;                     // some flakes are a bit bigger
        }
    }
    return drop;
}

function setPrecipitation(rainCount, snowCount, wind) {
    const drops = [];
    for (let i = 0; i < rainCount; i++) {
        drops.push(newDrop("rain", true));
    }
    for (let i = 0; i < snowCount; i++) {
        drops.push(newDrop("snow", true));
    }
    sky.precip.drops = drops;

    // Wind pushes the rain sideways (but not too much)
    if (!wind) {
        wind = 0;
    }
    sky.precip.slant = wind * 0.06;
    if (sky.precip.slant > 0.8) {
        sky.precip.slant = 0.8;
    }

    // No rain or snow anymore? Wipe the last drawing away
    if (drops.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function drawPrecipitation(seconds) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = performance.now() / 1000;

    for (let i = 0; i < sky.precip.drops.length; i++) {
        const drop = sky.precip.drops[i];
        drop.y = drop.y + drop.speed * seconds;

        if (drop.type === "rain") {
            drop.x = drop.x + drop.speed * sky.precip.slant * seconds;
            ctx.fillStyle = "rgba(214, 232, 255, 0.8)";
            ctx.fillRect(Math.round(drop.x), Math.round(drop.y), 1, drop.length);
        } else {
            // Snow sways from side to side. Math.sin goes up and down between -1 and 1 over time, that's the swaying.
            const sideways = Math.sin(time + drop.sway) * 6 + sky.precip.slant * 20;
            drop.x = drop.x + sideways * seconds;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(Math.round(drop.x), Math.round(drop.y), drop.size, drop.size);
        }

        // Fell out of the screen? Start a new one from the top.
        if (drop.y > canvas.height || drop.x > canvas.width + 30) {
            sky.precip.drops[i] = newDrop(drop.type, false);
        }
    }
}


// Weather effects (theme.js calls this)
function setWeatherEffects(condition, precip, wind, time) {
    if (!precip) {
        precip = 0;
    }
    if (precip > 5) {
        precip = 5;
    }
    const extra = precip * 25;

    let rain = 0;
    let snow = 0;
    if (condition === "drizzle") {
        rain = 70;
    } else if (condition === "rain") {
        rain = 140 + extra;
    } else if (condition === "showers") {
        rain = 160 + extra;
    } else if (condition === "thunder") {
        rain = 200 + extra;
    } else if (condition === "snow") {
        snow = 120 + extra;
    } else if (condition === "sleet") {
        // sleet is rain and snow at the same time
        rain = 70;
        snow = 60;
    }

    setPrecipitation(rain, snow, wind);

    // Lightning, only in thunderstorms
    clearTimeout(sky.thunderTimer);
    if (condition === "thunder") {
        scheduleLightning();
    }

    // Fog
    const fog = document.getElementById("sky-fog");
    if (condition === "fog") {
        fog.classList.add("sky__fog--visible");
    } else {
        fog.classList.remove("sky__fog--visible");
    }

    // Visitors: bats and the witch at night, a ghost in the fog
    clearTimeout(sky.critterTimer);
    scheduleCritters(condition, time);
}

// random flash
function scheduleLightning() {
    const waitTime = 4000 + Math.random() * 9000;

    sky.thunderTimer = setTimeout(function () {
        const flash = document.getElementById("sky-flash");
        flash.classList.remove("sky__flash--on");

        // Challenge: removing and adding the same class right away does NOT restart a CSS animation, the browser just ignores it.
        // Reading offsetWidth forces the browser to notice the class was gone, and then the animation plays again.
        void flash.offsetWidth;

        flash.classList.add("sky__flash--on");
        scheduleLightning(); // and plan the next one
    }, waitTime);
}


// Little visitors flying across the sky
const CRITTERS = {
    bat:   { sprite: "bat",   frames: 4, size: 32, scale: 2, seconds: 9 },
    witch: { sprite: "witch", frames: 4, size: 64, scale: 2, seconds: 14 },
    ghost: { sprite: "ghost", frames: 5, size: 32, scale: 3, seconds: 22 },
};

function scheduleCritters(condition, time) {
    // Who is allowed out in this weather?
    let choices = [];
    if (condition === "fog") {
        choices = ["ghost"];
    } else if (time === "night") {
        choices = ["bat", "bat", "witch"];
    } else if (time === "golden") {
        choices = ["witch"];
    }

    if (choices.length === 0) {
        return; // nobody during normal day
    }

    const waitTime = 6000 + Math.random() * 14000;
    sky.critterTimer = setTimeout(function () {
        const randomIndex = Math.floor(Math.random() * choices.length);
        const name = choices[randomIndex];
        spawnCritter(CRITTERS[name]);
        scheduleCritters(condition, time);
    }, waitTime);
}

function spawnCritter(critter) {
    const element = document.createElement("div");
    element.className = "critter sprite";
    element.style.backgroundImage = "url('assets/sprites/" + critter.sprite + ".png')";

    // The CSS animation reads the numbers
    const size = critter.size * critter.scale;
    element.style.setProperty("--frames", critter.frames);
    element.style.setProperty("--size", size + "px");
    element.style.setProperty("--fly-time", critter.seconds + "s");

    element.style.top = (8 + Math.random() * 35) + "vh";

    if (Math.random() < 0.5) {
        element.classList.add("critter--left");
    }

    document.getElementById("sky-critters").appendChild(element);

    // When the flight is over remove elements, so they wont pile up
    element.addEventListener("animationend", function (event) {
        if (event.animationName === "fly-right" || event.animationName === "fly-left") {
            element.remove();
        }
    });
}


// The animation loop
// challenge: we can't move things "3 pixels per frame", because a fast screen has more frames per second than a slow one, and the clouds would move faster on a better computer.
// So we measure the time between frames and move things "X pixels per SECOND" instead.
function frame(now) {
    let seconds = (now - sky.lastTime) / 1000;
    // After the tab was hidden, the gap can be huge -> limit it
    if (seconds > 0.1) {
        seconds = 0.1;
    }
    sky.lastTime = now;

    positionLayers(seconds);
    if (sky.precip.drops.length > 0) {
        drawPrecipitation(seconds);
    }

    requestAnimationFrame(frame);
}

window.addEventListener("resize", function () {
    resizeCanvas();
    positionLayers(0);
});

resizeCanvas();
requestAnimationFrame(function (now) {
    sky.lastTime = now;
    requestAnimationFrame(frame);
});
