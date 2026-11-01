#!/bin/bash
# ============================================================
# Keep what people save through the live site across deploys.
#
# Bulletins, the reading plan, the schedule, comments… are written into data/*.json on
# the VM, and those files are tracked in git. A deploy's `git reset --hard` therefore put
# every one of them back to the committed copy and silently threw the live edits away.
#
#   keep-data.sh save     before the reset: snapshot data/*.json (plus a rolling backup)
#   keep-data.sh restore  after the reset: put the snapshot back — except files this push
#                         changed on purpose, which take the repo's copy
# ============================================================
set -e

SNAP=~/bulletin-data-live
BACKUPS=~/bulletin-data-backups

case "$1" in
  save)
    rm -rf "$SNAP"
    mkdir -p "$SNAP"
    cp -a ~/bulletin/data/*.json "$SNAP"/
    git -C ~/bulletin rev-parse HEAD > "$SNAP/.head"
    stamp="$BACKUPS/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$stamp"
    cp -a "$SNAP"/*.json "$stamp"/
    # keep the ten most recent backups
    ls -1dt "$BACKUPS"/* | tail -n +11 | xargs -r rm -rf
    echo "  saved live data (backup: $stamp)"
    ;;
  restore)
    [ -d "$SNAP" ] || { echo "  no saved live data to restore"; exit 0; }
    old=$(cat "$SNAP/.head" 2>/dev/null || true)
    cd ~/bulletin
    for f in "$SNAP"/*.json; do
      name=$(basename "$f")
      changed=0
      if [ -n "$old" ]; then
        git diff --quiet "$old" HEAD -- "data/$name" 2>/dev/null || changed=$?
      fi
      # exit 1 = the push changed this file on purpose, so the repo's copy wins
      if [ "$changed" = 1 ]; then
        echo "  data/$name was changed in this push — using the repo copy"
      else
        cp -a "$f" "data/$name"
      fi
    done
    echo "  restored live data"
    ;;
  *)
    echo "usage: keep-data.sh save|restore" >&2
    exit 2
    ;;
esac
