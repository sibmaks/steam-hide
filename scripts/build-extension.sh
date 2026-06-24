#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/dist"
package_dir="$dist/steam-hider"
zip_path="$dist/steam-hider-chrome-vivaldi.zip"

npm run build:js

rm -rf "$package_dir"
rm -f "$zip_path"

mkdir -p "$package_dir/icons"

cp "$root/manifest.json" "$package_dir/"
cp "$root/build/steam.hide.js" "$package_dir/"
cp "$root/build/content.js" "$package_dir/"
cp "$root/build/options.js" "$package_dir/"
cp "$root/steam.hide.css" "$package_dir/"
cp "$root/options.html" "$package_dir/"
cp "$root/options.css" "$package_dir/"
cp "$root/LICENSE" "$package_dir/"
cp "$root"/icons/*.png "$package_dir/icons/"
cp "$root"/icons/*.png "$package_dir/"

(
    cd "$package_dir"
    if command -v zip >/dev/null 2>&1; then
        zip -r "$zip_path" .
    else
        python3 -m zipfile -c "$zip_path" .
    fi
)

echo "Built $zip_path"
