#!/bin/sh
# Starts as root only to make sure the mounted uploads folder belongs to the
# app user, then drops to that user for everything else.
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOADS_DIR"
  chown node:node "$UPLOADS_DIR"
  for d in originals derived trash tmp; do
    mkdir -p "$UPLOADS_DIR/$d"
    chown node:node "$UPLOADS_DIR/$d"
  done
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

# Additive migrations only; the deploy has already checked them against the
# live database before this runs.
./node_modules/.bin/prisma migrate deploy
exec "$@"
