(function () {
    const STORAGE_KEY = "ghostMusicLibrary:v1";
    const LIBRARY_FILE = "library.json";
    const FADE_MS = 420;
    const DEFAULT_VOLUME = 80;
    const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
    const MAX_ART_BYTES = 1.5 * 1024 * 1024;
    const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

    const ICONS = {
        drag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5h.01M14 5h.01M10 12h.01M14 12h.01M10 19h.01M14 19h.01"/></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
        dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6h.01M12 12h.01M12 18h.01"/></svg>',
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
        shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 7h3c3.5 0 5 10 8.5 10H21M16 21h5v-5M4 17h3c1.4 0 2.4-1.5 3.4-3.2"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
    };

    const state = {
        songs: [],
        playlists: [],
        albumArt: {},
        artistArt: {},
        activePlaylistId: "library",
        currentSongId: null,
        queue: [],
        queueIndex: -1,
        volume: DEFAULT_VOLUME,
        shuffle: false
    };

    const elements = {};
    let player = null;
    let isPlayerReady = false;
    let isPlaying = false;
    let fadeTimer = null;
    let resumeBacktrackSeconds = 0;
    let dragState = null;
    let currentPlaylistPickerSongId = "";
    let pendingNewPlaylistSongId = "";
    let currentSongMenuId = "";
    let pendingArtTarget = null;
    let useNativeQueue = false;

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheElements();
        await loadState();
        bindEvents();
        setupMediaSession();
        render();
        if (window.location.protocol === "file:") {
            setStatus("Open this through GitHub Pages or a local HTTP server. YouTube embeds can fail from file://.");
        }
        loadYouTubeApi();
    }

    function cacheElements() {
        elements.appShell = document.getElementById("app-shell");
        elements.sidebar = document.getElementById("sidebar");
        elements.brandLogoButton = document.getElementById("brand-logo-button");
        elements.brandMenu = document.getElementById("brand-menu");
        elements.sidebarToggle = document.getElementById("sidebar-toggle");
        elements.libraryCount = document.getElementById("library-count");
        elements.playlistList = document.getElementById("playlist-list");
        elements.albumList = document.getElementById("album-list");
        elements.artistList = document.getElementById("artist-list");
        elements.artistToggleButton = document.getElementById("artist-toggle-button");
        elements.albumToggleButton = document.getElementById("album-toggle-button");
        elements.activeKind = document.getElementById("active-kind");
        elements.activeTitle = document.getElementById("active-title");
        elements.activeSubtitle = document.getElementById("active-subtitle");
        elements.collectionArt = document.getElementById("collection-art");
        elements.collectionArtButton = document.getElementById("collection-art-button");
        elements.playViewButton = document.getElementById("play-view-button");
        elements.deletePlaylistButton = document.getElementById("delete-playlist-button");
        elements.shufflePlaylistButton = document.getElementById("shuffle-playlist-button");
        elements.songList = document.getElementById("song-list");
        elements.emptyState = document.getElementById("empty-state");
        elements.searchInput = document.getElementById("search-input");
        elements.globalSearchInput = document.getElementById("global-search-input");
        elements.globalSearchPanel = document.getElementById("global-search-panel");
        elements.globalSearchResults = document.getElementById("global-search-results");
        elements.youtubeRecommendations = document.getElementById("youtube-recommendations");
        elements.searchAddLink = document.getElementById("search-add-link");
        elements.openAddButton = document.getElementById("open-add-button");
        elements.addSongDialog = document.getElementById("add-song-dialog");
        elements.closeAddDialogButton = document.getElementById("close-add-dialog-button");
        elements.songForm = document.getElementById("song-form");
        elements.youtubeUrl = document.getElementById("youtube-url");
        elements.songTitle = document.getElementById("song-title");
        elements.songArtist = document.getElementById("song-artist");
        elements.songAlbum = document.getElementById("song-album");
        elements.albumSuggestions = document.getElementById("album-suggestions");
        elements.artistSuggestions = document.getElementById("artist-suggestions");
        elements.playlistTarget = document.getElementById("playlist-target");
        elements.youtubeSearchButton = document.getElementById("youtube-search-button");
        elements.exportButton = document.getElementById("export-button");
        elements.importFile = document.getElementById("import-file");
        elements.newPlaylistButton = document.getElementById("new-playlist-button");
        elements.playlistDialog = document.getElementById("playlist-dialog");
        elements.playlistForm = document.getElementById("playlist-form");
        elements.playlistName = document.getElementById("playlist-name");
        elements.cancelPlaylistButton = document.getElementById("cancel-playlist-button");
        elements.playlistPickerDialog = document.getElementById("playlist-picker-dialog");
        elements.playlistPickerTitle = document.getElementById("playlist-picker-title");
        elements.playlistPickerList = document.getElementById("playlist-picker-list");
        elements.closePlaylistPickerButton = document.getElementById("close-playlist-picker-button");
        elements.pickerNewPlaylistButton = document.getElementById("picker-new-playlist-button");
        elements.songMenuDialog = document.getElementById("song-menu-dialog");
        elements.songMenuTitle = document.getElementById("song-menu-title");
        elements.songMenuActions = document.getElementById("song-menu-actions");
        elements.closeSongMenuButton = document.getElementById("close-song-menu-button");
        elements.artDialog = document.getElementById("art-dialog");
        elements.artDialogTitle = document.getElementById("art-dialog-title");
        elements.closeArtDialogButton = document.getElementById("close-art-dialog-button");
        elements.uploadArtButton = document.getElementById("upload-art-button");
        elements.pasteArtUrlButton = document.getElementById("paste-art-url-button");
        elements.webArtSearchButton = document.getElementById("web-art-search-button");
        elements.clearArtButton = document.getElementById("clear-art-button");
        elements.artUploadFile = document.getElementById("art-upload-file");
        elements.nowArt = document.getElementById("now-art");
        elements.nowArtFallback = document.getElementById("now-art-fallback");
        elements.nowTitle = document.getElementById("now-title");
        elements.nowArtist = document.getElementById("now-artist");
        elements.previousButton = document.getElementById("previous-button");
        elements.playPauseButton = document.getElementById("play-pause-button");
        elements.nextButton = document.getElementById("next-button");
        elements.shuffleToggle = document.getElementById("shuffle-toggle");
        elements.volumeSlider = document.getElementById("volume-slider");
        elements.playerStatus = document.getElementById("player-status");
        elements.mobileBottomNav = document.querySelector(".mobile-bottom-nav");
    }

    function bindEvents() {
        elements.sidebar.addEventListener("click", function (event) {
            const button = event.target.closest("[data-playlist-id], [data-album-key], [data-artist-key]");
            if (!button) {
                return;
            }
            if (button.dataset.albumKey) {
                setActiveView("album:" + button.dataset.albumKey);
            } else if (button.dataset.artistKey) {
                setActiveView("artist:" + button.dataset.artistKey);
            } else {
                setActiveView(button.dataset.playlistId);
            }
            setMobileTab("songs");
        });

        elements.brandLogoButton.addEventListener("click", handleBrandLogoClick);
        elements.sidebarToggle.addEventListener("click", function () {
            elements.appShell.classList.add("sidebar-collapsed");
            elements.brandMenu.hidden = true;
        });

        elements.songForm.addEventListener("submit", handleSongSubmit);
        elements.songForm.addEventListener("keydown", preventPrematureSongSubmit);
        elements.youtubeUrl.addEventListener("change", fillFromYouTube);
        elements.youtubeSearchButton.addEventListener("click", openYouTubeSearch);
        elements.searchInput.addEventListener("input", renderSongs);
        elements.globalSearchInput.addEventListener("focus", showGlobalSearch);
        elements.globalSearchInput.addEventListener("input", showGlobalSearch);
        if (elements.openAddButton) {
            elements.openAddButton.addEventListener("click", openAddDialog);
        }
        elements.searchAddLink.addEventListener("click", openAddDialog);
        elements.closeAddDialogButton.addEventListener("click", closeAddDialog);
        elements.exportButton.addEventListener("click", exportLibrary);
        elements.importFile.addEventListener("change", importLibrary);
        elements.newPlaylistButton.addEventListener("click", function () {
            openPlaylistDialog();
        });
        elements.cancelPlaylistButton.addEventListener("click", closePlaylistDialog);
        elements.playlistForm.addEventListener("submit", createPlaylist);
        elements.deletePlaylistButton.addEventListener("click", deleteActivePlaylist);
        elements.artistToggleButton.addEventListener("click", function () {
            toggleSidebarSection(elements.artistList, elements.artistToggleButton);
        });
        elements.albumToggleButton.addEventListener("click", function () {
            toggleSidebarSection(elements.albumList, elements.albumToggleButton);
        });
        elements.collectionArt.addEventListener("click", openArtDialog);
        elements.collectionArt.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openArtDialog();
            }
        });
        elements.collectionArtButton.addEventListener("click", openArtDialog);
        elements.playViewButton.addEventListener("click", playActiveViewInOrder);
        elements.shufflePlaylistButton.addEventListener("click", playActivePlaylistShuffled);
        elements.previousButton.addEventListener("click", playPrevious);
        elements.playPauseButton.addEventListener("click", togglePlayPause);
        elements.nextButton.addEventListener("click", playNext);
        elements.shuffleToggle.addEventListener("click", toggleShuffle);
        elements.volumeSlider.addEventListener("input", updateVolume);
        elements.closePlaylistPickerButton.addEventListener("click", closePlaylistPicker);
        elements.pickerNewPlaylistButton.addEventListener("click", function () {
            pendingNewPlaylistSongId = currentPlaylistPickerSongId;
            openPlaylistDialog();
        });
        elements.closeSongMenuButton.addEventListener("click", closeSongMenu);
        elements.closeArtDialogButton.addEventListener("click", closeArtDialog);
        elements.uploadArtButton.addEventListener("click", beginArtUpload);
        elements.pasteArtUrlButton.addEventListener("click", pasteArtUrl);
        elements.webArtSearchButton.addEventListener("click", openAlbumArtSearch);
        elements.clearArtButton.addEventListener("click", clearCollectionArt);
        elements.artUploadFile.addEventListener("change", handleArtUpload);

        elements.mobileBottomNav.addEventListener("click", function (event) {
            const button = event.target.closest("[data-mobile-tab-target]");
            if (!button) {
                return;
            }
            setMobileTab(button.dataset.mobileTabTarget);
        });

        document.addEventListener("click", function (event) {
            if (event.target.closest(".topbar") || event.target.closest("dialog")) {
                return;
            }
            elements.globalSearchPanel.hidden = true;
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                elements.globalSearchPanel.hidden = true;
            }
        });
    }

    async function loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                hydrateLibrary(JSON.parse(stored));
                return;
            } catch (error) {
                console.warn("Could not load saved Musicat library.", error);
            }
        }

        try {
            const response = await fetch(LIBRARY_FILE, { cache: "no-store" });
            if (response.ok) {
                hydrateLibrary(await response.json());
            }
        } catch (error) {
            return;
        }
    }

    function hydrateLibrary(parsed) {
        const songs = Array.isArray(parsed.songs) ? parsed.songs.map(normalizeSong).filter(Boolean) : [];
        const songIds = new Set(songs.map(function (song) {
            return song.id;
        }));

        state.songs = songs;
        state.playlists = Array.isArray(parsed.playlists)
            ? parsed.playlists.map(function (playlist) {
                return normalizePlaylist(playlist, songIds);
            }).filter(Boolean)
            : [];
        state.albumArt = cleanArtMap(parsed.albumArt);
        state.artistArt = cleanArtMap(parsed.artistArt);
        state.activePlaylistId = cleanActiveView(parsed.activePlaylistId);
        state.volume = Number.isFinite(parsed.volume) ? clamp(parsed.volume, 0, 100) : DEFAULT_VOLUME;
        state.shuffle = Boolean(parsed.shuffle);
    }

    function normalizeSong(raw) {
        if (!raw || typeof raw !== "object") {
            return null;
        }
        const parsed = parseYouTubeUrl(raw.url || raw.youtubeUrl || "");
        const youtubeId = normalizeYouTubeId(raw.youtubeId) || (parsed ? parsed.videoId : "");
        const id = cleanText(raw.id, "", 140) || createId("song");
        return {
            id: id,
            youtubeId: youtubeId,
            url: youtubeId ? "https://www.youtube.com/watch?v=" + youtubeId : "",
            title: cleanText(raw.title, "Untitled", 220),
            artist: cleanText(raw.artist, "", 220),
            album: cleanText(raw.album, "", 220),
            albumId: cleanText(raw.albumId, "", 160),
            albumArtist: cleanText(raw.albumArtist, raw.artist || "", 220),
            albumTotalTracks: parsePositiveInteger(raw.albumTotalTracks),
            trackNumber: parsePositiveInteger(raw.trackNumber),
            discNumber: parsePositiveInteger(raw.discNumber) || 1,
            albumOrder: parsePositiveInteger(raw.albumOrder),
            artUrl: cleanImageUrl(raw.artUrl || raw.albumArt) || (youtubeId ? thumbnailFor(youtubeId) : ""),
            spotifyId: cleanText(raw.spotifyId, "", 160),
            spotifyUrl: cleanUrl(raw.spotifyUrl || raw.sourceUrl),
            youtubeSearchUrl: cleanYouTubeUrl(raw.youtubeSearchUrl),
            addedAt: cleanText(raw.addedAt, new Date().toISOString(), 80)
        };
    }

    function normalizePlaylist(raw, songIds) {
        if (!raw || typeof raw !== "object") {
            return null;
        }
        const ids = Array.isArray(raw.songIds) ? raw.songIds : [];
        return {
            id: cleanText(raw.id, "", 140) || createId("playlist"),
            name: cleanText(raw.name, "Playlist", 160),
            songIds: uniqueIds(ids).filter(function (id) {
                return songIds.has(id);
            }),
            artUrl: cleanImageUrl(raw.artUrl),
            createdAt: cleanText(raw.createdAt, new Date().toISOString(), 80)
        };
    }

    function cleanArtMap(raw) {
        const next = {};
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            return next;
        }
        Object.keys(raw).forEach(function (key) {
            const cleanKey = cleanText(key, "", 220);
            const cleanArt = cleanImageUrl(raw[key]);
            if (cleanKey && cleanArt) {
                next[cleanKey] = cleanArt;
            }
        });
        return next;
    }

    function cleanActiveView(viewId) {
        const next = cleanText(viewId, "library", 260);
        if (next === "library" || next.startsWith("album:") || next.startsWith("artist:")) {
            return next;
        }
        return state.playlists.some(function (playlist) {
            return playlist.id === next;
        }) ? next : "library";
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            songs: state.songs,
            playlists: state.playlists,
            albumArt: state.albumArt,
            artistArt: state.artistArt,
            activePlaylistId: state.activePlaylistId,
            volume: state.volume,
            shuffle: state.shuffle
        }));
    }

    function render() {
        elements.libraryCount.textContent = songCountLabel(state.songs.length);
        elements.volumeSlider.value = String(state.volume);
        renderShuffleToggle();
        renderCollections();
        renderPlaylistTarget();
        renderActiveHeader();
        renderSongs();
        renderNowPlaying();
        updateTransportButtons();
        if (!elements.globalSearchPanel.hidden) {
            renderGlobalSearch();
        }
    }

    function renderCollections() {
        renderLibraryButton();
        renderArtists();
        renderPlaylistButtons();
        renderAlbums();
    }

    function renderLibraryButton() {
        const button = elements.sidebar.querySelector("[data-playlist-id='library']");
        if (button) {
            button.classList.toggle("active", state.activePlaylistId === "library");
        }
    }

    function renderPlaylistButtons() {
        elements.playlistList.replaceChildren();
        state.playlists.forEach(function (playlist) {
            elements.playlistList.appendChild(createCollectionButton({
                type: "playlist",
                id: playlist.id,
                title: playlist.name,
                subtitle: songCountLabel(playlist.songIds.length),
                artUrl: playlist.artUrl,
                seed: playlist.name
            }));
        });
    }

    function renderAlbums() {
        const albums = getAlbums();
        elements.albumList.replaceChildren();
        elements.albumSuggestions.replaceChildren();

        albums.forEach(function (album) {
            elements.albumList.appendChild(createCollectionButton({
                type: "album",
                key: album.key,
                title: album.name,
                subtitle: album.artist ? album.artist + " / " + albumSongCountLabel(album) : albumSongCountLabel(album),
                artUrl: getAlbumArt(album),
                seed: album.key
            }));

            const option = document.createElement("option");
            option.value = album.name;
            option.label = album.artist ? album.artist + " / " + albumSongCountLabel(album) : albumSongCountLabel(album);
            elements.albumSuggestions.appendChild(option);
        });
    }

    function renderArtists() {
        const artists = getArtists();
        elements.artistList.replaceChildren();
        elements.artistSuggestions.replaceChildren();

        artists.forEach(function (artist) {
            elements.artistList.appendChild(createCollectionButton({
                type: "artist",
                key: artist.key,
                title: artist.name,
                subtitle: songCountLabel(artist.songs.length),
                artUrl: getArtistArt(artist),
                seed: artist.key
            }));

            const option = document.createElement("option");
            option.value = artist.name;
            option.label = songCountLabel(artist.songs.length);
            elements.artistSuggestions.appendChild(option);
        });
    }

    function createCollectionButton(item) {
        const button = document.createElement("button");
        button.className = "collection-button";
        button.type = "button";
        button.classList.toggle("active", item.id ? state.activePlaylistId === item.id : state.activePlaylistId === item.type + ":" + item.key);
        if (item.type === "playlist") {
            button.dataset.playlistId = item.id;
        } else if (item.type === "album") {
            button.dataset.albumKey = item.key;
        } else if (item.type === "artist") {
            button.dataset.artistKey = item.key;
        }

        button.append(createCollectionSwatch(item.artUrl, item.seed), createCollectionCopy(item.title, item.subtitle));
        return button;
    }

    function createCollectionCopy(title, subtitle) {
        const copy = document.createElement("span");
        copy.className = "collection-copy";
        const titleNode = document.createElement("span");
        const subtitleNode = document.createElement("span");
        titleNode.textContent = title;
        subtitleNode.textContent = subtitle;
        copy.append(titleNode, subtitleNode);
        return copy;
    }

    function createCollectionSwatch(artUrl, seed) {
        const swatch = document.createElement("span");
        swatch.className = "collection-swatch";
        const cleanArt = cleanImageUrl(artUrl);
        if (cleanArt) {
            const img = document.createElement("img");
            img.src = cleanArt;
            img.alt = "";
            img.loading = "lazy";
            swatch.appendChild(img);
        } else {
            swatch.classList.add("sakura-gradient", gradientClass(seed));
        }
        return swatch;
    }

    function renderPlaylistTarget() {
        elements.playlistTarget.replaceChildren();

        const libraryOption = document.createElement("option");
        libraryOption.value = "library";
        libraryOption.textContent = "Library only";
        elements.playlistTarget.appendChild(libraryOption);

        state.playlists.forEach(function (playlist) {
            const option = document.createElement("option");
            option.value = playlist.id;
            option.textContent = playlist.name;
            elements.playlistTarget.appendChild(option);
        });

        if (state.activePlaylistId !== "library" && getActivePlaylist()) {
            elements.playlistTarget.value = state.activePlaylistId;
        }
    }

    function renderActiveHeader() {
        const info = getActiveCollectionInfo();
        elements.activeKind.textContent = info.kind;
        elements.activeTitle.textContent = info.title;
        elements.activeSubtitle.textContent = info.subtitle;
        elements.playViewButton.disabled = !getActiveSongs().some(function (song) {
            return song.youtubeId;
        });
        elements.deletePlaylistButton.hidden = true;
        elements.collectionArtButton.hidden = true;
        elements.shufflePlaylistButton.hidden = true;
        setButtonIconLabel(elements.playViewButton, "play", playLabelFor(info.type));
        setButtonIconLabel(elements.shufflePlaylistButton, "shuffle", "Shuffle");
        renderCollectionArt(info);
    }

    function toggleSidebarSection(list, button) {
        const nextHidden = !list.hidden;
        list.hidden = nextHidden;
        button.classList.toggle("collapsed", nextHidden);
        button.setAttribute("aria-expanded", String(!nextHidden));
    }

    function handleBrandLogoClick() {
        if (isMobileViewport()) {
            return;
        }
        if (elements.appShell.classList.contains("sidebar-collapsed")) {
            elements.appShell.classList.remove("sidebar-collapsed");
            elements.brandMenu.hidden = true;
            return;
        }
        elements.brandMenu.hidden = !elements.brandMenu.hidden;
    }

    function playLabelFor(type) {
        if (type === "album") {
            return "Play album";
        }
        if (type === "artist") {
            return "Play artist";
        }
        if (type === "playlist") {
            return "Play playlist";
        }
        return "Play";
    }

    function getActiveCollectionInfo() {
        if (isAlbumView()) {
            const album = getActiveAlbum();
            return {
                type: "album",
                kind: "Album",
                title: album ? album.name : "Missing album",
                subtitle: album ? (album.artist ? album.artist + " / " + albumSongCountLabel(album) : albumSongCountLabel(album)) : "No saved songs",
                artUrl: album ? getAlbumArt(album) : "",
                seed: album ? album.key : "missing-album",
                allowArt: Boolean(album),
                allowWeb: Boolean(album),
                key: album ? album.key : ""
            };
        }

        if (isArtistView()) {
            const artist = getActiveArtist();
            return {
                type: "artist",
                kind: "Artist",
                title: artist ? artist.name : "Missing artist",
                subtitle: artist ? songCountLabel(artist.songs.length) : "No saved songs",
                artUrl: artist ? getArtistArt(artist) : "",
                seed: artist ? artist.key : "missing-artist",
                allowArt: Boolean(artist),
                allowWeb: false,
                key: artist ? artist.key : ""
            };
        }

        const playlist = getActivePlaylist();
        if (playlist) {
            return {
                type: "playlist",
                kind: "Playlist",
                title: playlist.name,
                subtitle: songCountLabel(playlist.songIds.length),
                artUrl: playlist.artUrl,
                seed: playlist.name,
                allowArt: true,
                allowWeb: false,
                id: playlist.id
            };
        }

        return {
            type: "library",
            kind: "Library",
            title: "All Songs",
            subtitle: songCountLabel(state.songs.length) + " saved locally",
            artUrl: "",
            seed: "all-songs-library",
            allowArt: false,
            allowWeb: false
        };
    }

    function renderCollectionArt(info) {
        elements.collectionArt.replaceChildren();
        elements.collectionArt.className = "collection-art";
        elements.collectionArt.classList.toggle("can-edit", Boolean(info.allowArt));
        elements.collectionArt.tabIndex = info.allowArt ? 0 : -1;
        elements.collectionArt.setAttribute("aria-label", info.allowArt ? "Change artwork for " + info.title : info.title + " artwork");
        const cleanArt = cleanImageUrl(info.artUrl);
        if (cleanArt) {
            const img = document.createElement("img");
            img.src = cleanArt;
            img.alt = "";
            img.addEventListener("error", function () {
                renderCollectionArt(Object.assign({}, info, { artUrl: "" }));
            });
            elements.collectionArt.appendChild(img);
        } else {
            elements.collectionArt.classList.add("sakura-gradient", gradientClass(info.seed));
        }
    }

    function renderSongs() {
        const query = elements.searchInput.value.trim().toLowerCase();
        const songs = getActiveSongs().filter(function (song) {
            if (!query) {
                return true;
            }
            return [song.title, song.artist, song.album].some(function (value) {
                return String(value || "").toLowerCase().includes(query);
            });
        });

        elements.songList.replaceChildren();
        elements.emptyState.hidden = songs.length !== 0;
        if (!songs.length) {
            elements.emptyState.querySelector("p").textContent = query ? "No songs match that filter." : "No songs here yet.";
        }

        songs.forEach(function (song) {
            elements.songList.appendChild(createSongRow(song));
        });
    }

    function createSongRow(song, options) {
        const rowOptions = options || {};
        const row = document.createElement("article");
        row.className = "song-row";
        row.classList.toggle("no-drag", Boolean(rowOptions.hideDrag));
        row.dataset.songId = song.id;
        row.classList.toggle("playing", song.id === state.currentSongId);

        const reorderButton = document.createElement("button");
        reorderButton.className = "reorder-handle";
        reorderButton.type = "button";
        reorderButton.innerHTML = ICONS.drag;
        reorderButton.title = "Drag to reorder";
        reorderButton.setAttribute("aria-label", "Drag to reorder");
        reorderButton.disabled = rowOptions.hideDrag || !canReorderActiveView();
        reorderButton.addEventListener("pointerdown", startReorderDrag);

        const art = createArtwork(song, "song-art");

        const copy = document.createElement("div");
        copy.className = "song-copy";

        const title = document.createElement("button");
        title.className = "song-title-button";
        title.type = "button";
        title.textContent = song.title || "Untitled";
        title.title = song.title || "Untitled";
        title.addEventListener("click", function () {
            playSong(song.id, getQueueForRow(song.id, rowOptions));
        });

        const artist = document.createElement("p");
        artist.className = "song-artist";
        artist.textContent = song.artist || "Unknown artist";
        if (song.album) {
            artist.title = song.artist ? song.artist + " / " + song.album : song.album;
        }

        copy.append(title, artist);

        const addButton = document.createElement("button");
        addButton.className = "row-icon-button";
        addButton.type = "button";
        addButton.innerHTML = ICONS.plus;
        addButton.title = "Add or remove from playlists";
        addButton.setAttribute("aria-label", "Add or remove from playlists");
        addButton.addEventListener("click", function () {
            openPlaylistPicker(song.id);
        });

        const menuButton = document.createElement("button");
        menuButton.className = "row-icon-button";
        menuButton.type = "button";
        menuButton.innerHTML = ICONS.dots;
        menuButton.title = "Song menu";
        menuButton.setAttribute("aria-label", "Song menu");
        menuButton.addEventListener("click", function () {
            openSongMenu(song.id);
        });

        if (rowOptions.hideDrag) {
            row.append(art, copy, addButton, menuButton);
        } else {
            row.append(reorderButton, art, copy, addButton, menuButton);
        }
        return row;
    }

    function getQueueForRow(songId, options) {
        if (options && Array.isArray(options.queueSongs)) {
            const ids = options.queueSongs.filter(function (song) {
                return song.youtubeId;
            }).map(function (song) {
                return song.id;
            });
            return ids.length ? ids : getQueueForActiveSongs(songId);
        }
        return getQueueForActiveSongs(songId);
    }

    function startReorderDrag(event) {
        if (!canReorderActiveView()) {
            return;
        }

        const row = event.currentTarget.closest(".song-row");
        if (!row) {
            return;
        }

        dragState = {
            songId: row.dataset.songId,
            targetId: "",
            insertAfter: false
        };
        row.classList.add("dragging");
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.addEventListener("pointermove", updateReorderDrag);
        event.currentTarget.addEventListener("pointerup", finishReorderDrag, { once: true });
        event.currentTarget.addEventListener("pointercancel", cancelReorderDrag, { once: true });
        event.preventDefault();
    }

    function updateReorderDrag(event) {
        if (!dragState) {
            return;
        }

        clearDropMarkers();
        const rows = Array.from(elements.songList.querySelectorAll(".song-row:not(.dragging)"));
        const target = rows.find(function (row) {
            const rect = row.getBoundingClientRect();
            return event.clientY >= rect.top && event.clientY <= rect.bottom;
        });

        if (!target) {
            dragState.targetId = "";
            return;
        }

        const rect = target.getBoundingClientRect();
        dragState.targetId = target.dataset.songId;
        dragState.insertAfter = event.clientY > rect.top + rect.height / 2;
        target.classList.add(dragState.insertAfter ? "drop-after" : "drop-before");
    }

    function finishReorderDrag(event) {
        event.currentTarget.removeEventListener("pointermove", updateReorderDrag);
        const currentDrag = dragState;
        clearDropMarkers();
        dragState = null;

        if (currentDrag && currentDrag.targetId && currentDrag.targetId !== currentDrag.songId) {
            reorderActiveSong(currentDrag.songId, currentDrag.targetId, currentDrag.insertAfter);
        }
    }

    function cancelReorderDrag(event) {
        event.currentTarget.removeEventListener("pointermove", updateReorderDrag);
        clearDropMarkers();
        dragState = null;
    }

    function clearDropMarkers() {
        elements.songList.querySelectorAll(".song-row").forEach(function (row) {
            row.classList.remove("dragging", "drop-before", "drop-after");
        });
    }

    function canReorderActiveView() {
        return !elements.searchInput.value.trim() && (state.activePlaylistId === "library" || isAlbumView() || Boolean(getActivePlaylist()));
    }

    function reorderActiveSong(songId, targetId, insertAfter) {
        if (state.activePlaylistId === "library") {
            const orderedIds = state.songs.map(function (song) {
                return song.id;
            });
            const nextIds = reorderIds(orderedIds, songId, targetId, insertAfter);
            state.songs = nextIds.map(getSong).filter(Boolean);
        } else if (isAlbumView()) {
            const album = getActiveAlbum();
            if (!album) {
                return;
            }
            const orderedIds = album.songs.slice().sort(compareAlbumSongs).map(function (song) {
                return song.id;
            });
            applyAlbumOrder(reorderIds(orderedIds, songId, targetId, insertAfter));
        } else {
            const playlist = getActivePlaylist();
            if (!playlist) {
                return;
            }
            playlist.songIds = reorderIds(playlist.songIds, songId, targetId, insertAfter);
        }

        saveState();
        render();
        setStatus("Order updated.");
    }

    function reorderIds(ids, songId, targetId, insertAfter) {
        const next = ids.filter(function (id) {
            return id !== songId;
        });
        const targetIndex = next.indexOf(targetId);
        if (targetIndex === -1) {
            return ids;
        }
        next.splice(targetIndex + (insertAfter ? 1 : 0), 0, songId);
        return next;
    }

    function applyAlbumOrder(songIds) {
        songIds.forEach(function (songId, index) {
            const song = getSong(songId);
            if (song) {
                song.albumOrder = index + 1;
            }
        });
    }

    function createArtwork(song, className) {
        const artUrl = cleanImageUrl(song.artUrl);
        if (artUrl) {
            const img = document.createElement("img");
            img.className = className;
            img.src = artUrl;
            img.alt = "";
            img.loading = "lazy";
            img.addEventListener("error", function () {
                img.replaceWith(createFallbackArtwork(song));
            });
            return img;
        }

        return createFallbackArtwork(song);
    }

    function createFallbackArtwork(song) {
        const fallback = document.createElement("div");
        fallback.className = "cover-fallback sakura-gradient " + gradientClass(song.album || song.artist || song.title);
        fallback.textContent = initials(song);
        return fallback;
    }

    function compactMeta(song) {
        const chunks = [];
        if (song.artist) {
            chunks.push(song.artist);
        }
        if (song.album) {
            chunks.push(song.album);
        }
        if (!song.youtubeId) {
            chunks.push("Needs YouTube URL");
        }
        return chunks.join(" / ") || "Unknown artist";
    }

    function initials(song) {
        const seed = song.title || song.artist || "?";
        return seed.trim().slice(0, 2).toUpperCase();
    }

    function showGlobalSearch() {
        renderGlobalSearch();
        elements.globalSearchPanel.hidden = false;
    }

    function renderGlobalSearch() {
        const query = elements.globalSearchInput.value.trim();
        elements.globalSearchResults.replaceChildren();
        elements.youtubeRecommendations.replaceChildren();

        if (!query) {
            const helper = document.createElement("p");
            helper.className = "helper-copy";
            helper.textContent = "Search your saved songs, albums, artists, and playlists.";
            elements.globalSearchResults.appendChild(helper);
            renderYouTubeRecommendations("");
            return;
        }

        const localQuery = query.toLowerCase();
        const songMatches = state.songs.filter(function (song) {
            return [song.title, song.artist, song.album].some(function (value) {
                return String(value || "").toLowerCase().includes(localQuery);
            });
        }).slice(0, 6);
        const playlistMatches = state.playlists.filter(function (playlist) {
            return playlist.name.toLowerCase().includes(localQuery);
        }).slice(0, 5);
        const albumMatches = getAlbums().filter(function (album) {
            return [album.name, album.artist].some(function (value) {
                return String(value || "").toLowerCase().includes(localQuery);
            });
        }).slice(0, 5);
        const artistMatches = getArtists().filter(function (artist) {
            return artist.name.toLowerCase().includes(localQuery);
        }).slice(0, 5);

        addSearchSection("Songs", songMatches, function (song) {
            return createSongRow(song, {
                hideDrag: true,
                queueSongs: songMatches
            });
        });
        addSearchSection("Playlists", playlistMatches, function (playlist) {
            return createSearchButton(playlist.name, songCountLabel(playlist.songIds.length), function () {
                elements.globalSearchPanel.hidden = true;
                setActiveView(playlist.id);
                setMobileTab("songs");
            });
        });
        addSearchSection("Albums", albumMatches, function (album) {
            return createSearchButton(album.name, album.artist ? album.artist + " / " + albumSongCountLabel(album) : albumSongCountLabel(album), function () {
                elements.globalSearchPanel.hidden = true;
                setActiveView("album:" + album.key);
                setMobileTab("songs");
            });
        });
        addSearchSection("Artists", artistMatches, function (artist) {
            return createSearchButton(artist.name, songCountLabel(artist.songs.length), function () {
                elements.globalSearchPanel.hidden = true;
                setActiveView("artist:" + artist.key);
                setMobileTab("songs");
            });
        });

        if (!songMatches.length && !playlistMatches.length && !albumMatches.length && !artistMatches.length) {
            const empty = document.createElement("p");
            empty.className = "helper-copy";
            empty.textContent = "No local matches yet.";
            elements.globalSearchResults.appendChild(empty);
        }

        renderYouTubeRecommendations(query);
    }

    function addSearchSection(title, items, renderItem) {
        if (!items.length) {
            return;
        }
        const heading = document.createElement("p");
        heading.className = "search-section-title";
        heading.textContent = title;
        elements.globalSearchResults.appendChild(heading);
        items.forEach(function (item) {
            elements.globalSearchResults.appendChild(renderItem(item));
        });
    }

    function createSearchButton(title, subtitle, action) {
        const button = document.createElement("button");
        button.className = "search-result-button";
        button.type = "button";
        const strong = document.createElement("strong");
        const span = document.createElement("span");
        strong.textContent = title;
        span.textContent = subtitle;
        button.append(strong, span);
        button.addEventListener("click", action);
        return button;
    }

    function renderYouTubeRecommendations(query) {
        const heading = document.createElement("p");
        heading.className = "search-section-title";
        heading.textContent = "YouTube";
        elements.youtubeRecommendations.appendChild(heading);

        const link = document.createElement("a");
        link.className = "search-result-button";
        link.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query || "music official audio");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const strong = document.createElement("strong");
        const span = document.createElement("span");
        strong.textContent = "Search YouTube";
        span.textContent = "youtube.com";
        link.append(strong, span);
        elements.youtubeRecommendations.appendChild(link);
    }

    function openAddDialog() {
        if (isMobileViewport()) {
            setStatus("Add songs from desktop, then export library.json and push it to GitHub.");
            return;
        }
        elements.songForm.reset();
        renderPlaylistTarget();
        showDialog(elements.addSongDialog);
        window.setTimeout(function () {
            elements.youtubeUrl.focus();
        }, 0);
    }

    function closeAddDialog() {
        closeDialog(elements.addSongDialog);
    }

    function preventPrematureSongSubmit(event) {
        if (event.key !== "Enter" || event.target.tagName === "BUTTON") {
            return;
        }
        event.preventDefault();
        if (event.target === elements.youtubeUrl) {
            fillFromYouTube();
            setStatus("Looking up the title and artist. Use Save song when the details are ready.");
            return;
        }
        setStatus("Use Save song after the YouTube link, title, and artist are filled.");
    }

    function handleSongSubmit(event) {
        event.preventDefault();

        const url = elements.youtubeUrl.value.trim();
        const parsed = parseYouTubeUrl(url);
        if (!parsed) {
            setStatus("Paste a valid YouTube link before adding.");
            return;
        }

        const title = elements.songTitle.value.trim();
        const artist = elements.songArtist.value.trim();
        const album = elements.songAlbum.value.trim();
        if (!title || title === "Loading title...") {
            setStatus("Add or fetch the song title before saving.");
            elements.songTitle.focus();
            return;
        }
        if (!artist) {
            setStatus("Add or fetch the artist before saving.");
            elements.songArtist.focus();
            return;
        }
        const matchingAlbum = findAlbumByFormValues(album, artist);
        const targetPlaylistId = elements.playlistTarget.value;
        const existing = findMatchingSong({
            title: title,
            artist: artist,
            album: album
        }, parsed.videoId);

        let songId;
        if (existing) {
            existing.title = cleanText(title, existing.title || "Untitled", 220);
            existing.artist = cleanText(artist, existing.artist || "", 220);
            existing.album = cleanText(album, existing.album || "", 220);
            existing.youtubeId = parsed.videoId;
            existing.url = parsed.url;
            existing.artUrl = existing.artUrl || thumbnailFor(parsed.videoId);
            existing.albumId = matchingAlbum && matchingAlbum.albumId ? matchingAlbum.albumId : existing.albumId || "";
            existing.albumArtist = matchingAlbum && matchingAlbum.artist ? matchingAlbum.artist : existing.albumArtist || artist;
            existing.albumOrder = existing.albumOrder || getNextAlbumOrder(matchingAlbum);
            songId = existing.id;
        } else {
            const song = {
                id: createId("song"),
                youtubeId: parsed.videoId,
                url: parsed.url,
                title: cleanText(title, "Untitled", 220),
                artist: cleanText(artist, "", 220),
                album: cleanText(album, "", 220),
                albumId: matchingAlbum && matchingAlbum.albumId ? matchingAlbum.albumId : "",
                albumArtist: matchingAlbum && matchingAlbum.artist ? matchingAlbum.artist : artist,
                albumTotalTracks: matchingAlbum ? matchingAlbum.totalTracks : null,
                trackNumber: null,
                discNumber: 1,
                albumOrder: getNextAlbumOrder(matchingAlbum),
                artUrl: thumbnailFor(parsed.videoId),
                addedAt: new Date().toISOString()
            };
            state.songs.unshift(song);
            songId = song.id;
        }

        if (targetPlaylistId && targetPlaylistId !== "library") {
            addSongToPlaylist(songId, targetPlaylistId, true);
        }

        state.activePlaylistId = targetPlaylistId && targetPlaylistId !== "library" ? targetPlaylistId : "library";
        elements.songForm.reset();
        closeAddDialog();
        saveState();
        render();
        setStatus("Song saved.");
    }

    async function fillFromYouTube() {
        const parsed = parseYouTubeUrl(elements.youtubeUrl.value.trim());
        if (!parsed) {
            return;
        }

        if (!elements.songTitle.value.trim()) {
            elements.songTitle.value = "Loading title...";
        }

        try {
            const response = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(parsed.url));
            if (!response.ok) {
                throw new Error("YouTube metadata unavailable.");
            }

            const data = await response.json();
            if (data.title && (!elements.songTitle.value.trim() || elements.songTitle.value === "Loading title...")) {
                elements.songTitle.value = data.title;
            }
            if (data.author_name && !elements.songArtist.value.trim()) {
                elements.songArtist.value = data.author_name;
            }
        } catch (error) {
            if (elements.songTitle.value === "Loading title...") {
                elements.songTitle.value = "";
            }
        }
    }

    function openYouTubeSearch() {
        const query = [
            elements.songTitle.value.trim(),
            elements.songArtist.value.trim(),
            elements.songAlbum.value.trim(),
            "official audio"
        ].filter(Boolean).join(" ");

        if (!query) {
            setStatus("Add a title or artist to search YouTube.");
            return;
        }

        window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), "_blank", "noopener,noreferrer");
    }

    function addSongToPlaylist(songId, playlistId, quiet) {
        const playlist = state.playlists.find(function (item) {
            return item.id === playlistId;
        });
        if (!playlist) {
            if (!quiet) {
                setStatus("Choose a playlist first.");
            }
            return;
        }

        if (!playlist.songIds.includes(songId)) {
            playlist.songIds.push(songId);
            saveState();
            render();
            if (!quiet) {
                setStatus("Added to " + playlist.name + ".");
            }
            return;
        }

        if (!quiet) {
            setStatus("Already in " + playlist.name + ".");
        }
    }

    function toggleSongInPlaylist(songId, playlistId) {
        const playlist = state.playlists.find(function (item) {
            return item.id === playlistId;
        });
        if (!playlist) {
            return;
        }

        if (playlist.songIds.includes(songId)) {
            playlist.songIds = playlist.songIds.filter(function (id) {
                return id !== songId;
            });
            setStatus("Removed from " + playlist.name + ".");
        } else {
            playlist.songIds.push(songId);
            setStatus("Added to " + playlist.name + ".");
        }
        saveState();
        render();
        renderPlaylistPicker(songId);
    }

    function openPlaylistPicker(songId) {
        currentPlaylistPickerSongId = songId;
        renderPlaylistPicker(songId);
        showDialog(elements.playlistPickerDialog);
    }

    function renderPlaylistPicker(songId) {
        const song = getSong(songId);
        elements.playlistPickerTitle.textContent = song ? "Add " + (song.title || "song") + " to playlists" : "Add to playlists";
        elements.playlistPickerList.replaceChildren();

        if (!state.playlists.length) {
            const empty = document.createElement("p");
            empty.className = "helper-copy";
            empty.textContent = "No playlists yet.";
            elements.playlistPickerList.appendChild(empty);
            return;
        }

        state.playlists.forEach(function (playlist) {
            const active = playlist.songIds.includes(songId);
            const button = document.createElement("button");
            button.className = "picker-button";
            button.classList.toggle("active", active);
            button.type = "button";
            const strong = document.createElement("strong");
            const span = document.createElement("span");
            strong.textContent = playlist.name;
            span.textContent = active ? "In playlist" : "Not added";
            button.append(strong, span);
            if (active) {
                const check = document.createElement("span");
                check.innerHTML = ICONS.check;
                button.appendChild(check);
            }
            button.addEventListener("click", function () {
                toggleSongInPlaylist(songId, playlist.id);
            });
            elements.playlistPickerList.appendChild(button);
        });
    }

    function closePlaylistPicker() {
        currentPlaylistPickerSongId = "";
        closeDialog(elements.playlistPickerDialog);
    }

    function openSongMenu(songId) {
        const song = getSong(songId);
        if (!song) {
            return;
        }
        currentSongMenuId = songId;
        elements.songMenuTitle.textContent = song.title || "Untitled";
        elements.songMenuActions.replaceChildren();

        addSongMenuButton("Play", function () {
            closeSongMenu();
            playSong(songId, getQueueForActiveSongs(songId));
        });
        addSongMenuButton("Edit title, artist, album", function () {
            closeSongMenu();
            editSongDetails(songId);
        });
        addSongMenuButton(song.youtubeId ? "Edit YouTube URL" : "Set YouTube URL", function () {
            closeSongMenu();
            updateSongYouTube(songId);
        });
        addSongMenuButton("Search YouTube", function () {
            window.open(buildYouTubeSearchUrl(song), "_blank", "noopener,noreferrer");
        });

        if (isAlbumView()) {
            addSongMenuButton("Remove from this album", function () {
                closeSongMenu();
                clearSongAlbum(songId);
            });
        } else if (getActivePlaylist()) {
            addSongMenuButton("Remove from this playlist", function () {
                closeSongMenu();
                removeSongFromActivePlaylist(songId);
            });
        }

        addSongMenuButton("Delete from library", function () {
            closeSongMenu();
            deleteSongFromLibrary(songId);
        }, true);

        showDialog(elements.songMenuDialog);
    }

    function addSongMenuButton(label, action, danger) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.classList.toggle("danger-button", Boolean(danger));
        button.addEventListener("click", action);
        elements.songMenuActions.appendChild(button);
    }

    function closeSongMenu() {
        currentSongMenuId = "";
        closeDialog(elements.songMenuDialog);
    }

    function editSongDetails(songId) {
        const song = getSong(songId);
        if (!song) {
            return;
        }
        const title = window.prompt("Title:", song.title || "");
        if (title === null) {
            return;
        }
        const artist = window.prompt("Artist:", song.artist || "");
        if (artist === null) {
            return;
        }
        const album = window.prompt("Album:", song.album || "");
        if (album === null) {
            return;
        }

        const matchingAlbum = findAlbumByFormValues(album, artist);
        song.title = cleanText(title, "Untitled", 220);
        song.artist = cleanText(artist, "", 220);
        song.album = cleanText(album, "", 220);
        song.albumId = matchingAlbum && matchingAlbum.albumId ? matchingAlbum.albumId : song.albumId || "";
        song.albumArtist = matchingAlbum && matchingAlbum.artist ? matchingAlbum.artist : song.albumArtist || artist;
        song.albumOrder = song.albumOrder || getNextAlbumOrder(matchingAlbum);
        saveState();
        render();
        setStatus("Song details updated.");
    }

    function updateSongYouTube(songId) {
        const song = getSong(songId);
        if (!song) {
            return;
        }

        if (!song.youtubeId) {
            const searchUrl = cleanYouTubeUrl(song.youtubeSearchUrl) || buildYouTubeSearchUrl(song);
            window.open(searchUrl, "_blank", "noopener,noreferrer");
        }

        const nextUrl = window.prompt("Paste the YouTube URL for this song:", song.url || "");
        if (nextUrl === null) {
            return;
        }

        const parsed = parseYouTubeUrl(nextUrl.trim());
        if (!parsed) {
            setStatus("That was not a valid YouTube URL.");
            return;
        }

        song.youtubeId = parsed.videoId;
        song.url = parsed.url;
        song.artUrl = song.artUrl || thumbnailFor(parsed.videoId);
        saveState();
        render();
        setStatus("YouTube URL saved.");
    }

    function removeSongFromActivePlaylist(songId) {
        const playlist = getActivePlaylist();
        if (!playlist) {
            return;
        }
        playlist.songIds = playlist.songIds.filter(function (id) {
            return id !== songId;
        });
        saveState();
        render();
        setStatus("Removed from " + playlist.name + ".");
    }

    function clearSongAlbum(songId) {
        const song = getSong(songId);
        if (!song) {
            return;
        }
        song.album = "";
        song.albumId = "";
        song.albumArtist = "";
        song.albumTotalTracks = null;
        song.trackNumber = null;
        song.discNumber = null;
        song.albumOrder = null;
        state.activePlaylistId = "library";
        saveState();
        render();
        setStatus("Removed from album.");
    }

    function deleteSongFromLibrary(songId) {
        const song = getSong(songId);
        const ok = window.confirm("Delete " + (song ? song.title : "this song") + " from the library? This also removes it from playlists.");
        if (!ok) {
            return;
        }
        state.songs = state.songs.filter(function (item) {
            return item.id !== songId;
        });
        state.playlists.forEach(function (playlist) {
            playlist.songIds = playlist.songIds.filter(function (id) {
                return id !== songId;
            });
        });
        if (state.currentSongId === songId) {
            stopPlayback();
        }
        saveState();
        render();
        setStatus("Song deleted.");
    }

    function openPlaylistDialog() {
        elements.playlistName.value = "";
        showDialog(elements.playlistDialog);
        window.setTimeout(function () {
            elements.playlistName.focus();
        }, 0);
    }

    function closePlaylistDialog() {
        pendingNewPlaylistSongId = "";
        closeDialog(elements.playlistDialog);
    }

    function createPlaylist(event) {
        event.preventDefault();
        const playlist = addPlaylist(elements.playlistName.value.trim());
        closeDialog(elements.playlistDialog);
        if (playlist && pendingNewPlaylistSongId) {
            addSongToPlaylist(pendingNewPlaylistSongId, playlist.id, true);
            if (elements.playlistPickerDialog.open) {
                renderPlaylistPicker(pendingNewPlaylistSongId);
            }
        }
        pendingNewPlaylistSongId = "";
    }

    function addPlaylist(name) {
        if (!name) {
            return null;
        }

        const playlist = {
            id: createId("playlist"),
            name: cleanText(name, "Playlist", 160),
            songIds: [],
            artUrl: "",
            createdAt: new Date().toISOString()
        };
        state.playlists.push(playlist);
        state.activePlaylistId = playlist.id;
        saveState();
        render();
        setStatus("Playlist created.");
        return playlist;
    }

    function deleteActivePlaylist() {
        const playlist = getActivePlaylist();
        if (!playlist) {
            return;
        }
        const ok = window.confirm("Delete playlist " + playlist.name + "? Songs stay in your library.");
        if (!ok) {
            return;
        }
        state.playlists = state.playlists.filter(function (item) {
            return item.id !== playlist.id;
        });
        state.activePlaylistId = "library";
        saveState();
        render();
        setStatus("Playlist deleted.");
    }

    function openArtDialog() {
        const info = getActiveCollectionInfo();
        if (!info.allowArt) {
            setStatus("Library art uses generated artwork.");
            return;
        }
        pendingArtTarget = {
            type: info.type,
            id: info.id || "",
            key: info.key || "",
            title: info.title
        };
        elements.artDialogTitle.textContent = "Set art for " + info.title;
        elements.webArtSearchButton.hidden = !info.allowWeb;
        showDialog(elements.artDialog);
    }

    function closeArtDialog() {
        pendingArtTarget = null;
        closeDialog(elements.artDialog);
    }

    function beginArtUpload() {
        if (!pendingArtTarget) {
            return;
        }
        elements.artUploadFile.value = "";
        elements.artUploadFile.click();
    }

    function handleArtUpload(event) {
        const file = event.target.files[0];
        if (!file || !pendingArtTarget) {
            return;
        }
        if (!IMAGE_TYPES.has(file.type)) {
            setStatus("Use PNG, JPG, GIF, or WebP artwork.");
            return;
        }
        if (file.size > MAX_ART_BYTES) {
            setStatus("Artwork is too large. Keep it under 1.5 MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            const dataUrl = cleanImageUrl(String(reader.result || ""));
            if (!dataUrl) {
                setStatus("That image could not be used.");
                return;
            }
            setCollectionArt(dataUrl);
        };
        reader.readAsDataURL(file);
    }

    function pasteArtUrl() {
        if (!pendingArtTarget) {
            return;
        }
        const value = window.prompt("Paste an HTTPS image URL:", "");
        if (value === null) {
            return;
        }
        const url = cleanImageUrl(value);
        if (!url || url.startsWith("data:")) {
            setStatus("Use a direct HTTPS image URL.");
            return;
        }
        setCollectionArt(url);
    }

    function openAlbumArtSearch() {
        const info = getActiveCollectionInfo();
        if (info.type !== "album") {
            return;
        }
        window.open("https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(info.title + " " + info.subtitle + " album cover"), "_blank", "noopener,noreferrer");
    }

    function clearCollectionArt() {
        if (!pendingArtTarget) {
            return;
        }
        if (pendingArtTarget.type === "playlist") {
            const playlist = state.playlists.find(function (item) {
                return item.id === pendingArtTarget.id;
            });
            if (playlist) {
                playlist.artUrl = "";
            }
        } else if (pendingArtTarget.type === "album") {
            delete state.albumArt[pendingArtTarget.key];
        } else if (pendingArtTarget.type === "artist") {
            delete state.artistArt[pendingArtTarget.key];
        }
        saveState();
        render();
        closeArtDialog();
        setStatus("Using generated artwork.");
    }

    function setCollectionArt(url) {
        if (!pendingArtTarget) {
            return;
        }
        if (pendingArtTarget.type === "playlist") {
            const playlist = state.playlists.find(function (item) {
                return item.id === pendingArtTarget.id;
            });
            if (playlist) {
                playlist.artUrl = url;
            }
        } else if (pendingArtTarget.type === "album") {
            state.albumArt[pendingArtTarget.key] = url;
        } else if (pendingArtTarget.type === "artist") {
            state.artistArt[pendingArtTarget.key] = url;
        }
        saveState();
        render();
        closeArtDialog();
        setStatus("Artwork saved.");
    }

    function playActiveViewInOrder() {
        const playable = getActiveSongs().filter(function (song) {
            return song.youtubeId;
        });
        if (!playable.length) {
            setStatus("No playable songs in this view.");
            return;
        }
        const queue = playable.map(function (song) {
            return song.id;
        });
        playSong(queue[0], queue);
    }

    function playActivePlaylistShuffled() {
        const playable = getActiveSongs().filter(function (song) {
            return song.youtubeId;
        });
        if (!playable.length) {
            setStatus("No playable songs in this view.");
            return;
        }
        const queue = shuffleArray(playable.map(function (song) {
            return song.id;
        }));
        playSong(queue[0], queue);
    }

    function getQueueForSongSearch(startSongId, matches) {
        const ids = matches.filter(function (song) {
            return song.youtubeId;
        }).map(function (song) {
            return song.id;
        });
        return ids.length ? ids : getQueueForActiveSongs(startSongId);
    }

    function getQueueForActiveSongs(startSongId) {
        const playableIds = getActiveSongs().filter(function (song) {
            return song.youtubeId;
        }).map(function (song) {
            return song.id;
        });

        if (!state.shuffle) {
            return playableIds;
        }

        const rest = playableIds.filter(function (id) {
            return id !== startSongId;
        });
        return [startSongId].concat(shuffleArray(rest));
    }

    function playSong(songId, queue) {
        const song = getSong(songId);
        if (!song || !song.youtubeId) {
            setStatus("This song needs a YouTube URL first.");
            return;
        }
        if (!isPlayerReady || !player) {
            setStatus("Player is still loading.");
            return;
        }

        state.queue = Array.isArray(queue) && queue.length ? queue : [songId];
        state.queueIndex = Math.max(0, state.queue.indexOf(songId));
        state.currentSongId = songId;
        resumeBacktrackSeconds = 0;
        saveState();
        render();

        clearFade();
        player.setVolume(0);
        loadPlayerQueue(songId);
        player.playVideo();
        fadeTo(state.volume, FADE_MS);
        isPlaying = true;
        updateTransportButtons();
        updateMediaSession();
        setStatus("Playing " + song.title + ".");
    }

    function loadPlayerQueue(songId) {
        const videoIds = state.queue.map(function (id) {
            const item = getSong(id);
            return item ? item.youtubeId : "";
        }).filter(Boolean);
        useNativeQueue = videoIds.length > 1 && typeof player.loadPlaylist === "function";
        if (useNativeQueue) {
            player.loadPlaylist(videoIds, Math.max(0, state.queue.indexOf(songId)), 0, "small");
            return;
        }
        const song = getSong(songId);
        if (song) {
            player.loadVideoById(song.youtubeId);
        }
    }

    function togglePlayPause() {
        if (!player || !isPlayerReady) {
            setStatus("Player is still loading.");
            return;
        }

        if (!state.currentSongId) {
            const first = getActiveSongs().find(function (song) {
                return song.youtubeId;
            });
            if (first) {
                playSong(first.id, getQueueForActiveSongs(first.id));
            }
            return;
        }

        if (isPlaying) {
            const fadeStartedAt = performance.now();
            fadeTo(0, FADE_MS, function () {
                resumeBacktrackSeconds = Math.max(0, (performance.now() - fadeStartedAt) / 1000);
                player.pauseVideo();
                isPlaying = false;
                updateTransportButtons();
                updateMediaSession();
            });
        } else {
            rewindAfterFadeOut();
            player.setVolume(0);
            player.playVideo();
            fadeTo(state.volume, FADE_MS);
            isPlaying = true;
            updateTransportButtons();
            updateMediaSession();
        }
    }

    function playPrevious() {
        if (!state.queue.length) {
            return;
        }
        if (player && isPlayerReady && typeof player.getCurrentTime === "function" && player.getCurrentTime() > 3) {
            player.seekTo(0, true);
            setStatus("Restarted current song.");
            return;
        }
        const nextIndex = state.queueIndex <= 0 ? state.queue.length - 1 : state.queueIndex - 1;
        if (useNativeQueue && player && typeof player.previousVideo === "function") {
            state.queueIndex = nextIndex;
            state.currentSongId = state.queue[nextIndex];
            saveState();
            render();
            player.previousVideo();
            updateMediaSession();
            return;
        }
        playSong(state.queue[nextIndex], state.queue);
    }

    function playNext() {
        if (!state.queue.length) {
            return;
        }
        const nextIndex = state.queueIndex >= state.queue.length - 1 ? 0 : state.queueIndex + 1;
        if (useNativeQueue && player && typeof player.nextVideo === "function") {
            state.queueIndex = nextIndex;
            state.currentSongId = state.queue[nextIndex];
            saveState();
            render();
            player.nextVideo();
            updateMediaSession();
            return;
        }
        playSong(state.queue[nextIndex], state.queue);
    }

    function playNextAfterEnded() {
        if (useNativeQueue) {
            const endedIndex = state.queueIndex;
            window.setTimeout(function () {
                syncCurrentSongFromNativeQueue();
                if (!player || typeof player.getPlayerState !== "function" || player.getPlayerState() !== window.YT.PlayerState.ENDED) {
                    return;
                }
                if (state.queueIndex === endedIndex && state.queueIndex < state.queue.length - 1) {
                    playNext();
                    return;
                }
                if (state.queueIndex >= state.queue.length - 1) {
                    isPlaying = false;
                    updateTransportButtons();
                    updateMediaSession();
                    setStatus("Queue complete.");
                }
            }, 500);
            return;
        }
        if (!state.queue.length || state.queueIndex >= state.queue.length - 1) {
            isPlaying = false;
            updateTransportButtons();
            updateMediaSession();
            setStatus("Queue complete.");
            return;
        }
        playSong(state.queue[state.queueIndex + 1], state.queue);
    }

    function stopPlayback() {
        clearFade();
        if (player && isPlayerReady) {
            player.stopVideo();
        }
        state.currentSongId = null;
        state.queue = [];
        state.queueIndex = -1;
        resumeBacktrackSeconds = 0;
        isPlaying = false;
        useNativeQueue = false;
        updateMediaSession();
    }

    function toggleShuffle() {
        state.shuffle = !state.shuffle;
        if (state.currentSongId) {
            state.queue = getQueueForActiveSongs(state.currentSongId);
            state.queueIndex = 0;
        }
        saveState();
        render();
    }

    function updateVolume() {
        state.volume = Number(elements.volumeSlider.value);
        saveState();
        if (player && isPlayerReady && isPlaying) {
            player.setVolume(state.volume);
        }
    }

    function syncCurrentSongFromNativeQueue() {
        if (!useNativeQueue || !player || typeof player.getPlaylistIndex !== "function") {
            return;
        }
        const index = player.getPlaylistIndex();
        if (!Number.isFinite(index) || index < 0 || index >= state.queue.length) {
            return;
        }
        const songId = state.queue[index];
        if (songId && songId !== state.currentSongId) {
            state.queueIndex = index;
            state.currentSongId = songId;
            saveState();
            renderSongs();
            renderNowPlaying();
            updateTransportButtons();
            const song = getSong(songId);
            setStatus("Playing " + (song ? song.title || "song" : "song") + ".");
        }
    }

    function setupMediaSession() {
        if (!("mediaSession" in navigator)) {
            return;
        }
        try {
            navigator.mediaSession.setActionHandler("play", function () {
                if (!isPlaying) {
                    togglePlayPause();
                }
            });
            navigator.mediaSession.setActionHandler("pause", function () {
                if (isPlaying) {
                    togglePlayPause();
                }
            });
            navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
            navigator.mediaSession.setActionHandler("nexttrack", playNext);
        } catch (error) {
            console.warn("Media Session controls are not available.", error);
        }
    }

    function updateMediaSession() {
        if (!("mediaSession" in navigator)) {
            return;
        }
        const song = getSong(state.currentSongId);
        try {
            navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            if (!song || typeof window.MediaMetadata !== "function") {
                return;
            }
            const artUrl = cleanImageUrl(song.artUrl) || "Musicat_logo.png";
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: song.title || "Musicat",
                artist: song.artist || "",
                album: song.album || "",
                artwork: [
                    { src: artUrl, sizes: "512x512", type: artUrl.endsWith(".png") || artUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg" }
                ]
            });
        } catch (error) {
            console.warn("Could not update Media Session metadata.", error);
        }
    }

    function renderNowPlaying() {
        const song = getSong(state.currentSongId);
        if (!song) {
            elements.nowArt.hidden = true;
            elements.nowArtFallback.hidden = false;
            resetGradientClass(elements.nowArtFallback, "musicat-now");
            elements.nowTitle.textContent = "Nothing playing";
            elements.nowArtist.textContent = "Choose a song to start.";
            updateMediaSession();
            return;
        }

        const artUrl = cleanImageUrl(song.artUrl);
        if (artUrl) {
            elements.nowArt.src = artUrl;
            elements.nowArt.hidden = false;
            elements.nowArtFallback.hidden = true;
        } else {
            elements.nowArt.hidden = true;
            elements.nowArtFallback.hidden = false;
            resetGradientClass(elements.nowArtFallback, song.album || song.artist || song.title);
        }
        elements.nowTitle.textContent = song.title || "Untitled";
        elements.nowArtist.textContent = compactMeta(song);
        updateMediaSession();
    }

    function renderShuffleToggle() {
        setButtonIconLabel(elements.shuffleToggle, "shuffle", state.shuffle ? "Shuffle on" : "Shuffle off");
        elements.shuffleToggle.classList.toggle("active", state.shuffle);
        elements.shuffleToggle.setAttribute("aria-pressed", String(state.shuffle));
    }

    function updateTransportButtons() {
        elements.playPauseButton.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
        elements.playPauseButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
        elements.playPauseButton.title = isPlaying ? "Pause" : "Play";
        elements.previousButton.disabled = !state.currentSongId;
        elements.nextButton.disabled = state.queue.length < 2;
    }

    function fadeTo(target, duration, done) {
        clearFade();
        if (!player || typeof player.getVolume !== "function") {
            if (done) {
                done();
            }
            return;
        }

        const start = player.getVolume();
        const diff = target - start;
        const steps = Math.max(1, Math.round(duration / 35));
        let currentStep = 0;

        fadeTimer = window.setInterval(function () {
            currentStep += 1;
            const amount = start + diff * (currentStep / steps);
            player.setVolume(Math.max(0, Math.min(100, Math.round(amount))));

            if (currentStep >= steps) {
                clearFade();
                player.setVolume(target);
                if (done) {
                    done();
                }
            }
        }, duration / steps);
    }

    function rewindAfterFadeOut() {
        if (!resumeBacktrackSeconds || !player || typeof player.getCurrentTime !== "function") {
            resumeBacktrackSeconds = 0;
            return;
        }

        const currentTime = player.getCurrentTime();
        const rewindTo = Math.max(0, currentTime - resumeBacktrackSeconds);
        player.seekTo(rewindTo, true);
        resumeBacktrackSeconds = 0;
    }

    function clearFade() {
        if (fadeTimer) {
            window.clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function loadYouTubeApi() {
        window.onYouTubeIframeAPIReady = function () {
            const playerVars = {
                playsinline: 1,
                rel: 0,
                enablejsapi: 1
            };
            const origin = getPlayerOrigin();
            if (origin) {
                playerVars.origin = origin;
                playerVars.widget_referrer = window.location.href;
            }

            player = new window.YT.Player("youtube-player", {
                host: "https://www.youtube.com",
                height: "200",
                width: "360",
                playerVars: playerVars,
                events: {
                    onReady: function () {
                        isPlayerReady = true;
                        player.setVolume(state.volume);
                        if (window.location.protocol !== "file:") {
                            setStatus("Player ready.");
                        }
                        updateTransportButtons();
                    },
                    onStateChange: function (event) {
                        if (event.data === window.YT.PlayerState.ENDED) {
                            playNextAfterEnded();
                        }
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            syncCurrentSongFromNativeQueue();
                            isPlaying = true;
                            updateTransportButtons();
                            updateMediaSession();
                        }
                        if (event.data === window.YT.PlayerState.PAUSED) {
                            isPlaying = false;
                            updateTransportButtons();
                            updateMediaSession();
                        }
                    },
                    onError: function (event) {
                        handlePlayerError(event.data);
                    },
                    onAutoplayBlocked: function () {
                        setStatus("Browser blocked playback. Press Play again in the YouTube frame.");
                    }
                }
            });
        };

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.referrerPolicy = "strict-origin-when-cross-origin";
        document.head.appendChild(tag);
    }

    function getPlayerOrigin() {
        if (window.location.protocol === "http:" || window.location.protocol === "https:") {
            return window.location.origin;
        }
        return "";
    }

    function handlePlayerError(code) {
        if (code === 153) {
            setStatus("YouTube needs a valid page referrer/origin. Use GitHub Pages or serve this folder over HTTP, not file://.");
            return;
        }
        if (code === 101 || code === 150) {
            setStatus("This video owner does not allow embedded playback. Choose a different YouTube link.");
            return;
        }
        if (code === 100) {
            setStatus("YouTube could not find that video. Check the link.");
            return;
        }
        setStatus("YouTube player error " + code + ".");
    }

    function setActiveView(viewId) {
        state.activePlaylistId = viewId || "library";
        elements.searchInput.value = "";
        saveState();
        render();
    }

    function setMobileTab(tab) {
        const safeTab = ["songs", "collections", "search", "player"].includes(tab) ? tab : "songs";
        document.body.dataset.mobileTab = safeTab;
        elements.mobileBottomNav.querySelectorAll("[data-mobile-tab-target]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.mobileTabTarget === safeTab);
        });
        if (safeTab === "search") {
            showGlobalSearch();
            window.setTimeout(function () {
                elements.globalSearchInput.focus();
            }, 0);
        } else if (safeTab !== "search") {
            elements.globalSearchPanel.hidden = true;
        }
    }

    function getSong(songId) {
        return state.songs.find(function (song) {
            return song.id === songId;
        });
    }

    function getActivePlaylist() {
        return state.playlists.find(function (playlist) {
            return playlist.id === state.activePlaylistId;
        });
    }

    function getActiveSongs() {
        if (state.activePlaylistId === "library") {
            return state.songs;
        }

        if (isAlbumView()) {
            const album = getActiveAlbum();
            return album ? album.songs.slice().sort(compareAlbumSongs) : [];
        }

        if (isArtistView()) {
            const artist = getActiveArtist();
            return artist ? artist.songs.slice().sort(compareArtistSongs) : [];
        }

        const playlist = getActivePlaylist();
        if (!playlist) {
            return [];
        }

        return playlist.songIds.map(getSong).filter(Boolean);
    }

    function isAlbumView() {
        return String(state.activePlaylistId || "").startsWith("album:");
    }

    function isArtistView() {
        return String(state.activePlaylistId || "").startsWith("artist:");
    }

    function getActiveAlbum() {
        const key = String(state.activePlaylistId || "").replace(/^album:/, "");
        return getAlbums().find(function (album) {
            return album.key === key;
        }) || null;
    }

    function getActiveArtist() {
        const key = String(state.activePlaylistId || "").replace(/^artist:/, "");
        return getArtists().find(function (artist) {
            return artist.key === key;
        }) || null;
    }

    function getAlbums() {
        const albums = new Map();

        state.songs.forEach(function (song) {
            if (!song.album || !song.album.trim()) {
                return;
            }

            const key = albumKeyFor(song);
            if (!albums.has(key)) {
                albums.set(key, {
                    id: "album:" + key,
                    key: key,
                    albumId: song.albumId || "",
                    name: song.album.trim(),
                    artist: song.albumArtist || song.artist || "",
                    totalTracks: parsePositiveInteger(song.albumTotalTracks),
                    songs: []
                });
            }

            const album = albums.get(key);
            album.songs.push(song);
            album.totalTracks = Math.max(album.totalTracks || 0, parsePositiveInteger(song.albumTotalTracks) || 0) || null;
            if (!album.artist && (song.albumArtist || song.artist)) {
                album.artist = song.albumArtist || song.artist;
            }
        });

        return Array.from(albums.values()).sort(function (a, b) {
            return (a.artist + " " + a.name).localeCompare(b.artist + " " + b.name);
        });
    }

    function getArtists() {
        const artists = new Map();

        state.songs.forEach(function (song) {
            const name = song.artist && song.artist.trim() ? song.artist.trim() : "Unknown artist";
            const key = "manual-" + normalizeForKey(name);
            if (!artists.has(key)) {
                artists.set(key, {
                    id: "artist:" + key,
                    key: key,
                    name: name,
                    songs: []
                });
            }
            artists.get(key).songs.push(song);
        });

        return Array.from(artists.values()).sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
    }

    function albumKeyFor(song) {
        if (song.albumId) {
            return "spotify-" + normalizeForKey(song.albumId);
        }
        return "manual-" + normalizeForKey(song.album) + "-" + normalizeForKey(song.albumArtist || song.artist || "");
    }

    function getAlbumArt(album) {
        if (!album) {
            return "";
        }
        return state.albumArt[album.key] || firstSongArt(album.songs);
    }

    function getArtistArt(artist) {
        if (!artist) {
            return "";
        }
        return state.artistArt[artist.key] || firstSongArt(artist.songs);
    }

    function firstSongArt(songs) {
        const match = songs.find(function (song) {
            return cleanImageUrl(song.artUrl);
        });
        return match ? match.artUrl : "";
    }

    function albumSongCountLabel(album) {
        const savedTracks = countSavedAlbumTracks(album);
        return songCountLabel(savedTracks);
    }

    function songCountLabel(count) {
        return count === 1 ? "1 song" : count + " songs";
    }

    function countSavedAlbumTracks(album) {
        const seen = new Set();
        album.songs.forEach(function (song) {
            seen.add(song.trackNumber ? "track-" + song.discNumber + "-" + song.trackNumber : song.id);
        });
        return seen.size;
    }

    function getNextAlbumOrder(album) {
        if (!album || !album.songs.some(function (song) {
            return parsePositiveInteger(song.albumOrder);
        })) {
            return null;
        }

        return album.songs.reduce(function (maxOrder, song) {
            return Math.max(maxOrder, parsePositiveInteger(song.albumOrder) || 0);
        }, 0) + 1;
    }

    function compareAlbumSongs(a, b) {
        const orderA = parsePositiveInteger(a.albumOrder);
        const orderB = parsePositiveInteger(b.albumOrder);
        if (orderA && orderB && orderA !== orderB) {
            return orderA - orderB;
        }
        if (orderA && !orderB) {
            return -1;
        }
        if (!orderA && orderB) {
            return 1;
        }

        const discA = parsePositiveInteger(a.discNumber) || 1;
        const discB = parsePositiveInteger(b.discNumber) || 1;
        if (discA !== discB) {
            return discA - discB;
        }

        const trackA = parsePositiveInteger(a.trackNumber);
        const trackB = parsePositiveInteger(b.trackNumber);
        if (trackA && trackB && trackA !== trackB) {
            return trackA - trackB;
        }
        if (trackA && !trackB) {
            return -1;
        }
        if (!trackA && trackB) {
            return 1;
        }

        return String(a.title || "").localeCompare(String(b.title || ""));
    }

    function compareArtistSongs(a, b) {
        const albumCompare = String(a.album || "").localeCompare(String(b.album || ""));
        if (albumCompare !== 0) {
            return albumCompare;
        }
        return compareAlbumSongs(a, b);
    }

    function findAlbumByFormValues(albumName, artistName) {
        const album = String(albumName || "").trim().toLowerCase();
        if (!album) {
            return null;
        }

        const artist = String(artistName || "").trim().toLowerCase();
        const matches = getAlbums().filter(function (item) {
            return item.name.toLowerCase() === album;
        });
        if (matches.length === 1 || !artist) {
            return matches[0] || null;
        }

        return matches.find(function (item) {
            return String(item.artist || "").toLowerCase() === artist;
        }) || matches[0] || null;
    }

    function parseYouTubeUrl(value) {
        if (!value) {
            return null;
        }

        try {
            const url = new URL(value);
            const host = url.hostname.replace(/^www\./, "");
            let videoId = "";

            if (host === "youtu.be") {
                videoId = url.pathname.split("/").filter(Boolean)[0] || "";
            } else if (host.endsWith("youtube.com")) {
                if (url.pathname === "/watch") {
                    videoId = url.searchParams.get("v") || "";
                } else {
                    const parts = url.pathname.split("/").filter(Boolean);
                    const knownPath = ["embed", "shorts", "live"].includes(parts[0]);
                    videoId = knownPath ? parts[1] || "" : "";
                }
            }

            if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                return null;
            }

            return {
                videoId: videoId,
                url: "https://www.youtube.com/watch?v=" + videoId
            };
        } catch (error) {
            return null;
        }
    }

    function thumbnailFor(videoId) {
        return "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";
    }

    function buildYouTubeSearchUrl(song) {
        const query = [
            cleanText(song.title, "", 120),
            cleanText(song.artist, "", 120),
            cleanText(song.album, "", 120),
            "official audio"
        ].filter(Boolean).join(" ");
        return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
    }

    function cleanText(value, fallback, maxLength) {
        const text = String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
        if (!text) {
            return fallback || "";
        }
        return text.slice(0, maxLength || 240);
    }

    function cleanUrl(value) {
        if (!value) {
            return "";
        }
        const raw = String(value).trim();
        if (!/^https:\/\//i.test(raw)) {
            return "";
        }

        try {
            const url = new URL(raw);
            return url.protocol === "https:" ? url.href : "";
        } catch (error) {
            return "";
        }
    }

    function cleanImageUrl(value) {
        if (!value) {
            return "";
        }
        const raw = String(value).trim();
        if (/^(logo|favicon)\.svg$/i.test(raw) || /^Musicat_logo\.png$/i.test(raw)) {
            return raw;
        }
        if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(raw)) {
            return raw.length <= MAX_ART_BYTES * 1.5 ? raw : "";
        }
        return cleanUrl(raw);
    }

    function cleanYouTubeUrl(value) {
        const url = cleanUrl(value);
        if (!url) {
            return "";
        }

        try {
            const parsed = new URL(url);
            const host = parsed.hostname.replace(/^www\./, "");
            return host === "youtube.com" || host === "youtu.be" ? parsed.href : "";
        } catch (error) {
            return "";
        }
    }

    function normalizeYouTubeId(value) {
        const id = String(value || "").trim();
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
    }

    function parsePositiveInteger(value) {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    function normalizeForKey(value) {
        return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
    }

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return prefix + "-" + window.crypto.randomUUID();
        }
        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    }

    function uniqueIds(ids) {
        const seen = new Set();
        const next = [];
        ids.forEach(function (value) {
            const id = cleanText(value, "", 160);
            if (id && !seen.has(id)) {
                seen.add(id);
                next.push(id);
            }
        });
        return next;
    }

    function shuffleArray(items) {
        const copy = items.slice();
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            const item = copy[index];
            copy[index] = copy[swapIndex];
            copy[swapIndex] = item;
        }
        return copy;
    }

    function gradientClass(seed) {
        return "gradient-" + (hashString(seed) % 8);
    }

    function resetGradientClass(element, seed) {
        element.className = "now-art-fallback sakura-gradient " + gradientClass(seed);
    }

    function hashString(value) {
        const text = String(value || "musicat");
        let hash = 0;
        for (let index = 0; index < text.length; index += 1) {
            hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
        }
        return hash;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function isMobileViewport() {
        return window.matchMedia("(max-width: 760px)").matches;
    }

    function showDialog(dialog) {
        if (dialog.open) {
            return;
        }
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
            return;
        }
        dialog.setAttribute("open", "");
    }

    function closeDialog(dialog) {
        if (dialog.open && typeof dialog.close === "function") {
            dialog.close();
            return;
        }
        dialog.removeAttribute("open");
    }

    function setButtonIconLabel(button, iconName, label) {
        button.replaceChildren();
        const icon = document.createElement("span");
        icon.innerHTML = ICONS[iconName] || "";
        const text = document.createElement("span");
        text.textContent = label;
        button.append(icon, text);
    }

    function setStatus(message) {
        elements.playerStatus.textContent = message;
    }

    function exportLibrary() {
        const payload = {
            app: "musicat",
            version: 2,
            exportedAt: new Date().toISOString(),
            activePlaylistId: state.activePlaylistId,
            volume: state.volume,
            shuffle: state.shuffle,
            songs: state.songs,
            playlists: state.playlists,
            albumArt: state.albumArt,
            artistArt: state.artistArt
        };
        downloadJson(payload, LIBRARY_FILE);
        setStatus("Downloaded library.json. Replace MusicApp/library.json with it, then commit and push.");
    }

    function importLibrary(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        if (file.size > MAX_IMPORT_BYTES) {
            setStatus("Import is too large. Keep library JSON under 8 MB.");
            elements.importFile.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            try {
                const imported = JSON.parse(String(reader.result));
                mergeImport(imported);
                saveState();
                render();
                setStatus("Import complete.");
            } catch (error) {
                setStatus("Import failed. Check that the file is valid JSON.");
            } finally {
                elements.importFile.value = "";
            }
        };
        reader.readAsText(file);
    }

    function mergeImport(imported) {
        const incomingSongs = Array.isArray(imported.songs) ? imported.songs : [];
        const incomingPlaylists = Array.isArray(imported.playlists) ? imported.playlists : [];
        const idMap = new Map();

        incomingSongs.forEach(function (incoming) {
            const normalized = normalizeSong(incoming);
            if (!normalized) {
                return;
            }
            const existing = findMatchingSong(incoming, normalized.youtubeId);
            const song = existing || {
                id: createId("song"),
                addedAt: new Date().toISOString()
            };

            Object.assign(song, normalized, {
                id: song.id,
                addedAt: song.addedAt || normalized.addedAt
            });

            if (!existing) {
                state.songs.push(song);
            }
            idMap.set(incoming.id || incoming.spotifyId || incoming.title + incoming.artist, song.id);
        });

        incomingPlaylists.forEach(function (incomingPlaylist) {
            const name = cleanText(incomingPlaylist.name, "Imported playlist", 160);
            let playlist = state.playlists.find(function (item) {
                return item.name.toLowerCase() === name.toLowerCase();
            });
            if (!playlist) {
                playlist = {
                    id: createId("playlist"),
                    name: name,
                    songIds: [],
                    artUrl: cleanImageUrl(incomingPlaylist.artUrl),
                    createdAt: new Date().toISOString()
                };
                state.playlists.push(playlist);
            } else if (!playlist.artUrl) {
                playlist.artUrl = cleanImageUrl(incomingPlaylist.artUrl);
            }

            const incomingIds = incomingPlaylist.songIds || incomingPlaylist.trackIds || [];
            incomingIds.forEach(function (incomingId) {
                const localId = idMap.get(incomingId);
                if (localId && !playlist.songIds.includes(localId)) {
                    playlist.songIds.push(localId);
                }
            });
        });

        Object.assign(state.albumArt, cleanArtMap(imported.albumArt));
        Object.assign(state.artistArt, cleanArtMap(imported.artistArt));
    }

    function findMatchingSong(incoming, youtubeId) {
        if (youtubeId) {
            const byYoutube = state.songs.find(function (song) {
                return song.youtubeId === youtubeId;
            });
            if (byYoutube) {
                return byYoutube;
            }
        }

        if (incoming.spotifyId) {
            const bySpotify = state.songs.find(function (song) {
                return song.spotifyId === incoming.spotifyId;
            });
            if (bySpotify) {
                return bySpotify;
            }
        }

        const title = String(incoming.title || "").toLowerCase();
        const artist = String(incoming.artist || "").toLowerCase();
        if (!title || !artist) {
            return null;
        }

        return state.songs.find(function (song) {
            return String(song.title || "").toLowerCase() === title && String(song.artist || "").toLowerCase() === artist;
        }) || null;
    }

    function downloadJson(payload, filename) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
}());
