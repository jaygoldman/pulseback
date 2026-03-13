# Kodak Pulse Local Server — Design Spec

## Overview

A local Node.js/TypeScript server that replaces the defunct Kodak Cloud Services for the Kodak Pulse W1030 digital picture frame. Implements the full Kodak Pulse REST/XML API, serves a retro-Kodak-themed web UI for photo management, and includes a DNS proxy to redirect the frame's hardcoded Kodak hostnames to the local server.

The project will be published to GitHub for other Kodak Pulse owners to use.

## Constraints

- **Frame resolution:** 800x600 (4:3), 10" LED-backlit display, 512MB internal memory
- **Frame protocol:** REST over HTTP/HTTPS with XML payloads, custom `DeviceToken` header for auth
- **Frame SSL:** MatrixSSL client on older firmware does not validate certificates — self-signed works
- **Frame is pull-only:** It downloads photos from the server; it cannot upload its stored photos
- **Safety:** Must never send delete commands to an unknown frame. Must block firmware updates that could enforce certificate validation.
- **DNS:** Only the frame should use the server's DNS — configured via the frame's static DNS setting, not network-wide

## Architecture

Single Node.js/TypeScript monolith running as a macOS launchd service. One process handles DNS, the Kodak API, photo serving, and the web UI.

### Project Structure

```
kodak-pulse-server/
├── src/
│   ├── server.ts              # Entry point, starts all services
│   ├── dns/                   # DNS proxy (dns2)
│   ├── kodak-api/             # Kodak Pulse REST/XML API
│   ├── web/                   # Web UI backend (Express routes)
│   ├── photos/                # Photo management (import, resize, metadata)
│   └── db/                    # SQLite via better-sqlite3
├── web-ui/                    # React frontend (Vite)
├── data/                      # Runtime data (created on first run)
│   ├── photos/
│   │   ├── originals/         # Original uploaded files
│   │   └── display/           # Resized 800x600 copies
│   ├── watch/                 # Watched folder for auto-import
│   ├── certs/                 # Auto-generated self-signed SSL cert
│   ├── logs/                  # Server logs
│   ├── config.json            # Server configuration
│   └── kodak-pulse.db         # SQLite database
└── docs/
```

### Key Dependencies

- **Express** — HTTP server for Kodak API and web UI backend
- **dns2** — lightweight DNS proxy
- **better-sqlite3** — embedded database, zero external dependencies
- **sharp** — photo resizing/cropping to 800x600
- **xml2js** — XML parsing/building for Kodak protocol
- **React + Vite** — web UI frontend
- **selfsigned** — auto-generate SSL certificate
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT session tokens

### Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 53   | UDP      | DNS proxy |
| 80   | HTTP     | Kodak API + photo serving |
| 443  | HTTPS    | Kodak API (frame uses both) |
| 3000 | HTTP     | Web UI |

## DNS Proxy

Intercepts three Kodak hostnames and resolves them to the server's own IP:

- `device.pulse.kodak.com` — all Kodak API traffic
- `www.kodak.com` — firmware update checks (returns "no update")
- `download.kodak.com` — firmware binary downloads (blocked)

All other DNS queries are forwarded to the upstream DNS server, auto-detected from the Mac's network configuration or manually configured.

Only the frame uses this DNS server — configured via the frame's WiFi Advanced settings. No other network device is affected.

## Kodak Pulse API

Implements the frame's 3-step communication protocol:

### Step 1 — Activation

`POST /DeviceRest/activate`

Frame sends `deviceID`, `apiVersion`, `apiKey`, `activationCode`. Server responds with HTTP 412 and a device activation ID. Device is stored in the database.

### Step 2 — Authorization

`POST /DeviceRestV10/Authorize`

Frame sends storage metrics (`bytesAvailable`, `bytesTotal`, `picturesAvailable`, `picturesTotal`). Server stores these and responds with `authorizationToken`, `apiBaseURL`, `pollingPeriod` (default 30s, configurable).

### Step 3 — Authenticated Operations

All require `DeviceToken` HTTP header.

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/DeviceRestV10/status/{timestamp}` | GET | 200 if no changes, 425 if collection updated since timestamp |
| `/DeviceRestV10/settings` | GET | Returns device settings (slideshow, transition, brightness, etc.) |
| `/DeviceRestV10/collection` | GET | Returns photo entity IDs assigned to this frame |
| `/DeviceRestV10/entity/{entityID}` | GET | Photo metadata including `fileURL` |
| `/DeviceRestV10/entity/{entityID}` | DELETE | Removes photo from collection |

### Photo Serving

Photos served via HTTP on port 80 at `/photos/{id}.jpg`. Entity metadata `fileURL` points here. All photos pre-resized to 800x600 on import.

### First-Connection Safety

When an unknown device connects, the server starts with an empty collection and sends no delete commands. The frame's cached internal photos remain untouched. Photos are added to the frame's collection via the web UI.

### Firmware Update Blocking

`GET /go/update*` on port 80 (intercepted `www.kodak.com` traffic) returns a "no update available" response. This prevents the frame from downloading newer firmware that enforces certificate validation.

## Photo Management

### Import Sources

1. **Web UI upload** — drag-and-drop or file picker, accepts JPEG/PNG/HEIC
2. **Watched folder** (`data/watch/`) — auto-imports new files, removes originals after successful import
3. **USB/SD recovery** (future) — import from a mounted volume once the frame's storage is accessible

### Processing Pipeline

On import:

1. Generate UUID
2. Store original in `data/photos/originals/{id}.{ext}`
3. Create 800x600 display copy with sharp:
   - Wider than 4:3 → crop to 4:3 (center, adjustable per-photo), then resize
   - Taller than 4:3 → letterbox with black bars
4. Store display copy in `data/photos/display/{id}.jpg`
5. Extract EXIF data (date taken, orientation)
6. Store metadata in SQLite
7. Add to default collection

### Database Schema

**devices**
- `id`, `deviceID`, `name`, `activationDate`, `lastSeen`, `storageInfo`

**photos**
- `id`, `filename`, `originalPath`, `displayPath`, `width`, `height`, `dateTaken`, `importedAt`, `fileSize`

**albums**
- `id`, `name`, `sortOrder`, `createdAt`

**album_photos**
- `albumId`, `photoId`, `sortOrder`

**device_albums**
- `deviceId`, `albumId`

**settings**
- `deviceId`, `slideshowDuration`, `transitionType`, `displayMode`, `brightness`, `timezone`, `language`

**users**
- `id`, `username`, `passwordHash`, `role` (admin/user), `createdAt`

### Collection Logic

A device's collection is the union of all photos in its assigned albums, ordered by album sort order then photo sort order within each album.

## Web UI

### Visual Design

Retro Kodak aesthetic inspired by 1970s–80s Kodak print advertising. Classic Kodak red and yellow palette, warm tones, vintage typography. Film-strip motifs, rounded corners reminiscent of old Kodak packaging. Photo grid styled like prints laid out on a table.

### Authentication

- **First run:** Setup wizard creates admin account (username + password)
- **Admin** can create/manage additional user accounts
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens for API authentication, 24-hour expiry (configurable)
- JWT secret auto-generated on first run, stored in database

### Pages

1. **Setup Wizard** (first run only) — create admin account, configure basics
2. **Login** — username/password with retro Kodak branding
3. **Dashboard** — frame status (online/offline, last seen, storage metrics), quick stats
4. **Photos** — grid view, drag-and-drop upload, bulk select/delete/add-to-album, per-photo crop adjustment, EXIF data
5. **Albums** — create/rename/delete, drag-to-reorder photos and albums, thumbnail previews
6. **Frame Settings** — slideshow duration, transition type, display mode, brightness, timezone, language, polling interval
7. **Device Management** — connected frames, album assignments, connection history
8. **User Management** (admin only) — create/edit/delete users
9. **Server Settings** (admin only) — DNS upstream, watched folder path, port config

## SSL & Security

### Self-Signed Certificate

- Auto-generated on first run via `selfsigned`
- Stored in `data/certs/`
- Regenerated if cert files are missing
- Frame's MatrixSSL client doesn't validate — self-signed works

### Network Exposure

- Server binds to `0.0.0.0` (frame must be able to reach it)
- All web UI API routes require JWT authentication
- Kodak API routes are unauthenticated (frame doesn't support auth, only the frame talks to these endpoints)

## Deployment

### launchd Service

- Plist file included in repo
- Runs as root (port 53 requires it), drops privileges for application logic
- Auto-starts on boot, restarts on crash
- Logs to `data/logs/`

### First-Run Experience

1. Clone repo, `npm install`, `npm run build`
2. Run install script — copies launchd plist, starts service
3. Open `http://localhost:3000` — setup wizard creates admin account
4. Server auto-generates SSL cert and starts all services

### Frame Setup

1. **TP-Link Tether app:** Assign static IP to Mac mini via DHCP reservation
   - Open Tether → select router → Clients → find Mac mini → Reserve IP
2. **Frame WiFi:** Settings → Advanced → set DNS server to Mac mini's static IP
3. Frame connects, activates, appears in Device Management

### Configuration

- `data/config.json` for all server settings
- Sensible defaults — zero config beyond setup wizard
- Environment variable overrides for all settings

### Backup

Copy the `data/` directory to back up everything: photos, database, certs, config.
