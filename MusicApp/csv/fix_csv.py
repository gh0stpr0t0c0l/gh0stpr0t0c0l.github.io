import csv
import glob

for file in glob.glob('*.csv'):
    rows = []
    with open(file, 'r', newline='', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Assume format: song,artist where song may have commas
            last_comma = line.rfind(',')
            if last_comma == -1:
                # No comma, perhaps just song or error
                rows.append([line, ''])
            else:
                song = line[:last_comma]
                artist = line[last_comma+1:]
                rows.append([song, artist])
    with open(file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f'Fixed {file}')