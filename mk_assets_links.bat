@echo off
setlocal enabledelayedexpansion


set ASSETS_DIRNAME=assets
set TARGETS_FILE=assets_targets


if not exist "%ASSETS_DIRNAME%" (
    mkdir "%ASSETS_DIRNAME%"
)

for /f "usebackq delims=" %%F in ("%TARGETS_FILE%") do (
    if exist "%%F\assets" (
        del /f /q "%%F\%ASSETS_DIRNAME%"
    )
    mklink /J "%%F\%ASSETS_DIRNAME%" "%ASSETS_DIRNAME%"
)

endlocal