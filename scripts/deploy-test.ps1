$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$vault = Join-Path $project 'test-vault'
$plugin = Join-Path $vault '.obsidian/plugins/zen-mint-sidebar'
$theme = Join-Path $vault '.obsidian/themes/Zen Mint'
New-Item -ItemType Directory -Force -Path $plugin,$theme | Out-Null
foreach ($file in @('main.js','manifest.json','styles.css','LICENSE','MPL-2.0.txt')) {
  Copy-Item -LiteralPath (Join-Path $project "plugin/$file") -Destination $plugin
}
foreach ($file in @('theme.css','manifest.json')) {
  Copy-Item -LiteralPath (Join-Path $project "theme/$file") -Destination $theme
}
Write-Output 'Deployed only to Zen Mint/test-vault.'
