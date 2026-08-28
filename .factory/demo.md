# Reading Sprint Rail demo

Open `/demo` or select **Try it with sample data** on the home page. The demo
opens a seeded three-stop article, including one location-linked note, so the
reader is usable immediately.

The demo uses IndexedDB database `demo:reading-sprint-rail` and local-storage
keys prefixed `demo:`. It never reads or writes the real database
`reading-sprint-rail`. The persistent banner names this state and provides
**Reset demo**, which reseeds the sample, and **Start for real**, which clears
the demo namespace before returning to the empty real reader.

After the first visit, the service worker precaches the reader shell. The
sample is already in the demo database, so `/demo` continues to work offline.
