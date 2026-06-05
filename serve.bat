@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: OmniChat Local Server Launcher
:: Auto-detects Python from PATH, then falls back to Codex bundled Python.
:: Usage: serve.bat [port]
:: ============================================================================

set "PORT=8000"
if not "%~1"=="" set "PORT=%~1"

set "PYTHON_EXE="

:: --- Step 1: search PATH for python / py / python3 --------------------------
for %%c in (python py python3) do (
    if not defined PYTHON_EXE (
        where %%c >nul 2>nul
        if !errorlevel! equ 0 (
            for /f "delims=" %%p in ('where %%c 2^>nul') do (
                set "PYTHON_EXE=%%p"
                goto :found
            )
        )
    )
)

:: --- Step 2: fallback to Codex bundled Python -------------------------------
set "CODEX_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if not defined PYTHON_EXE (
    if exist "!CODEX_PYTHON!" (
        set "PYTHON_EXE=!CODEX_PYTHON!"
        echo [INFO] Using Codex bundled Python: !PYTHON_EXE!
        goto :found
    )
)

:: --- Step 3: give up with a clear message -----------------------------------
echo.
echo ==============================================
echo   Python not found
echo ==============================================
echo.
echo   Commands tried: python, py, python3 -- none in PATH.
echo   Codex fallback: !CODEX_PYTHON!
echo   That path also does not exist.
echo.
echo   To fix this:
echo     1. Install Python from https://python.org
echo        (check "Add to PATH" during installation)
echo     2. Or install Claude Code / Codex which bundles its own Python
echo     3. Or add the Python folder to your PATH environment variable
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
