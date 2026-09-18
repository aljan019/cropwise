@echo off
setlocal

cd /d "%~dp0"
if exist ".tools\node-v20.18.1-win-x64\node.exe" (
  set "PATH=%CD%\.tools\node-v20.18.1-win-x64;%PATH%"
)

if exist "%CD%\CropWise-Ai\venv\Scripts\python.exe" (
  set "PY=%CD%\CropWise-Ai\venv\Scripts\python.exe"
) else (
  set "PY=py"
)

start "CropWise Web" cmd /k "cd /d "%~dp0client" && npm install && npm run dev"
start "CropWise API" cmd /k "cd /d "%~dp0AIML" && "%PY%" -m pip install -r requirements.txt && "%PY%" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

endlocal
