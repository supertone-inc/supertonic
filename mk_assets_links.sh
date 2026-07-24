#!/usr/bin/env sh
set -e


ASSETS_DIRNAME="assets"
TARGETS_FILE="assets_targets"


[ -d "$ASSETS_DIRNAME" ] || mkdir "$ASSETS_DIRNAME"

while IFS= read -r F || [ -n "$F" ]; do
    if [ -d "$F/assets" ]; then
        rm -rf "$F/$ASSETS_DIRNAME"
    fi
    ln -s "../$ASSETS_DIRNAME" "$F/$ASSETS_DIRNAME"
done < "$TARGETS_FILE"
