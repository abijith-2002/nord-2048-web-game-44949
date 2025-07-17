#!/bin/bash
cd /home/kavia/workspace/code-generation/nord-2048-web-game-44949/2048_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

