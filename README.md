# economy-simulator

**Capital & Shelter**: a 10-year rent vs. buy simulator.

- `/` is a static landing page (`index.html`)
- `/simulator` is the interactive React simulator (`simulator/index.html` → `src/RentVsBuySimulator.tsx`)

Built with Vite, React, Tailwind CSS and lucide-react.

## Development

```bash
npm install
npm run dev      # http://localhost:5173 (simulator at /simulator/)
npm run build    # outputs to dist/
npm run preview
```

## Deploying to Vercel

Import the repo in Vercel. `vercel.json` already sets the Vite preset, the build command and `dist` as the output directory, so no extra configuration is needed. Or deploy from the CLI:

```bash
npx vercel        # preview
npx vercel --prod # production
```
