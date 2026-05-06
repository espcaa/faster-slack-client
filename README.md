# faster-slack-client
![typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![solid](https://img.shields.io/badge/Solid-007ACC?style=for-the-badge&logo=solid&logoColor=white)
![go](https://img.shields.io/badge/Go-007ACC?style=for-the-badge&logo=go&logoColor=white)


This is an attempt at making an alternative client for slack. The goal was to have something lighter and faster than the official one which is built on electron.

## Demo

<img width="300" alt="Screenshot 2026-05-06 at 17 49 28" src="https://github.com/user-attachments/assets/b01984a5-646a-4890-aa09-3c875c444321" />
<img width="300"  alt="Screenshot 2026-05-06 at 17 49 36" src="https://github.com/user-attachments/assets/64739030-db32-4f19-8923-2618dfc3e972" />
<img width="300"  alt="Screenshot 2026-05-06 at 17 49 46" src="https://github.com/user-attachments/assets/3a4a2b67-7699-47cb-bb3f-720022baf77f" />
<img width="300" alt="Screenshot 2026-05-06 at 17 51 49" src="https://github.com/user-attachments/assets/f9e8d266-2d2c-4be4-917b-0ce30ba7a64c" />


## Installation

to install, either grab the latest release from the releases page, or build it by yourself.

### Building from source

To build from source, you need to have bun and go installed. Then, clone the repository and run:


```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

(wails installation)\


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
