const API_URL = 'https://rickandmortyapi.com/api/character';

const container = document.getElementById('characters-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsCaption = document.getElementById('results-caption');
const characterList = document.getElementById('character-list');
const characterModal = document.getElementById('character-modal');
const modalContent = document.getElementById('modal-content');
const clearResultsButton = document.getElementById('clear-results');
const soundToggle = document.getElementById('sound-toggle');
const siteMusic = document.getElementById('site-music');
let musicIsPlaying = false;

function updateSoundButton() {
    soundToggle.setAttribute('aria-label', musicIsPlaying ? 'Apagar música' : 'Encender música');
    soundToggle.setAttribute('title', musicIsPlaying ? 'Apagar música' : 'Encender música');
    soundToggle.setAttribute('aria-pressed', String(musicIsPlaying));
    soundToggle.innerHTML = musicIsPlaying
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m17 9 5 6m0-6-5 6"/></svg>';
}

soundToggle.addEventListener('click', async () => {
    if (siteMusic.paused) {
        try {
            await siteMusic.play();
        } catch (error) {
            console.error('No se pudo reproducir el audio:', error);
        }
    } else {
        siteMusic.pause();
    }
});

siteMusic.addEventListener('play', () => { musicIsPlaying = true; updateSoundButton(); });
siteMusic.addEventListener('pause', () => { musicIsPlaying = false; updateSoundButton(); });

// Intenta iniciar el MP3 al entrar; el navegador puede requerir interacción del usuario.
siteMusic.play().catch(() => {
    musicIsPlaying = false;
    updateSoundButton();
});

async function getCharacters(search = '') {
    try {
        container.setAttribute('aria-busy', 'true');
        resultsCaption.textContent = 'Buscando personajes…';

        const value = search.trim();
        if (!/^\d+$/.test(value)) {
            resultsCaption.textContent = 'Escribe un ID numérico para buscar.';
            return;
        }

        const response = await fetch(`${API_URL}/${value}`);

        if (!response.ok) throw new Error('No se encontraron personajes');

        const data = await response.json();

        const characters = Array.isArray(data.results)
            ? data.results
            : [data];

        let added = 0;
        characters.forEach(character => {
            if (!container.querySelector(`[data-character-id="${character.id}"]`)) added += 1;
        });
        renderCharacters(characters);
        resultsCaption.textContent = `${container.querySelectorAll('.card').length} personajes guardados · ${added} nuevos`;

    } catch (error) {
        console.error('Error:', error);

        resultsCaption.textContent = 'No se encontraron personajes. Intenta con otro nombre o ID.';
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

// Llena únicamente el desplegable. Esta consulta inicial no muestra tarjetas.
async function loadAvailableCharacterNames() {
    try {
        const firstResponse = await fetch(API_URL);
        if (!firstResponse.ok) throw new Error('No se pudo cargar la lista');

        const firstPage = await firstResponse.json();
        const characters = [...firstPage.results];

        // La API entrega 20 personajes por página; recorremos las páginas restantes.
        const remainingPages = Array.from(
            { length: firstPage.info.pages - 1 },
            (_, index) => index + 2
        );
        const pageResults = await Promise.all(remainingPages.map(async page => {
            const response = await fetch(`${API_URL}/?page=${page}`);
            if (!response.ok) throw new Error('No se pudo cargar la lista completa');
            const data = await response.json();
            return data.results;
        }));

        pageResults.forEach(results => characters.push(...results));
        characterList.replaceChildren();
        characters.forEach(character => {
            const item = document.createElement('p');
            item.textContent = `${character.name} — ID: ${character.id}`;
            characterList.appendChild(item);
        });
    } catch (error) {
        console.error('Error al cargar nombres:', error);
        characterList.textContent = 'No se pudo cargar la lista de personajes.';
    }
}

function renderCharacters(characters) {
    if (characters.length === 0) {
        return;
    }

    characters.forEach(character => {
        if (container.querySelector(`[data-character-id="${character.id}"]`)) return;
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.characterId = character.id;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Ver ficha de ${character.name}`);
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.dataset.status = character.status.toLowerCase();
        badge.textContent = character.status;

        card.innerHTML = `
            <div class="card-image">
                <img src="${character.image}" alt="Retrato de ${character.name}" loading="lazy">
            </div>
            <div class="card-content">
                <div class="card-title-row">
                    <h2><small>#${character.id}</small> ${character.name}</h2>
                    <button type="button" class="remove-card" aria-label="Eliminar ${character.name}" title="Eliminar tarjeta">×</button>
                </div>
                <dl class="details">
                    <div><dt>Especie</dt><dd>${character.species}</dd></div>
                    <div><dt>Género</dt><dd>${character.gender}</dd></div>
                    <div><dt>Origen</dt><dd title="${character.origin.name}">${character.origin.name}</dd></div>
                    <div><dt>Ubicación</dt><dd title="${character.location.name}">${character.location.name}</dd></div>
                </dl>
            </div>
        `;

        card.querySelector('.card-image').appendChild(badge);
        card.querySelector('.remove-card').addEventListener('click', event => {
            event.stopPropagation();
            card.remove();
            updateSavedCount();
        });
        card.addEventListener('click', () => openCharacterModal(character));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCharacterModal(character);
            }
        });
        container.appendChild(card);
    });
}

function updateSavedCount() {
    const count = container.querySelectorAll('.card').length;
    resultsCaption.textContent = `${count} ${count === 1 ? 'personaje guardado' : 'personajes guardados'}`;
}

function openCharacterModal(character) {
    modalContent.replaceChildren();

    const layout = document.createElement('div');
    layout.className = 'modal-layout';

    const portrait = document.createElement('div');
    portrait.className = 'modal-portrait';
    const image = document.createElement('img');
    image.src = character.image;
    image.alt = `Retrato de ${character.name}`;
    portrait.appendChild(image);

    const info = document.createElement('div');
    info.className = 'modal-info';
    const top = document.createElement('div');
    top.className = 'modal-top';
    const kicker = document.createElement('span');
    kicker.className = 'modal-kicker';
    kicker.textContent = 'Ficha del personaje';
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Cerrar ficha');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => characterModal.close());
    top.append(kicker, closeButton);

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.id = 'modal-title';
    title.textContent = character.name;
    const id = document.createElement('p');
    id.className = 'modal-id';
    id.textContent = `Identificador #${character.id}`;
    const status = document.createElement('span');
    status.className = 'modal-status';
    status.dataset.status = character.status.toLowerCase();
    status.textContent = character.status;

    const details = document.createElement('dl');
    details.className = 'modal-details';
    const fields = [
        ['Especie', character.species],
        ['Tipo', character.type || 'Sin especificar'],
        ['Género', character.gender],
        ['Origen', character.origin.name],
        ['Ubicación actual', character.location.name],
        ['Episodios', String(character.episode.length)],
        ['Primera aparición', character.episode[0]?.split('/').pop() || 'Sin datos'],
        ['Creado', new Date(character.created).toLocaleDateString('es-MX')]
    ];
    fields.forEach(([label, value]) => {
        const field = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        field.append(term, description);
        details.appendChild(field);
    });

    info.append(top, title, id, status, details);
    layout.append(portrait, info);
    modalContent.appendChild(layout);
    characterModal.showModal();
}

characterModal.addEventListener('click', event => {
    if (event.target === characterModal) characterModal.close();
});

searchForm.addEventListener('submit', function(event) {
    event.preventDefault();

    getCharacters(searchInput.value);
});

searchInput.addEventListener('input', () => {
    searchInput.value = searchInput.value.replace(/\D/g, '');
});

clearResultsButton.addEventListener('click', () => {
    container.replaceChildren();
    resultsCaption.textContent = 'Personajes del universo de Rick and Morty';
});

loadAvailableCharacterNames();

