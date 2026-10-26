# First build of the portfolio

- **Asked for:** the whole site: a desktop-style portfolio with original icons, fast responsive images from kept originals, embedded (not hosted) video, a phone-friendly admin, a moderated note box, and the compose deploy.
- **Worked first time:** mostly. Checks found four bugs before the PR: AVIF served as `application/octet-stream`, the viewer pre-fetching JPEGs alongside AVIFs, cropped covers asking for files too small to be sharp, and the worker overwriting the original's dimensions with the web size. All fixed.
- **Laptop needed:** no.
- **Friction:** the shared dispatcher (`server/md-deploy-root` on `main`) has no `lunga-ndaba` block yet, so the deploy can't run until one is added. Docker builds in the cloud sandbox needed the session proxy, using local-only copies of the Dockerfiles; the committed Dockerfiles are unchanged.
