import os
import csv
import json
import requests
import time
import re
import hashlib

CSV_DIR = "./csv"
OUTPUT_FILE = "library.json"

YOUTUBE_SEARCH_URL = "https://www.youtube.com/results"
ITUNES_SEARCH_URL = "https://itunes.apple.com/search"

SAVE_EVERY = 10  # save every N songs

# ------------------------
# Helpers
# ------------------------

def make_id(prefix, text):
    h = hashlib.md5(text.encode()).hexdigest()[:10]
    return f"{prefix}-{h}"

def clean(text):
    return text.strip()

def extract_youtube_id(html):
    matches = re.findall(r"watch\?v=([a-zA-Z0-9_-]{11})", html)
    return matches[0] if matches else None

def save_progress():
    library = {
        "songs": songs,
        "playlists": playlists,
        "albumArt": {},
        "artistArt": {},
        "activePlaylistId": "library",
        "volume": 80,
        "shuffle": False
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(library, f, indent=2)

# ------------------------
# Safe request (basic retry)
# ------------------------

def safe_get(url, params=None):
    for _ in range(3):
        try:
            r = requests.get(url, params=params, timeout=10)
            if r.status_code == 200:
                return r
        except:
            pass
        time.sleep(1)
    return None

# ------------------------
# YouTube search
# ------------------------

def search_youtube(song, artist):
    query = f"{song} {artist} official audio"
    params = {"search_query": query}

    r = safe_get(YOUTUBE_SEARCH_URL, params)
    if not r:
        return None

    video_id = extract_youtube_id(r.text)
    if not video_id:
        return None

    return {
        "youtubeId": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}"
    }

# ------------------------
# iTunes lookup
# ------------------------

def search_itunes(song, artist):
    params = {
        "term": f"{song} {artist}",
        "limit": 1,
        "media": "music"
    }

    r = safe_get(ITUNES_SEARCH_URL, params)
    if not r:
        return None

    data = r.json()
    if not data["results"]:
        return None

    result = data["results"][0]

    return {
        "album": result.get("collectionName", ""),
        "artUrl": result.get("artworkUrl100", "").replace("100x100", "600x600"),
        "artist": result.get("artistName", artist)
    }

# ------------------------
# Main
# ------------------------

songs = []
song_map = {}
playlists = []
song_count = 0

for filename in os.listdir(CSV_DIR):
    if not filename.endswith(".csv"):
        continue

    playlist_name = filename.replace(".csv", "")
    playlist_id = make_id("playlist", playlist_name)

    playlist_song_ids = []

    with open(os.path.join(CSV_DIR, filename), newline="", encoding="utf-8") as f:
        reader = csv.reader(f)

        for row in reader:
            if not row:
                continue

            title = clean(row[0])
            artist = clean(row[1]) if len(row) > 1 else ""

            key = f"{title.lower()}::{artist.lower()}"

            if key in song_map:
                song_id = song_map[key]
                playlist_song_ids.append(song_id)
                continue

            print(f"[{song_count}] Processing: {title} - {artist}")

            yt = search_youtube(title, artist)
            meta = search_itunes(title, artist)

            song_id = make_id("song", key)

            song = {
                "id": song_id,
                "youtubeId": yt["youtubeId"] if yt else "",
                "url": yt["url"] if yt else "",
                "title": title,
                "artist": meta["artist"] if meta else artist,
                "album": meta["album"] if meta else "",
                "artUrl": meta["artUrl"] if meta else "",
                "addedAt": time.strftime("%Y-%m-%dT%H:%M:%S")
            }

            songs.append(song)
            song_map[key] = song_id
            playlist_song_ids.append(song_id)

            song_count += 1

            # progressive save
            if song_count % SAVE_EVERY == 0:
                print("💾 Saving progress...")
                save_progress()

            time.sleep(0.5)

    playlists.append({
        "id": playlist_id,
        "name": playlist_name,
        "songIds": playlist_song_ids
    })

    print(f"📁 Finished playlist: {playlist_name}")
    save_progress()

# final save
save_progress()
print("\nDone. library.json created.")