// Tarot card of the day
// The card names and meanings come from the Tarot API (https://tarotapi.dev).
// The pictures are the "Tarot Cats" deck in assets/tarot/.
// The deck only has the 22 big cards (the Major Arcana).
//
// From API name to cat picture
const TAROT_CARDS = {
    "The Fool":           { file: "00", title: "The Fool" },
    "The Magician":       { file: "01", title: "The Magician" },
    "The High Priestess": { file: "02", title: "The High Priestess" },
    "The Empress":        { file: "03", title: "The Empress" },
    "The Emperor":        { file: "04", title: "The Emperor" },
    "The Hierophant":     { file: "05", title: "The Hierophant" },
    "The Lovers":         { file: "06", title: "The Lovers" },
    "The Chariot":        { file: "07", title: "The Chariot" },
    "Justice":            { file: "08", title: "Justice" },
    "The Hermit":         { file: "09", title: "The Hermit" },
    "Wheel Of Fortune":   { file: "10", title: "Wheel of Fortune" },
    "Fortitude":          { file: "11", title: "Strength" },
    "The Hanged Man":     { file: "12", title: "The Hanged Man" },
    "Death":              { file: "13", title: "Death" },
    "Temperance":         { file: "14", title: "Temperance" },
    "The Devil":          { file: "15", title: "The Devil" },
    "The Star":           { file: "16", title: "The Star" },
    "The Tower":          { file: "17", title: "The Tower" },
    "The Moon":           { file: "18", title: "The Moon" },
    "The Sun":            { file: "19", title: "The Sun" },
    "The Last Judgment":  { file: "20", title: "Judgement" },
    "The World":          { file: "21", title: "The World" },
};

const tarot = {
    cards: [],      // the 22 cards from the API
    current: null,  // the card on the table: { card, reversed }
    flipped: false, // face-up or flipped
};


// Getting the cards from the API
async function loadTarotCards() {
    try {
        const data = await fetchJson("https://tarotapi.dev/api/v1/cards");

        // The API has all 78 cards, we keep only the big ones that have a cat picture
        tarot.cards = [];
        for (const card of data.cards) {
            if (card.type === "major" && TAROT_CARDS[card.name]) {
                tarot.cards.push(card);
            }
        }
    } catch (error) {
        console.error("Tarot API", error);
        tarot.cards = [];
        for (const name in TAROT_CARDS) {
            tarot.cards.push({ name: name, meaning_up: "", meaning_rev: "" });
        }
    }
}


// The card of the day
function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        // Every letter changes the number a bit.
        hash = (hash * 31 + text.charCodeAt(i)) % 1000003;
    }
    return hash;
}

function cardOfTheDay(timeZone) {
    const today = dayKey(Date.now(), timeZone);
    const hash = hashText(today + "-tarot");

    // % gives a number from 0 to 21, which is a spot in the list of cards
    const index = hash % tarot.cards.length;

    // About 1 in 5 cards comes upside down ("reversed")
    let reversed = false;
    if (hash % 5 === 0) {
        reversed = true;
    }

    return { card: tarot.cards[index], reversed: reversed };
}

function randomCard() {
    const index = Math.floor(Math.random() * tarot.cards.length);
    let reversed = false;
    if (Math.random() < 0.2) {
        reversed = true;
    }
    return { card: tarot.cards[index], reversed: reversed };
}


// Showing and flipping the card
// Puts a card on the table (face down)
function showTarot(draw) {
    tarot.current = draw;
    const info = TAROT_CARDS[draw.card.name];

    const image = document.getElementById("tarot-image");
    image.src = "assets/tarot/" + info.file + ".jpg";

    if (draw.reversed) {
        image.alt = info.title + " (reversed)";
        image.classList.add("tarot__front--reversed");
    } else {
        image.alt = info.title;
        image.classList.remove("tarot__front--reversed");
    }
}

// open = true turns the card face up, false turns it face down.
// The turning itself is done by CSS (a 3D rotation, in style.css).
function flipTarot(open) {
    tarot.flipped = open;

    const cardButton = document.getElementById("tarot-card");
    if (open) {
        cardButton.classList.add("tarot__card--flipped");
    } else {
        cardButton.classList.remove("tarot__card--flipped");
    }
    cardButton.setAttribute("aria-pressed", open);

    const name = document.getElementById("tarot-name");
    const orientation = document.getElementById("tarot-orientation");
    const meaning = document.getElementById("tarot-meaning");

    // Face down
    if (!open || !tarot.current) {
        name.textContent = "Your card of the day";
        orientation.textContent = "";
        meaning.textContent = "Tap the card to turn it over…";
        return;
    }

    // Face up: show the name and the meaning
    const draw = tarot.current;
    name.textContent = TAROT_CARDS[draw.card.name].title;

    let text = "";
    if (draw.reversed) {
        orientation.textContent = "Reversed";
        text = draw.card.meaning_rev;
    } else {
        orientation.textContent = "Upright";
        text = draw.card.meaning_up;
    }

    if (!text) {
        text = "The spirits are quiet. (Card meanings could not be loaded.)";
    }
    meaning.textContent = text;
}

// app.js calls this when a city is loaded
async function setupTarot(timeZone) {
    // Only ask the API once, the cards don't change
    if (tarot.cards.length === 0) {
        await loadTarotCards();
    }
    showTarot(cardOfTheDay(timeZone));
    flipTarot(false);
}

// Tap the card: turn it over (or back)
document.getElementById("tarot-card").addEventListener("click", function () {
    if (tarot.current) {
        flipTarot(!tarot.flipped);
    }
});

// "Draw again"
document.getElementById("tarot-again").addEventListener("click", function () {
    if (tarot.cards.length === 0) {
        return; // cards not loaded yet
    }
    flipTarot(false);

    // Wait until the card has turned face down before changing the picture
    setTimeout(function () {
        showTarot(randomCard());
        flipTarot(true);
    }, 450);
});
