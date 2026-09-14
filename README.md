# TaskFlow Frontend — Setup

## 1. Install the Angular CLI (if not already installed)

```bash
npm install -g @angular/cli
ng version
```

## 2. Install project dependencies

```bash
npm install
```

## 3. Check the backend URL is correct

Open `src/environments/environment.ts` (and `environment.development.ts`) and confirm:

```ts
export const environment = {
  production: false,
  api_url: 'http://localhost:5000/api/',
  socket_url: 'http://localhost:5000',
};
```

Update both if the backend runs on a different host/port.

## 4. Make sure the backend is running first

See `../taskflow-api/README.md`.

## 5. Run the app

```bash
ng serve
```

## 6. Open it

```
http://localhost:4200
```
