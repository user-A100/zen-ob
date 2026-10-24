$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$release = Join-Path $project 'release'
$version = (Get-Content -LiteralPath (Join-Path $project 'plugin/manifest.json') -Raw | ConvertFrom-Json).version
$base = "Zen-Mint-$version"
$stage = Join-Path $release $base
$plugin = Join-Path $stage 'plugins/zen-mint-sidebar'
$theme = Join-Path $stage 'themes/Zen Mint'
New-Item -ItemType Directory -Force -Path $plugin,$theme | Out-Null
foreach ($name in @('main.js','manifest.json','styles.css','LICENSE','MPL-2.0.txt')) {
  Copy-Item -LiteralPath (Join-Path $project "plugin/$name") -Destination $plugin
}
New-Item -ItemType Directory -Force -Path (Join-Path $plugin 'source') | Out-Null
foreach ($name in @('zen-theme-model.ts','zen-theme-picker.ts','zen-theme-picker.css','zen-theme-presets.ts')) {
  Copy-Item -LiteralPath (Join-Path $project "plugin/$name") -Destination (Join-Path $plugin 'source')
}
foreach ($name in @('theme.css','manifest.json')) {
  Copy-Item -LiteralPath (Join-Path $project "theme/$name") -Destination $theme
}
Copy-Item -LiteralPath (Join-Path $project 'LICENSE') -Destination $theme
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'artifacts'),(Join-Path $stage 'research') | Out-Null
Copy-Item -LiteralPath (Join-Path $project 'artifacts/zen-mint-v1.png'),(Join-Path $project 'artifacts/acceptance.json') -Destination (Join-Path $stage 'artifacts')
Copy-Item -LiteralPath (Join-Path $project 'artifacts/theme-picker-acceptance.json') -Destination (Join-Path $stage 'artifacts')
Copy-Item -LiteralPath (Join-Path $project 'artifacts/tabs-window-acceptance.json') -Destination (Join-Path $stage 'artifacts')
Copy-Item -LiteralPath (Join-Path $project 'artifacts/window-chrome-acceptance.json') -Destination (Join-Path $stage 'artifacts')
Get-ChildItem -LiteralPath (Join-Path $project 'artifacts') -Filter 'zen-mint-*.png' | Copy-Item -Destination (Join-Path $stage 'artifacts')
Copy-Item -LiteralPath (Join-Path $project 'research/BASE-EVALUATION.md') -Destination (Join-Path $stage 'research')
Copy-Item -LiteralPath (Join-Path $project 'research/ZEN-THEME-SPEC.md') -Destination (Join-Path $stage 'research')
Copy-Item -LiteralPath (Join-Path $project 'research/ZEN-AUTOHIDE-SPEC.md') -Destination (Join-Path $stage 'research')
Copy-Item -LiteralPath (Join-Path $project 'THIRD-PARTY-NOTICES.md') -Destination $plugin
foreach ($name in @('README.md','THIRD-PARTY-NOTICES.md','VALIDATION.md')) {
  Copy-Item -LiteralPath (Join-Path $project $name) -Destination $stage
}
Compress-Archive -LiteralPath (Join-Path $stage 'plugins'),(Join-Path $stage 'themes'),(Join-Path $stage 'artifacts'),(Join-Path $stage 'research'),(Join-Path $stage 'README.md'),(Join-Path $stage 'THIRD-PARTY-NOTICES.md'),(Join-Path $stage 'VALIDATION.md') -DestinationPath (Join-Path $release "$base.zip") -Force
Get-FileHash -LiteralPath (Join-Path $release "$base.zip") -Algorithm SHA256
