#!/bin/bash
# encode.sh <framesdir> <out.mp4> [audio.wav]   1080x1920 (or scaled) 30 fps H.264 High + AAC-LC 48 kHz stereo, exactly 90.0 s
F=$1; O=$2; A=${3:-$EP_BUILD/audio/final_mix.wav}
ffmpeg -y -loglevel error -framerate 30 -i "$F/f%05d.jpg" -i "$A" -t 90 -c:v libx264 -profile:v high -preset medium -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart "$O" && ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration -of compact "$O"
