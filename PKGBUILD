# Maintainer: RangerDevv
# Arch Linux (AUR) package build file for RemmbrMe
#
# Usage:
#   makepkg -si
#
# To publish on the AUR, update 'url' and 'source' with your real git URL,
# then run:  makepkg --printsrcinfo > .SRCINFO
#
# Build strategy: builds the Vite frontend first, then compiles the Tauri
# binary with cargo directly — no deb/rpm/appimage tooling required.

pkgname=remmbrme
pkgver=1.0.0
pkgrel=1
pkgdesc="All-in-one productivity and memory app powered by Generative AI"
arch=('x86_64' 'aarch64')
url="https://github.com/RangerDevv/RemmbrMe"
license=('MIT')

depends=(
    'webkit2gtk-4.1'
    'gtk3'
    'glib2'
    'openssl'
)

makedepends=(
    'rust'
    'cargo'
    'nodejs'
    'npm'
    'pkg-config'
    'libsoup3'
    'webkit2gtk-4.1'
)

# ── Source ────────────────────────────────────────────────────────────────────
# For local builds (development):
#   Comment out the git source below and use:
#     source=("$pkgname::file://${PWD}")
#
# For AUR, replace the URL with your actual repository:
source=("$pkgname-$pkgver::git+${url}.git#tag=v${pkgver}")
sha256sums=('SKIP')

# ── Build ─────────────────────────────────────────────────────────────────────
build() {
    cd "$srcdir/$pkgname-$pkgver"

    # Install JS dependencies
    npm ci --prefer-offline

    # Build the Vite frontend (outputs to ./dist)
    npm run build

    # Build the Tauri/Rust binary with the embedded frontend.
    # We call cargo directly to avoid the tauri-bundler (which would require
    # dpkg, rpm-build, or appimagetool — none of which are needed on Arch).
    cd src-tauri
    cargo build --release
}

# ── Package ───────────────────────────────────────────────────────────────────
package() {
    cd "$srcdir/$pkgname-$pkgver"

    # Binary
    install -Dm755 "src-tauri/target/release/remmbrme" \
        "$pkgdir/usr/bin/remmbrme"

    # Desktop entry
    install -Dm644 "src-tauri/remmbrme.desktop" \
        "$pkgdir/usr/share/applications/remmbrme.desktop"

    # Icons
    install -Dm644 "src-tauri/icons/32x32.png" \
        "$pkgdir/usr/share/icons/hicolor/32x32/apps/remmbrme.png"
    install -Dm644 "src-tauri/icons/64x64.png" \
        "$pkgdir/usr/share/icons/hicolor/64x64/apps/remmbrme.png"
    install -Dm644 "src-tauri/icons/128x128.png" \
        "$pkgdir/usr/share/icons/hicolor/128x128/apps/remmbrme.png"
    install -Dm644 "src-tauri/icons/128x128@2x.png" \
        "$pkgdir/usr/share/icons/hicolor/256x256/apps/remmbrme.png"
    install -Dm644 "src-tauri/icons/icon.svg" \
        "$pkgdir/usr/share/icons/hicolor/scalable/apps/remmbrme.svg"

    # License
    install -Dm644 "LICENSE" \
        "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
