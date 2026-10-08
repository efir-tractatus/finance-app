import { createApp } from './app';
import { withCache } from './cache';
import { createYahooProvider } from './yahooProvider';

const port = Number(process.env.PORT ?? 4000);
const app = createApp(withCache(createYahooProvider(), 60_000));

app.listen(port, () => {
  console.log(`Market data proxy listening on http://localhost:${port}`);
});
