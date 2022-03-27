# Array language chat logs

Usage: download (as logs are >100MB total), and either manually use the files in `logs/`, or open `site/index.html` for basic searching.

Search: `a&b|c&d` will find all messages either containing both `a` and `b`, or `c` and `d`. Alternatively, surrounding in `/`s (e.g. `/abc.efg/`) searches as a regex, or, prepending a space to the search string will match the following text exactly.

Clicking on the arrow left of a message will link you to it. For matrix messages, this will enter into a temporary view of the context (still in reverse-chronological order); middle-click or right-click→copy to get a matrix.to link.

You may want to change the first two lines of `site/main.js` to your own StackExchange/Matrix IDs, so that your messages could be colored differently.

`<body class="dark">` in `site/index.html` can be changed to `<body class="light">` for a light theme.

## Updating logs

1. Make a file `mxToken` containing:
   ```
   https://matrix.org
   @yourUsername:matrix.org
   yourPassword
   ```
   That user must be joined to the rooms defined in the `mxRooms` array in `src/dz/Main.java`.

2. `./build && ./run` (requires Java 8+)
   
   This will append to the old logs, so time taken will be proportional to the count of new messages. There are big pauses between API calls to not hit rate limiting though, so running with no new messages still takes 30s.