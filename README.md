# Array language chat logs

Usage: download, and either manually use the files in `logs/`, or open `site/index.html` for simple searching.

Search: `a&b|c&d` will find all messages either containing both `a` and `b`, or `c` and `d`. Alternatively, prepending a space to the search string will match the following text exactly.

You may want to change the first two lines of `site/main.js` to your own StackExchange/Matrix IDs, so that your messages could be colored differently.

## Updating logs

1. Make a file `mxToken` containing:
   ```
   https://matrix.org
   @yourUsername:matrix.org
   yourPassword
   ```
   That user must be joined to the rooms defined in the `mxRooms` array in `src/dz/Main.java`.

2. `./build && ./run` (requires Java 8+)