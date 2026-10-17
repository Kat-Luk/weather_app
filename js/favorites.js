// Favorite places
// Your favorite cities are kept in localStorage
let favorites = loadSetting("weather-favorites", []);

// checking for same place
//
// challenge: we can't compare names, because many places share a name
// (there is a Paris in France AND in Texas). We can't compare coordinates
// with === either, because they can differ in the last decimals depending
// on where they came from (search or GPS). So we say: if they are less than
// 0.01 degrees apart (about 1 km), it's the same place.
function samePlace(a, b) {
    const latitudeDifference = Math.abs(a.latitude - b.latitude);
    const longitudeDifference = Math.abs(a.longitude - b.longitude);

    if (latitudeDifference < 0.01 && longitudeDifference < 0.01) {
        return true;
    }
    return false;
}

function isFavorite(city) {
    for (const fav of favorites) {
        if (samePlace(fav, city)) {
            return true;
        }
    }
    return false;
}

// Makes a new list with every favorite EXCEPT this city
function withoutCity(city) {
    const newList = [];
    for (const fav of favorites) {
        if (!samePlace(fav, city)) {
            newList.push(fav);
        }
    }
    return newList;
}

// The star button: add the city if it's missing, remove it if it's there
function toggleFavorite(city) {
    if (isFavorite(city)) {
        favorites = withoutCity(city);
    } else {
        favorites.push({
            name: city.name,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude,
        });
    }
    saveSetting("weather-favorites", favorites);
}

function removeFavorite(city) {
    favorites = withoutCity(city);
    saveSetting("weather-favorites", favorites);
}

// list inside favorites menu.
function renderFavorites(onSelect, onChange) {
    const list = document.getElementById("favorites-list");
    list.innerHTML = "";

    if (favorites.length === 0) {
        list.innerHTML = '<li class="favorites__empty">No favorites yet. Tap ☆ next to a city name to add one.</li>';
        return;
    }

    for (const fav of favorites) {
        const li = document.createElement("li");
        li.className = "favorites__item";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "favorites__open";
        openButton.textContent = fav.name + ", " + fav.country;
        openButton.addEventListener("click", function () {
            onSelect(fav);
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "favorites__remove";
        removeButton.textContent = "✕";
        removeButton.title = "Remove " + fav.name;
        removeButton.setAttribute("aria-label", "Remove " + fav.name);
        removeButton.addEventListener("click", function () {
            removeFavorite(fav);
            onChange();
        });

        li.appendChild(openButton);
        li.appendChild(removeButton);
        list.appendChild(li);
    }
}
