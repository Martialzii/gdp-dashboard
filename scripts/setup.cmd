@echo off
setlocal
set "ROOT=%~dp0.."
set "CHOICE=%~1"

if not defined CHOICE (
  echo Choose dashboard implementation to set up:
  echo   1^) TypeScript / JavaScript
  echo   2^) Go
  echo   3^) Both
  set /p "CHOICE=Selection [1-3]: "
)

if /i "%CHOICE%"=="1" set "CHOICE=typescript"
if /i "%CHOICE%"=="2" set "CHOICE=go"
if /i "%CHOICE%"=="3" set "CHOICE=both"
if /i "%CHOICE%"=="ts" set "CHOICE=typescript"
if /i not "%CHOICE%"=="typescript" if /i not "%CHOICE%"=="go" if /i not "%CHOICE%"=="both" (
  echo Choice must be typescript, go, or both. 1>&2
  exit /b 2
)

if /i "%CHOICE%"=="typescript" (
  call :typescript
  if errorlevel 1 exit /b 1
)
if /i "%CHOICE%"=="go" (
  call :go
  if errorlevel 1 exit /b 1
)
if /i "%CHOICE%"=="both" (
  call :typescript
  if errorlevel 1 exit /b 1
  call :go
  if errorlevel 1 exit /b 1
)

echo.
echo Setup complete. Start the selected dashboard with:
if /i "%CHOICE%"=="typescript" echo   cd typescript-dashboard ^&^& npm start  ^(http://localhost:3000^)
if /i "%CHOICE%"=="go" echo   .\bin\gdp-dashboard.exe  ^(http://localhost:8080^)
if /i "%CHOICE%"=="both" (
  echo   cd typescript-dashboard ^&^& npm start  ^(http://localhost:3000^)
  echo   .\bin\gdp-dashboard.exe  ^(http://localhost:8080^)
)
exit /b 0

:typescript
where node >nul 2>nul || (
  echo TypeScript setup requires Node.js 18+ and npm. Install them from https://nodejs.org/ and retry. 1>&2
  exit /b 1
)
where npm >nul 2>nul || (
  echo TypeScript setup requires npm. Install Node.js 18+ from https://nodejs.org/ and retry. 1>&2
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 18) process.exit(1)" || (
  echo TypeScript setup requires Node.js 18 or newer. 1>&2
  exit /b 1
)
npm --prefix "%ROOT%\typescript-dashboard" ci || exit /b 1
npm --prefix "%ROOT%\typescript-dashboard" run build || exit /b 1
exit /b 0

:go
where go >nul 2>nul || (
  echo Go setup requires Go 1.21+. Install it from https://go.dev/dl/ and retry. 1>&2
  exit /b 1
)
set "GOVERSION="
set "GOMAJOR="
set "GOMINOR="
for /f "tokens=3" %%v in ('go version') do set "GOVERSION=%%v"
set "GOVERSION=%GOVERSION:go=%"
for /f "tokens=1,2 delims=." %%a in ("%GOVERSION%") do (
  set "GOMAJOR=%%a"
  set "GOMINOR=%%b"
)
if not defined GOMINOR (
  echo Unable to determine Go version. 1>&2
  exit /b 1
)
if %GOMAJOR% LSS 1 (
  echo Go setup requires Go 1.21 or newer. 1>&2
  exit /b 1
)
if %GOMAJOR% EQU 1 if %GOMINOR% LSS 21 (
  echo Go setup requires Go 1.21 or newer. 1>&2
  exit /b 1
)
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"
pushd "%ROOT%"
go build -o "%ROOT%\bin\gdp-dashboard.exe" ./go-dashboard
if errorlevel 1 (
  popd
  exit /b 1
)
popd
exit /b 0
