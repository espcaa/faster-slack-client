# faster-slack-client

This is an attempt at making an alternative client for slack. The goal was to have something lighter and faster than the official one which is built on electron.

## Demo

## Installation

to install, either grab the latest release from the releases page, or build it by yourself.

### Building from source

To build from source, you need to have bun and go installed. Then, clone the repository and run:\
\

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

(wails installation)\
\

```bash
bun install
wails3 package
```

## Roadmap

- [x] Basic UI
- [x] Authentication
- [x] Fetching channels and messages
- [x] Sending messages
- [x] Real-time updates
- [x] Threaded messages
- [ ] File uploads
- [ ] Reactions
- [ ] Notifications
- [ ] ~no memory leaks~ (hopefully)
