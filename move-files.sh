#!/bin/bash

SRC="/home/natanielj/Desktop/BESABookingApp/frontend/"
DEST="/home/natanielj/Desktop/BESA-AppGIT/frontend"

mkdir -p "$DEST"

# Root files
[ -f "$SRC/.env" ] && cp "$SRC/.env" "$DEST/"
[ -f "$SRC/password.txt" ] && cp "$SRC/password.txt" "$DEST/"

# Project folder
[ -d "$SRC/project" ] && cp -R "$SRC/project" "$DEST/"

# Specific src files
mkdir -p "$DEST/src"

[ -f "$SRC/src/firebase.ts" ] && cp "$SRC/src/firebase.ts" "$DEST/src/"
[ -f "$SRC/src/credentials.json" ] && cp "$SRC/src/credentials.json" "$DEST/src/"
[ -f "$SRC/src/google92b6b100bdfc843f.html" ] && cp "$SRC/src/google92b6b100bdfc843f.html" "$DEST/src/"
[ -f "$SRC/src/besa-booking-469920-27ffc6b3226b.json" ] && cp "$SRC/src/besa-booking-469920-27ffc6b3226b.json" "$DEST/src/"

echo "Ignored files copied successfully."
