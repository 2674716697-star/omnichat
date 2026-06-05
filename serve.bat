@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: OmniChat Local Server Launcher
:: Auto-detects Python from PATH, validates by running -c "import http.server",
:: then falls back to Codex bundled Python.
:: Usage: serve.bat [port]
:: ============================================================================

set "PORT=8000"
if not "%~1"=="" set "PORT=%~1"

set "PYTHON_EXE="
set "CODEX_STATUS="
set "CODEX_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

:: --- Step 1: try PATH candidates with runtime validation ---------------------
:: Each candidate is tested by actually running -c "import http.server".
:: Only candidates that return exit code 0 are accepted.
:: This avoids accepting broken Python installations or App Execution Aliases
:: that "where" finds but cannot serve HTTP.

python -c "import http.server" >nul 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_EXE=python"
    goto :found
)

py -c "import http.server" >nul 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_EXE=py"
    goto :found
)

python3 -c "import http.server" >nul 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_EXE=python3"
    goto :found
)

:: --- Step 2: fallback to Codex bundled Python -------------------------------
:: Also validate by runtime check, not just file existence.
if exist "!CODEX_PYTHON!" (
    "!CODEX_PYTHON!" -c "import http.server" >nul 2>nul
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=!CODEX_PYTHON!"
        echo [INFO] Using Codex bundled Python: !PYTHON_EXE!
        goto :found
    )
    set "CODEX_STATUS=invalid"
    echo [WARN] Codex Python found but cannot import http.server
) else (
    set "CODEX_STATUS=missing"
)

:: --- Step 3: nothing worked -------------------------------------------------
echo.
echo ==============================================
echo   Python not found or not working
echo ==============================================
echo.
echo   Tried: python, py, python3 -- none in PATH or failed validation.
if "!CODEX_STATUS!"=="missing" (
    echo   Codex fallback file does not exist:
    echo     !CODEX_PYTHON!
)
if "!CODEX_STATUS!"=="invalid" (
    echo   Codex fallback exists but failed validation:
    echo     !CODEX_PYTHON!
)
echo.
echo   To fix this:
echo     1. Install Python from https://python.org
echo        (check "Add to PATH" during installation)
echo     2. Or reinstall Claude Code / Codex to repair bundled Python
echo     3. Or add a working Python folder to your PATH
echo.
pause
exit /b 1

:: --- Start server -----------------------------------------------------------
:found
echo.
echo   OmniChat -- Local Server
echo   --------------------------------------------
echo   Python  : !PYTHON_EXE!
echo   Port    : !PORT!
echo   URL     : http://localhost:!PORT!
echo   Stop    : Ctrl + C
echo   --------------------------------------------
echo.

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Failed to enter project directory: %~dp0
    pause
    exit /b 1
)

:: Open browser after a short delay (so the server is ready)
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:!PORT!"

"!PYTHON_EXE!" -m http.server !PORT!

if errorlevel 1 (
    echo.
    echo [ERROR] Python http.server exited with an error.
    pause
)
