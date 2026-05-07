# Music App Revamp — Coding Brief

## Overview

Revamp the app to:
- Use Firebase as the primary data source (no local JSON syncing)
- Improve UI/UX to match concept art
- Add queue system, better search, and proper metadata handling
- Prepare for (but do not yet implement) Google-auth user system

## Phase 1 — Firebase + Data Model (Foundation)

Firebase Migration
- App should be revamped to work with Firebase, saving the data to the server
- Remove import/export features—sync should be through Firebase instead

Data Structure
- Split playlists and songs into individual documents so Firebase doesn’t hit size limits
- Songs should exist in a shared global library
- Playlists should be user-specific, accessing songs by their iTunes song ID or hash fallback

Song Model (Required Fields)
- Songs should store at least:
    - YouTube link
    - YouTube id
    - iTunes art url
    - iTunes track ID
    - cover art accent color
    - track no (from iTunes)
    - album
    - Artist(s) (array, not string, if possible coming from iTunes. Songs by multiple artists should show up under each artist)
    - Added date/time
    - Song title

IDs
- Use iTunes track ids as primary IDs
- Use hashes only as a fallback

Global Library Contribution Model
- Allow users to contribute to the main song library
    - Have some method of preventing duplicates in the global song library (maybe throw duplicates under the user data as well - see below)
    - Do NOT allow direct editing of global entries
    - Allow user-specific overrides (custom copies stored under user data)
- I want this to be a seamless process for the user, but also super powerful for finding exactly what songs they want. They can either use the YouTube inline search provided by the app or input with the add song button, which gets a little more into the weeds, allowing them to provide specific YouTube urls, etc (kinda like the current add song system). If they use the custom add and modify the iTunes metadata, add the song to their user files and not the global library.
- I also want to add the "add song" feature back to mobile, as seen in the concept art and discussed elsewhere.

## Phase 2 — Search + Song Add (Core UX)

Search Behavior
- Search feature should:
    - normalize characters (ó → o)
    - support incomplete words
    - match loosely (e.g. “Danzo no” → “Danzón No. 2 (Live)”)
    - optionally map numbers (2 ↔ two)

Add Song (Primary Method)
- Remove YouTube search entirely
- Users should not manually paste links as primary flow

New Flow:
- User searches
    - Normal song, playlist, artist, album results
- On pressing Enter, the following gets inserted at the bottom:
    - Fetch top YouTube result
    - Fetch iTunes metadata
    - (Python script `build_library.py` is reference for similar behavior)
    - Display result inline
    - Allow user to add directly (keep formatting the search results like normal songs with the song menu and other functionality (queue in the future) per the search concept art).
    - This becomes the main way of adding songs

Player source
- This has already been partially implemented it seems, but I want the app to keep track of the source that it is playing from, whether that be an artist, playlist, album, search result list, all songs, or the queue. This should be displayed in the main player above the YT embed. Queue should always take priority, but if there is no queue, fall back to wherever the last song tapped comes from (artist, playlist, album, search, all songs), and play the songs from there. Also tapping a new song should not clear the queue, but only play what was tapped immediately and keep the rest of the queue intact.
- note that viewing an artist or an album or a playlist or making a search doesnt make that the player context.

## Phase 3 — Queue System

Queue Features
- Add queue system
- Add queue viewer
- Allow:
    - rearranging queue
    - removing from queue (delete button instead of song menu in queue for simplicity)
    - “play next” feature (see swipe actions below)

Swipe Actions (Mobile)
- Swipe left → add to top of queue
- Swipe right → add to bottom of queue
- See "add to queue" and "play next" concept art

Playback Behavior
- Next button should:
    - continue within current context (search, album, playlist, artist, queue, all songs)
    - wrap or stop appropriately

Shuffle
- Shuffle should:
    - track played songs within current context
    - avoid repeats until all songs are played
    - not be seeded the same way each time
- Fix issue where shuffle mismatches song and video

## Phase 4 — UI Revamp

See concept art in `concept_art/renders` for final app design language - Dark, modern, simple, sleek, with circular gray buttons.

App colors are (besides album accent colors, which should be used on the player and song menu when the song is playing):
- \#494947
- \#dd2d4a
- \#d8cbc7
- \#a5be00 muted version: \#434e00
- \#71a2b6 (color fade in search)
- \#000000

I have a bunch of square icon svgs that I will add—use placeholders for now.

The main desktop layout should stay roughly the same, but change the colors and elements to match the mobile design language. Also click and drag instead of drag bar. 

Note the gray circle icon motif in the concept art.

All pages include the musicat logo, rounded, top center.

Library Layout
- Albums list and artists list should NOT overlap or extend behind each other like they currently do
- Fix layering so sections are distinct and scroll correctly

Search UI
- When search opens:
    - toolbar dissolves
    - library icon and current album icon slide to corners (per search concept art)
- search bar is borderless in the blue glow at the bottom of the screen
- gray circle p lus button at top right of search for manually adding songs. This in place of large “can’t find what you’re looking for?” button
- General format is great, but need some visual improvement (see concept art `Search.png`)
- Keep the feature that songs are displayed normally in search with the ability to queue and the song menu button


Player UI
- Remove bottom status messages
- Instead display current source at top (search / artist / album / playlist / queue / all songs)

Queue UI
- Match queue concept art (`Queue.png`)
- Include:
    - reorderability within queue (drag+drop as discussed).
    - remove (button in place of typical song menu button)
    - play next
- This menu should slide in from the bottom and be able to be slid out easily by swiping down from the grab handle at the top.

Song Menu (Critical Fix)
- Replace current "song menu"/"add to playlist" setup with unified menu (See new unified `Song_Menu.png` concept art).
- This menu should also slide in (like the queue) from the bottom and be able to be slid out easily by swiping down from the grab handle at the top.
- Must include:
    - Big album icon (tap to edit)
    - Song title, artist, and album (and ability to edit them too - maybe make the whole thing one big tappable "edit me" button)
    - Share (copy youtube link to clipboard)
    - add to queue
    - play next
    - go to artist
    - go to album
    - delete from library
    - at bottom: playlists list with checkboxes for adding/removing from each

Toolbar Interactions (Mobile)
- Swipe on album icon → next/previous
- Hold → play/pause
- Tap → open player
- Other toolbar buttons:
    - Search (center)
    - Library (left)
- This toolbar is on the bottom in the center (see concept art `Player.png`)
- toolbar should be seen on all screens except search (modified as discussed)

Playlist/Artist/Album/all songs viewer UI (see concept art `Playlist.png`)
- Songs separated by thin gray lines only
- View type at top with art to the left, followed by title and 4 gray circle buttons (note concept art only has 3):
    - play (sets player context, superceded by queue)
    - shuffle play (sets player context, superceded by queue)
    - sort
    - playlist menu with delete/edit options. Delete/edit should not be an option for all songs, artists, or albums, which are edited by changing individual song albums.
    - playlist delete should have a simple confirmation, allowing user to only delete playlist or remove all contained songs from the library. Deleting an album removes all songs from library, since albums are a construct of having the songs.
- Now playing concept art shown with green box. Make sure this doesn't conflict with the queue swiping features

Library UI (see concept art `Library.png`)
- Current layout is great, minus the dropdowns currently crashing. Also, as mentioned elsewhere, the library viewer should return to its previous state (viewing an album or playlist or artist if so, also remember the place the user has scrolled to) when the library toolbar icon is pressed, and if it is pressed again, the main library bar should slide in. The top level library bar should slide in and out from the left.
- Note the library concept art displays artists instead of playlists. This should not be the case.

Player Screen (see concept art `Player.png`)
- Elements should fill screen (mobile)
- No vertical scrolling
- Queue menu access button at top right
- from left to right under album art, song title, and artist name:
    - Shuffle toggle
    - prev
    - play
    - next
    - song menu (not plus icon as displayed in the concept art)

Mobile Fixes
- Remove volume slider entirely on mobile
- Fix prev song button on player (currently broken)
- Fix playback muting after pause (caused by a bug in the fade in/out?)
- Fix audio skipping when switching tabs (Brave issue)

Orientation
- Disable landscape mode on phone

Visual Details
- Save accent color from album art and use for UI gradients

## Phase 5 — Library + Sorting

Sorting
- Remove “filter this view” bar in playlist/album/all songs view
- Replace with sort feature:
    - custom order (playlist only)
    - alphabetical
    - album
    - artist

Rules
- Do NOT allow reordering in global “All Songs” view (this is meaningless)
- reordering only applies within:
    - playlists
    - albums (preferably only ordered by iTunes track number)
- Sort albums and all songs with relevant things from above list (for instance all songs could be sorted by recently added)
    - These should not have a custom order option

Library Navigation
- Library tab should remember last position scrolled to
- Pressing library button (on toolbar—see concept art)
    - returns to last position
- Pressing again:
    - returns to top-level library (like the menu bar on desktop)

## Phase 6 — User System (DO NOT IMPLEMENT YET)

- Firebase Google login system
- Users have:
    - their own playlists
    - optional overrides for songs
- Songs remain globally shared

- Future idea: album add from iTunes (DO NOT IMPLEMENT, EVEN IN PHASE 6. Stick with songs for now)

## Album Art + Metadata

Source
- Album art comes from iTunes metadata
- Should be fetched on song add as discussed above
- Can be updated by:
    - replacing art URL
    - updating metadata
    - replacing anything
- If a user manually adds a song or modifies its iTunes-grabbed metadata, add the modified version to their personal user files and not the global library 

Media Session (if possible—do this in phase 6)
- Pass album art to iPhone player via Media Session API
- Enable next/previous controls if supported instead of skip 10 seconds

## Interactions

Rearranging
- Press and hold to rearrange songs (mobile and desktop)
- No drag handle required

## Routing / Hosting

- Remove .html from URLs (use clean routing if possible)
- App hosted via Firebase in the future

## Notes / Constraints

- Do not implement Google auth yet
- Do not over-engineer real-time sync initially
- Prioritize stability before animations

## Final Direction

This app should evolve into:
- Firebase-backed
- metadata-driven
- queue-based player
- clean UI matching concept art