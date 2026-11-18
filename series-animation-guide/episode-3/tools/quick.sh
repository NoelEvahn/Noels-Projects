#!/bin/bash
# quick.sh <from_s> <to_s> <step_s> [scale=0.35] [workers=3]  -> renders preview frames into $EP_BUILD/quick and makes a sheet
EPD=$(cd "$(dirname "$0")/.." && pwd); B=${EP_BUILD:?set EP_BUILD}; A=$1; Z=$2; ST=$3; SC=${4:-0.35}; WK=${5:-3}
export LIB_DEPS=${LIB_DEPS:?} NODE_PATH=$(npm root -g) EP_BUILD=$B
node $EPD/tools/render.mjs --from $(python3 -c "print(round($A*30))") --to $(python3 -c "print(round($Z*30))") --step $(python3 -c "print(max(1,round($ST*30)))") --scale $SC --workers $WK --out $B/quick FORCE=1 2>&1 | grep -v "GL Driver" | tail -8
