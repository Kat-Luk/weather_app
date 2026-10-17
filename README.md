# Raining Cats & Witches

A cozy, witchy pixel art weather app. Course project (Project 2: Weather app).
Plain HTML, CSS and JavaScript, plus the Chart.js library for the chart.
Documentation: [docs/report.pdf](REPORT/report.pdf).

## How to run

Open the folder with a small local web server, for example the VS Code **Live Server** extension, or:

```
python -m http.server 5500
```

and go to http://localhost:5500. (A web server is needed for the GPS button: browsers allow location only on `https://` or `localhost` pages.)

The 3 main weather sources need no API keys. OpenWeatherMap (4th source) uses the key in `js/config.js`. Remove it after you're done.

## Folder structure

```
index.html                 page structure
css/style.css              all styles (mobile first, desktop in media queries)
js/config.js               default city, optional API key
js/utils.js                time zone, storage and fetch helpers
js/weather-icons.js        turns each provider's weather codes into one set of pixel icons
js/units.js                °C / °F / K conversion
js/sky.js                  animated background: parallax layers, rain, snow, lightning, bats...
js/theme.js                picks the background scene from the weather, time of day and moon
js/moon.js                 moon phase, zodiac signs, Wheel of the Year, the cat's advice
js/tarot.js                tarot card of the day (Tarot API)
js/favorites.js            favorite locations (localStorage)
js/chart.js                comparison chart (Chart.js)
js/providers/*.js          one file per weather source, all return the same data shape
js/app.js                  loads the data and draws the page
assets/backgrounds/        pixel art scenes, one folder per scene, one file per layer
assets/icons/              weather icons (recolored, 15x15 px)
assets/moon/               moon phases
assets/sprites/            animated sprites (witch, cat, cauldron, bat, ghost, pumpkin)
assets/tarot/              tarot cards (resized)
assets/zodiac/             zodiac symbols
REPORT/                    report (PDF + the HTML it was printed from)
```

## Data sources

| Source | Used for | Key |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | forecast, time zone, sunrise/sunset, city search | no |
| [MET Norway](https://api.met.no/) | forecast | no |
| [wttr.in](https://wttr.in/) | forecast, moonrise/moonset | no |
| [OpenWeatherMap](https://openweathermap.org/) | forecast | yes |
| [Tarot API](https://tarotapi.dev/) | tarot card names and meanings | no |
| [BigDataCloud](https://www.bigdatacloud.com/) | GPS coordinates → place name | no |

## Art credits


| Sky, ocean and winter backgrounds | [CraftPix.net](https://craftpix.net/) free packs | [CraftPix free license](https://craftpix.net/file-licenses/) |
| Weather icons | bgbw, DeviantArt ("Pixel weather icons")
| Moon phases | 
| Tarot Cats deck |
| Halloween set (witch, cat, cauldron, bat, ghost, pumpkin) | 
| Zodiac symbols | 
| Cat face on the tarot card back (recolored gold) | 
| Fonts | Pixelify Sans, Nunito ([Google Fonts](https://fonts.google.com/)) | SIL Open Font License |

The art files were resized, recolored (icons) or combined into sprite strips for the web; the originals are unchanged.
