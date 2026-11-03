# Blog Frontend (React + Vite)

Web UI for the Blog Management System: browse and search posts, read and comment, write, edit and publish posts, manage categories.

## File structure

```
frontend/
├── index.html
├── package.json
├── README.md
├── vite.config.js          dev server + /api proxy to port 5000
└── src/
    ├── api.js              axios instance (adds the login token)
    ├── App.jsx             header, navigation, routes, route guards
    ├── auth.jsx            login state shared across the app
    ├── main.jsx            entry point + error screen
    ├── pages.jsx           Home, PostPage, AuthPage, Dashboard, Editor, Categories
    └── styles.css
```

`node_modules/` is created by `npm install`. `dist/` is created by `npm run build`.

## Requirements

- Node.js 18 or newer
- The backend running on `http://localhost:5000` (see `backend/README.md`)

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Do not double-click `index.html`; it only works through the dev server.

In development, requests to `/api` are proxied to the backend (see `vite.config.js`), so no `.env` is needed.

## Environment variable (optional)

Create `frontend/.env` only if your API is on another address:

```env
VITE_API_URL=https://your-api-domain.com/api
```

Restart `npm run dev` after changing it. Never put secrets here; everything in this file is visible in the browser.

## Production build

```bash
npm run build      # output in dist/
npm run preview    # test the build locally
```

Upload `dist/` to any static host, and set `CLIENT_URL` in the backend `.env` to the frontend's real address.

## Pages

| Route | Access | What it does |
|---|---|---|
| `/` | public | Published posts, search, category filter, pagination |
| `/post/:slug` | public | Read a post, see and add comments |
| `/login`, `/register` | public | Authentication (first user becomes admin) |
| `/dashboard` | logged in | Your posts: edit, publish/unpublish, delete |
| `/editor`, `/editor/:id` | logged in | Write or edit a post, save draft or publish |
| `/categories` | admin | Add, rename, delete categories |

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page, error mentions `file:///` | You opened `index.html` directly. Use `npm run dev` and `http://localhost:5173` |
| `React is not defined` | Each `.jsx` file with JSX must start with `import React from 'react';` |
| `ERR_CONNECTION_REFUSED` on `localhost:5000` | The backend isn't running. Start it first |
| Page shows "Cannot reach the API" | Same as above, or MongoDB isn't connected |
| React Router "Future Flag Warning" | Harmless; ignore |
| `favicon.ico 404` | Harmless; the site just has no tab icon |

## Notes

Post content is shown as plain text with line breaks kept, which avoids HTML injection. To support Markdown later, add `react-markdown` and render `post.content` with it.
