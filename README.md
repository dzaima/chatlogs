# Array language chat logs

Usage: download (as logs are >100MB total), and either manually use the files in `logs/`, or open `site/index.html` for basic searching.

## Search

```js
// everything is compared lowercase
hello world // match messages containing both "hello" and "world" anywhere
hello & world // alternative form of the above
hello | world // match messages containing either side
"2 3 ⍴ ⍳6" // exact match
/hello,? world/ // search by regex
(a & b) | (c & !("d" | /e/)) // as you'd expect
```

Clicking on the arrow left of a message will open a temporary view of the room context (still in reverse-chronological order); middle-click or right-click→copy to get the original link.

## Configuration

Configuration is done by running commands in devtools (reload required for them to take effect):

```js
// theme selection:
localStorage.setItem("chatlogs-theme", "light");

// color your messages differently by storing your user ID:
localStorage.setItem("me-se", "123456789");
localStorage.setItem("me-mx", "@example:matrix.org");
// (can enter multiple via joining with ";")
```

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