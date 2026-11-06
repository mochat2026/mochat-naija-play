# Mochat Naija Play

Build a complete WhatsApp-style chatting app called MoChat. Slogan: "Don't be alone, Chat Out"



DESIGN:

Main color is PINK (#FF4D8D) with soft white, light purple (#A855F7) and peach (#FFE4EC) to match. Modern, beautiful, friendly, youth design like WhatsApp but more colorful and fun. Use rounded bubbles, smooth animations.



AUTH:

Login / Sign up with phone number and name, profile photo upload, bio. OTP verification screen (demo).



MAIN FEATURES - MUST WORK LIKE WHATSAPP:



1. CHATS TAB:

- Chat list like WhatsApp with profile photo, last message, time, unread badge, online status

- 1-on-1 chat screen: send text, emojis, stickers, voice notes (record and play), photos, videos, documents (PDF, Word), location

- Reply, forward, delete, star messages

- Voice and Video Call buttons in chat, with calling screen UI

- Background changing: user can change chat wallpaper from 6 beautiful pink wallpapers



2. STATUS TAB:

- Upload status: photo, video, text status with pink ring

- View friends status, reply to status, status privacy, 24h timer, seen list

- My Status section at top



3. CALLS TAB:

- Voice call and Video call history, missed, incoming, outgoing

- Call screen with mute, speaker, video on/off, end call



4. STATE GROUPS - SPECIAL FEATURE:

- A tab called "States"

- List of all 36 Nigerian States + FCT: Lagos, Abuja, Kano, Kaduna, Rivers, Oyo, etc.

- Each state has a big group chat where people from that state meet and chat

- User selects their state when signing up and auto-joins that state group

- State group shows state flag color, member count, active members

- Can send messages, photos, voice notes inside state group



5. GAMING PLATFORM - SPECIAL FEATURE:

- A tab called "Games"

- Two different players can play games online together

- Games to include: Ludo, Tic-Tac-Toe, Chess, Whot Card Game

- Game lobby: Create room, Join room, Invite friend from chat to play

- Live game board, player turn, score, winner celebration with confetti

- Chat inside game while playing



6. SETTINGS:

- Profile, Privacy, Notifications, Chat wallpaper, Storage, Help

- Dark mode and Light mode



TECH:

Use React, Tailwind, Supabase for real-time messages, storage for media. Make it fully responsive for mobile phone first. Make all buttons work. Create demo data: 8 demo chats, 5 demo statuses, 3 demo state groups, 2 demo games.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d9df26d-011d-44fa-bc80-07a695bbb215).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
