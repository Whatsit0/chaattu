# Chaattiko 🚀

> **A sleek, modern, device-locked anonymous web chat designed specially for college campuses.**
> Features real-time messaging, 24-hour persistent ephemeral storage (online & offline), Thanos-style sand dissolve hero animation, meme stickers, pop emoji reactions, dark/light mode toggle, 1-on-1 favorite/block controls, direct-to-admin feedback, and paired-thread administrative oversight.

---

## ✨ Key Features

1. **Permanent Device-Locked Account (One-Time Login)**
   - No email, password, or sign-up required.
   - User chooses a unique handle (e.g. `Batman`) and optional gender.
   - Automatically binds a persistent `deviceToken` to that username.
   - Automatically bypasses login on reload or revisit.

2. **24-Hour Ephemeral Offline & Online Chat**
   - Messages remain securely stored on the server for **24 hours**.
   - Offline recipients see messages upon reopening.
   - Background garbage-collection cleans expired messages every 10 minutes.

3. **Center Hero Title with Thanos Sand Dissolve Effect**
   - Sleek centered **Chaattiko** typography on arrival.
   - Dissolves into glowing cosmic sand/stardust particles drifting into space upon opening any chat or sending a message.

4. **Interactive Campus Features**
   - 🎲 **Random Stranger**: One-click pairing with online campus students.
   - 🐱 **Meme Stickers**: Quick sticker drawer (Popcat, Doge, Pepe, Gigachad, Stonks, etc.).
   - ❤️ **Pop Emoji Reactions**: Double-tap any message or hover to drop reactions (❤️, 😂, 🔥, 😮, 👏, 🚀).

5. **Safety & Community Controls**
   - Mandatory 18+ Terms of Service acceptance with modal.
   - ⭐ **Favorites**: Star contacts to pin them to the top of the sidebar.
   - 🚫 **Block**: Instantly mute and drop messages from any user.
   - 💬 **Direct Feedback**: In-app suggestion and reporting box routed directly to admins.

6. **Administrative Oversight Portal (`/admin`)**
   - Protected with secure passcode: `levin514326@2008`.
   - **Paired Conversation Thread View**: Left column lists chatting pairs (e.g., `Batman ↔ Spider-Man`), right column displays mirrored back-and-forth chat bubbles.
   - Real-time device metadata (IP, OS, browser, geolocation).
   - One-click Kick, Ban, and Delete controls.

---

## 🚀 Quick Start (Local Run)

```bash
# 1. Install server dependencies
npm install

# 2. Install client dependencies & build frontend
npm run build

# 3. Start production server
npm start
```
Server runs at `http://localhost:3001`.

---

## 🌐 Deploy to Render / Railway / Heroku

1. Push this repository to GitHub.
2. In Render / Railway:
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: (Provided by host automatically, defaults to `3001`)
     - `ADMIN_PASSCODE`: `levin514326@2008` (or customize)
