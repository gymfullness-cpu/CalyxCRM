# fix-all.ps1
# Bulk fixes for common Vercel/Next/Prisma7 build issues we hit:
# 1) Replace "@/app/lib/db" -> "@/app/lib/prisma"
# 2) Remove enum imports from "@prisma/client" in app/lib/ai/*.ts (LeadStatus, InteractionType, etc.)
# 3) Ensure app/lib/prisma.ts uses dynamic require (avoids build-time PrismaClient export showstopper)
# 4) Ensure package.json has postinstall: prisma generate
# 5) Adds runtime/dynamic to API route files that use prisma (best-effort)

$ErrorActionPreference = "Stop"

function Read-AllText([string]$path) {
  $lines = Get-Content -LiteralPath $path -ErrorAction SilentlyContinue
  if ($null -eq $lines) { return "" }
  return ($lines -join "`n")
}

function Write-AllText([string]$path, [string]$text) {
  Set-Content -LiteralPath $path -Value $text -Encoding UTF8
}

function Replace-InFile([string]$path, [string]$pattern, [string]$replacement) {
  $text = Read-AllText $path
  if ($text -match $pattern) {
    $newText = [regex]::Replace($text, $pattern, $replacement)
    if ($newText -ne $text) {
      Write-AllText $path $newText
      return $true
    }
  }
  return $false
}

function Ensure-Prepend([string]$path, [string]$snippet) {
  $text = Read-AllText $path
  if ($text.StartsWith($snippet)) { return $false }
  Write-AllText $path ($snippet + "`n" + $text)
  return $true
}

Write-Host "== Bulk fixing project ==" -ForegroundColor Cyan

# ---------- 1) Replace "@/app/lib/db" -> "@/app/lib/prisma" ----------
Write-Host "`n[1/5] Replacing imports '@/app/lib/db' -> '@/app/lib/prisma' ..." -ForegroundColor Yellow

$files = Get-ChildItem -Recurse -File -Include *.ts,*.tsx | Where-Object {
  $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\.next\\"
}

$changedCount = 0
foreach ($f in $files) {
  $did = Replace-InFile $f.FullName 'from\s+"@/app/lib/db"' 'from "@/app/lib/prisma"'
  if ($did) { $changedCount++ }
}
Write-Host "Changed files: $changedCount" -ForegroundColor Green

# ---------- 2) Remove prisma enum imports in app/lib/ai/*.ts ----------
Write-Host "`n[2/5] Fixing enum imports from '@prisma/client' in app/lib/ai/*.ts ..." -ForegroundColor Yellow

$aiFiles = Get-ChildItem -Recurse -File -Path "app\lib\ai" -Filter *.ts -ErrorAction SilentlyContinue
$aiChanged = 0

$enumHeader = @'
/**
 * NOTE:
 * In Prisma 7 / CI builds (e.g. Vercel), enum exports from "@prisma/client" may be unavailable at type-check time
 * if the client isn't generated yet. We define local union types matching schema.prisma.
 */
export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "VIEWING"
  | "OFFER"
  | "WON"
  | "LOST"
  | "ARCHIVED"
  | (string & {});

export type InteractionType =
  | "CALL"
  | "SMS"
  | "EMAIL"
  | "MEETING"
  | "NOTE"
  | "WHATSAPP"
  | (string & {});

'@

foreach ($f in $aiFiles) {
  $text = Read-AllText $f.FullName

  # If it imports LeadStatus/InteractionType from prisma client, remove that import and prepend local enums
  if ($text -match 'import\s+\{\s*[^}]*\b(LeadStatus|InteractionType)\b[^}]*\}\s+from\s+"@prisma/client";') {
    $newText = [regex]::Replace($text, 'import\s+\{\s*[^}]*\b(LeadStatus|InteractionType)\b[^}]*\}\s+from\s+"@prisma/client";\s*', '')

    # Prepend header only if LeadStatus/InteractionType are used and not already defined
    if ($newText -match '\bLeadStatus\b' -or $newText -match '\bInteractionType\b') {
      if ($newText -notmatch 'export\s+type\s+LeadStatus' -and $newText -notmatch 'export\s+type\s+InteractionType') {
        $newText = $enumHeader + "`n" + $newText
      }
    }

    if ($newText -ne $text) {
      Write-AllText $f.FullName $newText
      $aiChanged++
    }
  }
}
Write-Host "Changed AI files: $aiChanged" -ForegroundColor Green

# ---------- 3) Force a safe Prisma client wrapper (dynamic require) ----------
Write-Host "`n[3/5] Ensuring app/lib/prisma.ts is build-safe (dynamic require) ..." -ForegroundColor Yellow

$prismaPath = "app\lib\prisma.ts"
if (Test-Path $prismaPath) {
  $prismaContent = @'
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// Prisma 7.2 adapter expects { url }
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

// Avoid static import of PrismaClient to prevent build-time failures when client isn't generated yet.
function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@prisma/client") as any;

  const PrismaClientCtor = mod?.PrismaClient;
  if (!PrismaClientCtor) {
    throw new Error(
      "PrismaClient is not available. Ensure `prisma generate` ran (postinstall) and @prisma/client is installed."
    );
  }

  return new PrismaClientCtor({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
'@

  $existing = Read-AllText $prismaPath
  if ($existing -ne $prismaContent) {
    Write-AllText $prismaPath $prismaContent
    Write-Host "Replaced $prismaPath" -ForegroundColor Green
  } else {
    Write-Host "$prismaPath already OK" -ForegroundColor Green
  }
} else {
  Write-Host "WARNING: $prismaPath not found (skipping)" -ForegroundColor DarkYellow
}

# ---------- 4) Ensure package.json has postinstall: prisma generate ----------
Write-Host "`n[4/5] Ensuring package.json has postinstall: prisma generate ..." -ForegroundColor Yellow

$pkgPath = "package.json"
if (Test-Path $pkgPath) {
  $pkg = Read-AllText $pkgPath

  # Best-effort text insertion (no JSON parser to keep PS5.1 simple & safe)
  if ($pkg -notmatch '"postinstall"\s*:') {
    # Insert after "lint" script if present; otherwise after "scripts": {
    if ($pkg -match '"scripts"\s*:\s*\{') {
      $pkg = [regex]::Replace($pkg, '("scripts"\s*:\s*\{)', '$1' + "`n    `"postinstall`": `"prisma generate`",")
      Write-AllText $pkgPath $pkg
      Write-Host "Added postinstall to package.json" -ForegroundColor Green
    } else {
      Write-Host "WARNING: Could not find scripts block in package.json" -ForegroundColor DarkYellow
    }
  } else {
    Write-Host "package.json already has postinstall" -ForegroundColor Green
  }
} else {
  Write-Host "WARNING: package.json not found (skipping)" -ForegroundColor DarkYellow
}

# ---------- 5) Best-effort: mark API routes using prisma as nodejs + dynamic ----------
Write-Host "`n[5/5] Best-effort: marking API routes that import prisma as nodejs + dynamic ..." -ForegroundColor Yellow

$routeFiles = Get-ChildItem -Recurse -File -Path "app\api" -Filter route.ts -ErrorAction SilentlyContinue
$routeChanged = 0

foreach ($f in $routeFiles) {
  $text = Read-AllText $f.FullName
  if ($text -match 'from\s+"@/app/lib/prisma"' -or $text -match 'from\s+"@/app/lib/db"') {
    if ($text -notmatch 'export\s+const\s+runtime\s*=\s*"nodejs"') {
      # Insert after imports
      $text2 = $text
      $insert = "export const runtime = `"nodejs`";`nexport const dynamic = `"force-dynamic`";`n"
      # Find last import line
      $m = [regex]::Matches($text2, '^\s*import\s+.*?;\s*$', 'Multiline')
      if ($m.Count -gt 0) {
        $last = $m[$m.Count - 1]
        $idx = $last.Index + $last.Length
        $text2 = $text2.Insert($idx, "`n`n" + $insert)
      } else {
        $text2 = $insert + "`n" + $text2
      }
      if ($text2 -ne $text) {
        Write-AllText $f.FullName $text2
        $routeChanged++
      }
    }
  }
}
Write-Host "Changed route files: $routeChanged" -ForegroundColor Green

# ---------- Report remaining risky prisma enum imports ----------
Write-Host "`n== Scan: remaining '@prisma/client' imports (for review) ==" -ForegroundColor Cyan
$hits = git ls-files | Select-String -Pattern '\.ts$|\.tsx$' | ForEach-Object { $_.Line } | ForEach-Object {
  $_
} | ForEach-Object {
  $_
}

# Use git grep if available
try {
  git grep -n 'from "@prisma/client"' -- . | Write-Host
} catch {
  Write-Host "(git grep not available?)" -ForegroundColor DarkYellow
}

Write-Host "`nDone. Now run: npm run build" -ForegroundColor Cyan
