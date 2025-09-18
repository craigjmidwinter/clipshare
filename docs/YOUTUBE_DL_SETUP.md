# YouTube-dl Setup Guide

This guide explains how to set up `yt-dlp` for YouTube video processing in different environments.

## Environment Variables

You can set the `YT_DLP_PATH` environment variable to specify the exact path to the `yt-dlp` binary:

```bash
export YT_DLP_PATH=/path/to/yt-dlp
```

If not set, the system will automatically detect `yt-dlp` in the following order:
1. Check if `yt-dlp` is available in the system PATH
2. Check common installation locations:
   - `/usr/local/bin/yt-dlp`
   - `/usr/bin/yt-dlp`
   - `/opt/homebrew/bin/yt-dlp` (macOS Homebrew)
   - `/snap/bin/yt-dlp` (Ubuntu Snap)

## Installation Methods

### macOS (Homebrew)
```bash
brew install yt-dlp
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install yt-dlp
```

### Docker
Add to your Dockerfile:
```dockerfile
# Install yt-dlp
RUN apt-get update && apt-get install -y yt-dlp

# Or if using Alpine
RUN apk add --no-cache yt-dlp
```

### Manual Installation
```bash
# Download the latest binary
sudo wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

## Fallback Behavior

The system uses a two-tier approach for YouTube metadata:

1. **Primary**: YouTube oEmbed API (no binary required, very reliable)
2. **Fallback**: youtube-dl-exec with yt-dlp binary (for richer metadata)

If `yt-dlp` is not available, the system will still work using the oEmbed API, but with limited metadata (title and thumbnail only).

## Troubleshooting

### Binary Not Found Error
If you see `ENOENT` errors, ensure `yt-dlp` is installed and accessible:

```bash
# Check if yt-dlp is installed
which yt-dlp

# Test if it works
yt-dlp --version
```

### Docker Container Issues
Make sure `yt-dlp` is installed in your Docker image and the binary is accessible from the application's PATH.

### Permission Issues
Ensure the `yt-dlp` binary has execute permissions:
```bash
chmod +x /path/to/yt-dlp
```
