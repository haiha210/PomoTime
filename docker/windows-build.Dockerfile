# Cross-compile PomoTime for Windows (NSIS .exe) from Linux.
#
# Build:
#   docker build -f docker/windows-build.Dockerfile -t pomotime-winbuild .
# Run (via scripts/build-windows-docker.sh, which mounts the repo).

FROM rust:1-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    pkg-config \
    build-essential \
    clang \
    llvm \
    lld \
    nsis \
    libssl-dev \
    python3 \
    xz-utils \
 && rm -rf /var/lib/apt/lists/*

# Node 22 (matches CI).
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# Rust Windows MSVC target + cargo-xwin (downloads MSVC SDK on demand).
RUN rustup target add x86_64-pc-windows-msvc \
 && cargo install cargo-xwin --locked

# Tauri CLI for cross-bundle.
RUN cargo install tauri-cli --version "^2" --locked

ENV CC_x86_64_pc_windows_msvc=clang-cl \
    CXX_x86_64_pc_windows_msvc=clang-cl \
    AR_x86_64_pc_windows_msvc=llvm-lib \
    CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER=lld-link \
    XWIN_ACCEPT_LICENSE=1

WORKDIR /work
