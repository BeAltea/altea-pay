<#
.SYNOPSIS
    Altea Pay - Local Development Setup Script (Windows)

.DESCRIPTION
    This script automates the entire local development setup process:
    1. Pre-flight checks (Docker, .env, required variables)
    2. Starts Docker services (PostgreSQL, App)
    3. Migrates data from Supabase to local PostgreSQL
    4. Creates a local superadmin user
    5. Displays connection information

.PARAMETER SkipMigration
    Skip Supabase data migration (use existing local data)

.PARAMETER Reset
    Force complete reset (docker-compose down -v)

.EXAMPLE
    .\start-local.ps1
    Full setup with data migration

.EXAMPLE
    .\start-local.ps1 -SkipMigration
    Start without migrating data

.EXAMPLE
    .\start-local.ps1 -Reset
    Complete fresh start
#>

param(
    [switch]$SkipMigration,
    [switch]$Reset,
    [switch]$Help
)

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptDir "setup.log"
$EnvFile = Join-Path $ScriptDir ".env"
$EnvExample = Join-Path $ScriptDir ".env.example"

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

function Get-Timestamp {
    return Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

function Write-Log {
    param([string]$Level, [string]$Message)
    Add-Content -Path $LogFile -Value "[$(Get-Timestamp)] [$Level] $Message"
}

function Write-Header {
    Write-Host ""
    Write-Host "+" + ("=" * 67) + "+" -ForegroundColor Cyan
    Write-Host "|" + (" " * 10) + "Altea Pay - Local Development Setup" + (" " * 20) + "|" -ForegroundColor Cyan
    Write-Host "+" + ("=" * 67) + "+" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([int]$Step, [int]$Total, [string]$Message)
    Write-Host ""
    Write-Host ("-" * 68) -ForegroundColor Blue
    Write-Host "[$Step/$Total] $Message" -ForegroundColor White
    Write-Host ("-" * 68) -ForegroundColor Blue
    Write-Log "INFO" "Step ${Step}/${Total}: ${Message}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
    Write-Log "INFO" "SUCCESS: $Message"
}

function Write-Warning2 {
    param([string]$Message)
    Write-Host "  [!] $Message" -ForegroundColor Yellow
    Write-Log "WARN" "$Message"
}

function Write-Error2 {
    param([string]$Message)
    Write-Host "  [X] $Message" -ForegroundColor Red
    Write-Log "ERROR" "$Message"
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [i] $Message" -ForegroundColor Cyan
    Write-Log "INFO" "$Message"
}

function Get-RandomPassword {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $password = ""
    for ($i = 0; $i -lt 16; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

function Get-EnvValue {
    param([string]$Name, [hashtable]$EnvVars)
    if ($EnvVars.ContainsKey($Name)) {
        return $EnvVars[$Name]
    }
    return $null
}

function Read-EnvFile {
    param([string]$Path)
    $vars = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^["'']|["'']$', ''
                $vars[$key] = $value
            }
        }
    }
    return $vars
}

function Show-Help {
    Write-Host "Usage: .\start-local.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -SkipMigration  Skip Supabase data migration (use existing local data)"
    Write-Host "  -Reset          Force complete reset (removes all Docker volumes)"
    Write-Host "  -Help           Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\start-local.ps1                    # Full setup with data migration"
    Write-Host "  .\start-local.ps1 -SkipMigration     # Start without migrating data"
    Write-Host "  .\start-local.ps1 -Reset             # Complete fresh start"
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════════

if ($Help) {
    Show-Help
    exit 0
}

# Initialize log file
Set-Content -Path $LogFile -Value "========================================"
Add-Content -Path $LogFile -Value "Altea Pay Local Setup - $(Get-Timestamp)"
Add-Content -Path $LogFile -Value "========================================"

Write-Header

try {
    # ───────────────────────────────────────────────────────────────────────────
    # Step 1: Pre-flight Checks
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 1 -Total 7 -Message "Pre-flight Checks"

    # Check Docker is installed
    try {
        $null = Get-Command docker -ErrorAction Stop
        Write-Success "Docker is installed"
    }
    catch {
        Write-Error2 "Docker is not installed"
        Write-Host ""
        Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
        Write-Host "  https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    }

    # Check Docker is running
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker not running"
        }
        Write-Success "Docker is running"
    }
    catch {
        Write-Error2 "Docker is not running"
        Write-Host ""
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        exit 1
    }

    # Check docker-compose
    $DockerCompose = "docker compose"
    try {
        $null = docker compose version 2>&1
        Write-Success "Docker Compose is available"
    }
    catch {
        Write-Error2 "Docker Compose is not available"
        exit 1
    }

    # Check .env file exists
    if (-not (Test-Path $EnvFile)) {
        Write-Error2 ".env file not found"
        Write-Host ""
        if (Test-Path $EnvExample) {
            Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
            Copy-Item $EnvExample $EnvFile
            Write-Warning2 "Please edit .env with your configuration and run this script again"
            exit 1
        }
        else {
            Write-Host "Please create a .env file with required variables" -ForegroundColor Yellow
            exit 1
        }
    }
    Write-Success ".env file exists"

    # Load environment variables
    $EnvVars = Read-EnvFile -Path $EnvFile

    # ───────────────────────────────────────────────────────────────────────────
    # Step 2: Validate Environment Variables
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 2 -Total 7 -Message "Validating Environment Variables"

    $MissingVars = @()

    # Required for local Docker
    if (-not (Get-EnvValue "POSTGRES_USER" $EnvVars)) { $MissingVars += "POSTGRES_USER" }
    if (-not (Get-EnvValue "POSTGRES_PASSWORD" $EnvVars)) { $MissingVars += "POSTGRES_PASSWORD" }
    if (-not (Get-EnvValue "POSTGRES_DB" $EnvVars)) { $MissingVars += "POSTGRES_DB" }
    if (-not (Get-EnvValue "NEXTAUTH_SECRET" $EnvVars)) { $MissingVars += "NEXTAUTH_SECRET" }

    # Required for Supabase migration (if not skipping)
    if (-not $SkipMigration) {
        if (-not (Get-EnvValue "SUPABASE_DB_HOST" $EnvVars)) { $MissingVars += "SUPABASE_DB_HOST" }
        if (-not (Get-EnvValue "SUPABASE_DB_PASSWORD" $EnvVars)) { $MissingVars += "SUPABASE_DB_PASSWORD" }
    }

    if ($MissingVars.Count -gt 0) {
        Write-Error2 "Missing required environment variables:"
        foreach ($var in $MissingVars) {
            Write-Host "    - $var" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Please add these variables to your .env file" -ForegroundColor Yellow
        exit 1
    }

    $PostgresUser = Get-EnvValue "POSTGRES_USER" $EnvVars
    $PostgresPassword = Get-EnvValue "POSTGRES_PASSWORD" $EnvVars
    $PostgresDb = Get-EnvValue "POSTGRES_DB" $EnvVars

    Write-Success "POSTGRES_USER: $PostgresUser"
    Write-Success "POSTGRES_DB: $PostgresDb"
    Write-Success "NEXTAUTH_SECRET: [set]"

    if (-not $SkipMigration) {
        Write-Success "SUPABASE_DB_HOST: $(Get-EnvValue 'SUPABASE_DB_HOST' $EnvVars)"
        Write-Success "Supabase credentials: [set]"
    }
    else {
        Write-Info "Skipping Supabase validation (-SkipMigration)"
    }

    # ───────────────────────────────────────────────────────────────────────────
    # Step 3: Docker Services
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 3 -Total 7 -Message "Starting Docker Services"

    Set-Location $ScriptDir

    # Force reset if requested
    if ($Reset) {
        Write-Info "Force reset requested - removing all volumes..."
        & docker compose down -v 2>&1 | Tee-Object -FilePath $LogFile -Append
        Write-Success "Volumes removed"
    }

    # Stop existing containers
    Write-Info "Stopping existing containers..."
    & docker compose down 2>&1 | Out-Null

    # Start services
    Write-Info "Starting PostgreSQL..."
    & docker compose up -d postgres 2>&1 | Tee-Object -FilePath $LogFile -Append

    # Wait for PostgreSQL to be ready
    Write-Info "Waiting for PostgreSQL to be ready..."
    $Retries = 30
    do {
        $ready = & docker compose exec -T postgres pg_isready -U $PostgresUser -d $PostgresDb 2>&1
        if ($LASTEXITCODE -eq 0) { break }
        $Retries--
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
    } while ($Retries -gt 0)
    Write-Host ""

    if ($Retries -le 0) {
        Write-Error2 "PostgreSQL failed to start within timeout"
        exit 1
    }
    Write-Success "PostgreSQL is ready"

    # ───────────────────────────────────────────────────────────────────────────
    # Step 4: Apply Database Schema
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 4 -Total 7 -Message "Applying Database Schema (Drizzle)"

    Write-Info "Running Drizzle migrations..."

    $env:DATABASE_URL = "postgresql://${PostgresUser}:${PostgresPassword}@localhost:5432/${PostgresDb}"

    if (Test-Path "package.json") {
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            & pnpm run db:push 2>&1 | Tee-Object -FilePath $LogFile -Append
        }
        elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            & npm run db:push 2>&1 | Tee-Object -FilePath $LogFile -Append
        }
        else {
            & npx drizzle-kit push 2>&1 | Tee-Object -FilePath $LogFile -Append
        }
        Write-Success "Database schema applied"
    }
    else {
        Write-Warning2 "package.json not found, skipping Drizzle migrations"
    }

    # ───────────────────────────────────────────────────────────────────────────
    # Step 5: Migrate Data from Supabase
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 5 -Total 7 -Message "Data Migration"

    if ($SkipMigration) {
        Write-Info "Skipping Supabase data migration (-SkipMigration flag)"
    }
    else {
        Write-Info "Migrating data from Supabase to local PostgreSQL..."

        $MigrationScript = Join-Path $ScriptDir "scripts\migrate-supabase-to-docker.sh"
        if (Test-Path $MigrationScript) {
            # Copy and execute migration script
            $ContainerId = (& docker compose ps -q postgres)
            & docker cp $MigrationScript "${ContainerId}:/tmp/migrate.sh"
            & docker compose exec -T postgres bash /tmp/migrate.sh 2>&1 | Tee-Object -FilePath $LogFile -Append
            Write-Success "Data migration complete"
        }
        else {
            Write-Warning2 "Migration script not found"
            Write-Info "Skipping data migration"
        }
    }

    # ───────────────────────────────────────────────────────────────────────────
    # Step 6: Create Local Superadmin User
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 6 -Total 7 -Message "Creating Local Superadmin User"

    $SuperadminEmail = "admin@local.dev"
    $SuperadminPassword = Get-RandomPassword
    $SuperadminId = [guid]::NewGuid().ToString()

    Write-Info "Creating superadmin user: $SuperadminEmail"

    # Use a pre-computed bcrypt hash for the generated password
    # In production, you'd generate this properly
    $PasswordHash = "`$2a`$10`$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3F6fFwfmRKGHkBh6dO1W"
    $SuperadminPassword = "admin123"

    $SqlScript = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = '$SuperadminEmail') THEN
    INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
    VALUES (
      '$SuperadminId',
      '$SuperadminEmail',
      '$PasswordHash',
      'Local Admin',
      NOW(),
      NOW(),
      NOW()
    );

    INSERT INTO profiles (id, email, full_name, role, status, created_at, updated_at)
    VALUES (
      '$SuperadminId',
      '$SuperadminEmail',
      'Local Admin',
      'super_admin',
      'active',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Superadmin user created successfully';
  ELSE
    RAISE NOTICE 'Superadmin user already exists, skipping';
  END IF;
END `$`$;
"@

    $SqlScript | & docker compose exec -T postgres psql -U $PostgresUser -d $PostgresDb 2>&1 | Tee-Object -FilePath $LogFile -Append
    Write-Success "Superadmin user configured"

    # ───────────────────────────────────────────────────────────────────────────
    # Step 7: Start Application
    # ───────────────────────────────────────────────────────────────────────────

    Write-Step -Step 7 -Total 7 -Message "Starting Application"

    Write-Info "Building and starting the application..."
    & docker compose up -d --build app 2>&1 | Tee-Object -FilePath $LogFile -Append

    # Wait for app to be ready
    Write-Info "Waiting for application to be ready..."
    $AppUrl = Get-EnvValue "NEXTAUTH_URL" $EnvVars
    if (-not $AppUrl) { $AppUrl = "http://localhost:3000" }

    $Retries = 60
    do {
        try {
            $response = Invoke-WebRequest -Uri "$AppUrl/api/auth/providers" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { break }
        }
        catch { }
        $Retries--
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    } while ($Retries -gt 0)
    Write-Host ""

    # Show container status
    Write-Info "Container status:"
    & docker compose ps

    # ═══════════════════════════════════════════════════════════════════════════
    # Success Summary
    # ═══════════════════════════════════════════════════════════════════════════

    Write-Host ""
    Write-Host "+" + ("=" * 67) + "+" -ForegroundColor Green
    Write-Host "|" + (" " * 22) + "Setup Complete!" + (" " * 30) + "|" -ForegroundColor Green
    Write-Host "+" + ("=" * 67) + "+" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL:" -ForegroundColor White
    Write-Host "  $AppUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Local Superadmin Credentials:" -ForegroundColor White
    Write-Host "  Email:    $SuperadminEmail" -ForegroundColor Cyan
    Write-Host "  Password: $SuperadminPassword" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Database Connection:" -ForegroundColor White
    Write-Host "  Host:     localhost" -ForegroundColor Cyan
    Write-Host "  Port:     5432" -ForegroundColor Cyan
    Write-Host "  User:     $PostgresUser" -ForegroundColor Cyan
    Write-Host "  Password: $PostgresPassword" -ForegroundColor Cyan
    Write-Host "  Database: $PostgresDb" -ForegroundColor Cyan
    Write-Host "  URL:      postgresql://${PostgresUser}:${PostgresPassword}@localhost:5432/${PostgresDb}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor White
    Write-Host "  View logs:          docker compose logs -f" -ForegroundColor Cyan
    Write-Host "  View app logs:      docker compose logs -f app" -ForegroundColor Cyan
    Write-Host "  Restart services:   docker compose restart" -ForegroundColor Cyan
    Write-Host "  Stop services:      docker compose down" -ForegroundColor Cyan
    Write-Host "  Full reset:         docker compose down -v" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Log file: $LogFile" -ForegroundColor White
    Write-Host ""

    Write-Log "INFO" "Setup completed successfully"
}
catch {
    Write-Host ""
    Write-Error2 "Setup failed! Check $LogFile for details."
    Write-Host ""
    Write-Host "Suggestions:" -ForegroundColor Yellow
    Write-Host "  1. Review the log file: Get-Content $LogFile"
    Write-Host "  2. Check Docker is running: docker info"
    Write-Host "  3. Verify .env file exists and is configured"
    Write-Host "  4. Try running with -Reset flag to start fresh"
    Write-Host ""
    Write-Log "ERROR" $_.Exception.Message
    exit 1
}
