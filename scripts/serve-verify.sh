#!/bin/sh
# Restart the verification server cleanly. Reusing a live one after a rebuild
# serves a wiped .next-verify: the HTML loads, the stylesheet 404s, and every
# section measures three to twenty times its real height. That looked like a
# layout regression twice before it was traced to the port.
set -e
lsof -ti tcp:3100 2>/dev/null | xargs -r kill -9 2>/dev/null || true
until ! lsof -ti tcp:3100 >/dev/null 2>&1; do sleep 0.2; done
NEXT_DIST_DIR=.next-verify npx next start -p 3100 >/tmp/srv.log 2>&1 &
echo $! > /tmp/epwp-audit.pid
until curl -sf -o /dev/null http://localhost:3100/; do sleep 0.4; done
# A styled page always ships a stylesheet link; assert it rather than trusting a 200.
curl -s http://localhost:3100/ | grep -q 'rel="stylesheet"' \
  && echo SERVER_OK || { echo "SERVER_UNSTYLED"; exit 1; }
