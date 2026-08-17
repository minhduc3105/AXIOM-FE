# Development environment note

- Run AXIOM-FE commands from the VS Code Remote/WSL terminal, not through the Windows Node shim at `/mnt/c/Program Files/nodejs`.
- Before running tests, confirm `node -v` and `npm -v` resolve inside the remote Linux session. On 2026-08-17, the verified runtime was Node `v24.18.0` and npm `11.16.0`.
- If npm reports `WSL 1 is not supported` or cannot determine the Node directory, restart VS Code into the remote connection, open a new terminal, then re-check the two version commands.

Validate frontend changes with:

```bash
npm run test
npm run build
```
