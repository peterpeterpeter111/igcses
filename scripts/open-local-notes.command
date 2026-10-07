#!/bin/zsh
# Open the existing study library, starting its local server when needed.
setopt NO_BG_NICE
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
script_directory="$(cd "$(dirname "$0")" && pwd)"
project_directory="${IGCSE_PROJECT_DIR:-${script_directory:h}}"
notes_url="http://localhost:3000/"
open_browser() {
  if [[ "${1:-}" != "--no-open" ]]; then
    /usr/bin/open "$notes_url"
  fi
}
notes_ready() {
  /usr/bin/curl --fail --silent --max-time 2 "$notes_url" 2>/dev/null |
    /usr/bin/grep -q 'IGCSEs'
}
if [[ ! -f "$project_directory/package.json" || ! -x "$project_directory/node_modules/.bin/vinext" ]]; then
  print -u2 'The study library folder or its installed dependencies are missing.'
  exit 1
fi
if notes_ready; then
  open_browser "${1:-}"
  print 'Your local IGCSE notes are ready at http://localhost:3000/.'
  exit 0
fi
if /usr/sbin/lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  print -u2 'Port 3000 is already in use. The notes server has not been replaced.'
  exit 1
fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  print -u2 'Node.js is missing. Install Node.js 22 or newer, then open this file again.'
  exit 1
fi
cd "$project_directory" || exit 1
mkdir -p work
print 'Starting your local IGCSE notes. Keep this window open while studying.'
npm run dev -- --host 127.0.0.1 --port 3000 > work/local-notes.log 2>&1 &
notes_server_pid=$!
for attempt in {1..60}; do
  if notes_ready; then
    open_browser "${1:-}"
    print 'Your local IGCSE notes are ready at http://localhost:3000/.'
    print 'Close this window to stop the local server; open the Desktop file to start it again.'
    wait "$notes_server_pid"
    exit $?
  fi
  if ! kill -0 "$notes_server_pid" 2>/dev/null; then
    print -u2 "The notes server could not start. Details: $project_directory/work/local-notes.log"
    exit 1
  fi
  sleep 1
done
print -u2 "The notes server is still starting. Details: $project_directory/work/local-notes.log"
wait "$notes_server_pid"
