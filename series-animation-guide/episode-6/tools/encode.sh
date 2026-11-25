#!/bin/bash
# encode.sh <framesdir> <out.mp4> [audio.wav] [crf]  -> 1080x1920 30 fps H.264 High yuv420p + AAC-LC 48 kHz stereo, 70.0 s (2100 frames); also <out>_720p.mp4
F=$1; O=$2; A=${3:-audio/mix.wav}; CRF=${4:-20}
ffmpeg -y -loglevel error -framerate 30 -i "$F/f%05d.jpg" -i "$A" -t 70.0 -c:v libx264 -profile:v high -preset slow -crf $CRF -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$O"
ffmpeg -y -loglevel error -i "$O" -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v high -preset slow -crf 24 -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart "${O%.mp4}_720p.mp4"
ls -la "$O" "${O%.mp4}_720p.mp4"
