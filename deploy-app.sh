#!/usr/bin/env bash
# Shortcut for redeploying a new image to an existing stack. See deploy.sh.
exec "$(dirname "$0")/deploy.sh" --app-only "$@"
