#!/bin/bash
# Contact sheet: tools/sheet.sh <regex-of-filenames> <cols> <out.jpg> [tile-width] [dir]
# Tiles PNGs from <dir> (default screenshots/) whose names match the regex.
DIR=$(realpath "${5:-$(dirname "$0")/../screenshots}")
RE=$1; COLS=$2; OUT=$(realpath -m "$3"); TW=${4:-480}
FILES=$(ls "$DIR"/*.jpg "$DIR"/*.png 2>/dev/null | grep -E "$RE")
N=$(echo "$FILES" | wc -l); ROWS=$(( (N + COLS - 1) / COLS ))
LIST=$(mktemp); for f in $FILES; do echo "file '$f'" >> $LIST; done
ffmpeg -y -loglevel error -f concat -safe 0 -i $LIST -vf "scale=$TW:-1,tile=${COLS}x${ROWS}:padding=6:color=0x222222" -frames:v 1 -q:v 3 "$OUT"
rm $LIST; echo "$OUT ($N tiles)"
