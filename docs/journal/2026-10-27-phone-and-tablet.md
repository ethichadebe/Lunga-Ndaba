# Phone and tablet behave like a device

- **Asked for:** match the reference site's behaviour on phones (it works like a phone) and tablets (it resizes to a tablet view), from a screen recording; plus a full walkthrough of the go-live steps.
- **Worked first time:** mostly. The screenshots showed a focus ring on the lock screen and icon labels out of line; both fixed. Rehearsing the walkthrough found two traps that would have hit on the server: compose refuses to start the database while the image names in `.env` are empty, and a `docker compose` backup job would fail for the same reason. Both are handled in `docs/go-live.md`.
- **Laptop needed:** no.
- **Friction:** the sandbox restarted overnight. Docker had to be restarted and the proxy port had changed. The test photos on the uploads folder survived it.
