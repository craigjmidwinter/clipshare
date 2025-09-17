# Clipshare Troubleshooting Guide

Comprehensive troubleshooting guide for common issues, error messages, and debugging procedures in Clipshare.

## 📖 Table of Contents

1. [Getting Help](#getting-help)
2. [General Troubleshooting Steps](#general-troubleshooting-steps)
3. [Installation and Setup Issues](#installation-and-setup-issues)
4. [Authentication Problems](#authentication-problems)
5. [Plex Integration Issues](#plex-integration-issues)
6. [Video Playback Problems](#video-playback-problems)
7. [Workspace and Collaboration Issues](#workspace-and-collaboration-issues)
8. [Performance Problems](#performance-problems)
9. [Download and Export Issues](#download-and-export-issues)
10. [OBS Integration Problems](#obs-integration-problems)
11. [Database Issues](#database-issues)
12. [Network and Connectivity](#network-and-connectivity)
13. [Deployment and Production Issues](#deployment-and-production-issues)
14. [Error Reference](#error-reference)
15. [Debugging Tools](#debugging-tools)

## Getting Help

### Before You Start

**Information to Gather:**
- Operating system and version
- Browser type and version
- Clipshare version/build
- Error messages (exact text)
- Steps to reproduce the issue
- Screenshots or screen recordings if applicable

**Quick Checks:**
1. **Refresh the page** - Many issues are resolved with a simple refresh
2. **Clear browser cache** - Old cached data can cause problems
3. **Check internet connection** - Ensure stable connectivity
4. **Verify Plex server status** - Make sure your Plex server is running
5. **Try a different browser** - Rule out browser-specific issues

### Support Channels

**Self-Service:**
- This troubleshooting guide
- [FAQ](./FAQ.md) for common questions
- [User Guide](./USER_GUIDE.md) for usage instructions
- [Development Guide](./DEVELOPMENT.md) for technical issues

**Community Support:**
- GitHub Issues for bug reports
- Internal team channels for organizational users
- Documentation feedback via pull requests

## General Troubleshooting Steps

### Step 1: Identify the Problem Category

**User Interface Issues:**
- Page won't load
- Buttons don't work
- Layout is broken
- Features missing

**Functionality Issues:**
- Authentication fails
- Video won't play
- Bookmarks not saving
- Downloads not working

**Performance Issues:**
- Slow loading
- Lag or delays
- High CPU/memory usage
- Network timeouts

**Integration Issues:**
- Plex connection problems
- OBS export failures
- External service errors

### Step 2: Check System Status

```bash
# Check application health
curl http://localhost:3000/api/health

# Check system resources
top
df -h
free -m

# Check network connectivity
ping google.com
ping your-plex-server-ip
```

### Step 3: Review Logs

**Browser Console Logs:**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy any error messages for support

**Application Logs:**
```bash
# For PM2 deployments
pm2 logs clipshare

# For systemd deployments  
sudo journalctl -u clipshare -f

# For Docker deployments
docker logs clipshare-container

# Check specific log files
tail -f /var/log/clipshare/application.log
tail -f /var/log/clipshare/error.log
```

## Installation and Setup Issues

### Node.js and npm Problems

**❌ "Node.js version not supported"**

```bash
# Check current version
node --version
npm --version

# Install correct version (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
```

**❌ "npm install fails with permission errors"**

```bash
# Fix npm permissions (don't use sudo)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use a Node version manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**❌ "Package installation takes too long or fails"**

```bash
# Use faster registry
npm config set registry https://registry.npmjs.org/

# Clear npm cache
npm cache clean --force

# Install with specific timeout
npm install --timeout=300000

# Alternative: Use yarn
npm install -g yarn
yarn install
```

### Database Setup Issues

**❌ "Prisma client not initialized"**

```bash
# Generate Prisma client
cd web
npx prisma generate

# Push database schema
npx prisma db push

# Restart application
npm run dev
```

**❌ "Database file permission denied"**

```bash
# Check database directory permissions
ls -la /var/lib/clipshare/
sudo chown -R clipshare:clipshare /var/lib/clipshare/
sudo chmod 755 /var/lib/clipshare/
sudo chmod 644 /var/lib/clipshare/database.db
```

**❌ "Database schema out of date"**

```bash
# Reset database (WARNING: Deletes all data)
rm /var/lib/clipshare/database.db
npx prisma db push

# Or migrate existing database
npx prisma db push --accept-data-loss
```

### Environment Configuration Issues

**❌ "Environment variables not loaded"**

```bash
# Check environment file exists
ls -la .env.local .env.production

# Validate required variables
echo $NEXTAUTH_SECRET
echo $DATABASE_URL
echo $PLEX_CLIENT_ID

# Load environment manually
export $(cat .env.local | xargs)
```

**❌ "NEXTAUTH_SECRET not set"**

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
echo "NEXTAUTH_SECRET=your-generated-secret" >> .env.local
```

## Authentication Problems

### Plex Authentication Issues

**❌ "Cannot sign in with Plex"**

**Check Plex.tv Status:**
```bash
# Test Plex.tv connectivity
curl -I https://plex.tv

# Check if Plex authentication server is accessible
curl -I https://app.plex.tv/auth
```

**Verify Configuration:**
```bash
# Check Plex client configuration
echo $PLEX_CLIENT_ID
echo $PLEX_SERVER_URL

# Test Plex server connectivity
curl -I $PLEX_SERVER_URL
```

**Clear Authentication State:**
1. Clear browser cookies for your Clipshare domain
2. Sign out of Plex.tv in the same browser
3. Try authentication flow again

**❌ "Plex OAuth callback fails"**

**Check Callback URL:**
- Verify `NEXTAUTH_URL` matches your actual domain
- Ensure URL is accessible from Plex.tv
- Check firewall settings allow inbound connections

**Browser Issues:**
- Disable browser extensions that might block popups
- Try private/incognito browsing mode
- Use a different browser for testing

### Session and Token Issues

**❌ "Session expired" or "Unauthorized" errors**

```bash
# Check session configuration in auth.ts
grep -n "maxAge" lib/auth.ts

# Clear application data
# In browser: Settings > Privacy > Clear browsing data

# Restart application to reset sessions
pm2 restart clipshare
# or
sudo systemctl restart clipshare
```

**❌ "Invalid session token"**

```javascript
// Check token validation in browser console
localStorage.getItem('next-auth.session-token')

// Clear localStorage
localStorage.clear()
sessionStorage.clear()
```

## Plex Integration Issues

### Connection Problems

**❌ "Cannot connect to Plex server"**

**Network Connectivity:**
```bash
# Test basic connectivity
ping plex-server-ip
telnet plex-server-ip 32400

# Test HTTP connectivity
curl -I http://plex-server-ip:32400

# Check if Plex server is responding
curl "http://plex-server-ip:32400/identity"
```

**Server Configuration:**
1. **Verify Plex server is running**
2. **Check network settings** in Plex
3. **Ensure remote access is enabled** (if needed)
4. **Check firewall settings** on Plex server

**Token Issues:**
```bash
# Test with Plex token
curl "http://plex-server-ip:32400/library/sections?X-Plex-Token=your-token"

# Get fresh token from Plex Web App:
# Settings > Network > Show Advanced > Plex Token
```

**❌ "Plex server token invalid"**

**Generate New Token:**
1. Open Plex Web App
2. Go to Settings → Network
3. Click "Show Advanced"
4. Copy the "Plex Token" value
5. Update your environment configuration

**Verify Token Format:**
- Should be 20+ characters
- Contains letters, numbers, hyphens
- No spaces or special characters

### Content Access Issues

**❌ "No content found in Plex libraries"**

**Library Permissions:**
```bash
# Check library access with token
curl "http://plex-server:32400/library/sections?X-Plex-Token=token"

# Check specific library content
curl "http://plex-server:32400/library/sections/1/all?X-Plex-Token=token"
```

**Content Filtering:**
- Verify content type filters in Clipshare
- Check Plex library is shared with your account
- Ensure content has finished processing in Plex

**❌ "Some Plex content is missing"**

**Plex Server Issues:**
1. **Refresh Plex libraries** in Plex Web App
2. **Check content permissions** for your Plex user
3. **Verify metadata is complete** for missing content
4. **Check for content type compatibility** (videos only)

## Video Playback Problems

### Player Won't Load

**❌ "Video player shows black screen"**

**Browser Compatibility:**
```javascript
// Check browser support in console
console.log('HLS support:', Hls.isSupported())
console.log('MSE support:', MediaSource.isSupported)
```

**Network Issues:**
```bash
# Test video stream URL
curl -I "your-plex-server/video/:/transcode/universal/start.m3u8?session=test"

# Check network speed
speedtest-cli
```

**Content Issues:**
1. **Try different quality settings** in player
2. **Check if content plays in Plex Web App**
3. **Verify content format compatibility**

**❌ "Video buffering constantly"**

**Network Optimization:**
```bash
# Check bandwidth to Plex server
iperf3 -c plex-server-ip

# Check for packet loss
ping -c 100 plex-server-ip | grep loss
```

**Quality Settings:**
1. **Lower video quality** in player settings
2. **Check Plex transcoding** settings
3. **Verify Plex server performance**

### Audio/Video Sync Issues

**❌ "Audio and video out of sync"**

**Browser Issues:**
- Try different browser
- Clear browser cache
- Disable browser extensions
- Check browser hardware acceleration settings

**Content Issues:**
1. **Check source content** plays correctly in Plex
2. **Try different quality setting**
3. **Check for corrupted source files**

## Workspace and Collaboration Issues

### Workspace Creation Problems

**❌ "Cannot create workspace"**

**Permission Issues:**
```bash
# Check user permissions in database
sqlite3 database.db "SELECT * FROM users WHERE id='user-id';"

# Check Plex content accessibility
curl "plex-server/library/metadata/content-key?X-Plex-Token=token"
```

**Content Selection Issues:**
1. **Verify content exists** in Plex
2. **Check content type** (episodes/movies supported)
3. **Ensure content is accessible** by your user

**❌ "Workspace processing stuck"**

**Check Processing Status:**
```bash
# Check processing jobs
sqlite3 database.db "SELECT * FROM processingJobs WHERE status='processing';"

# Check application logs for processing errors
grep -i "processing" /var/log/clipshare/application.log
```

**Manual Processing Reset:**
```sql
-- Reset stuck processing job
UPDATE processingJobs SET status='queued', progressPercent=0 WHERE id='job-id';

-- Or delete and recreate
DELETE FROM processingJobs WHERE workspaceId='workspace-id';
```

### Real-time Collaboration Issues

**❌ "Changes not syncing between users"**

**WebSocket Connection:**
```javascript
// Check WebSocket connection in browser console
console.log('WebSocket state:', websocket.readyState)
// 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
```

**Network Configuration:**
```nginx
# Ensure nginx WebSocket configuration
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

**Firewall Issues:**
```bash
# Check if WebSocket ports are open
sudo netstat -tlnp | grep :3000

# Test WebSocket connection
wscat -c ws://localhost:3000/ws
```

**❌ "Bookmarks not saving"**

**Database Issues:**
```bash
# Check database connectivity
sqlite3 database.db "SELECT 1"

# Check bookmark table
sqlite3 database.db "SELECT COUNT(*) FROM bookmarks;"

# Check for database locks
lsof database.db
```

**Permission Issues:**
```sql
-- Check workspace membership
SELECT * FROM memberships WHERE workspaceId='ws-id' AND userId='user-id';

-- Check workspace producer
SELECT * FROM workspaces WHERE id='ws-id';
```

## Performance Problems

### Slow Loading

**❌ "Application loads slowly"**

**Database Performance:**
```bash
# Check database size
ls -lh database.db

# Run database optimization
sqlite3 database.db "PRAGMA optimize; VACUUM; ANALYZE;"

# Check for large tables
sqlite3 database.db "SELECT name, COUNT(*) FROM sqlite_master s, pragma_table_info(s.name) GROUP BY name;"
```

**Network Performance:**
```bash
# Check network latency to Plex server
ping -c 10 plex-server-ip

# Check DNS resolution time
dig @8.8.8.8 your-domain.com

# Test bandwidth
iperf3 -c plex-server-ip -t 30
```

**Server Resources:**
```bash
# Check CPU usage
top -p $(pgrep -f clipshare)

# Check memory usage
ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem

# Check disk I/O
iostat -x 1 5
```

### High Resource Usage

**❌ "High CPU or memory usage"**

**Identify Resource Hogs:**
```bash
# Find processes using most CPU
ps aux --sort=-%cpu | head

# Find processes using most memory
ps aux --sort=-%mem | head

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node server.js
```

**Video Processing Issues:**
```bash
# Check for stuck video processing jobs
ps aux | grep ffmpeg

# Check temporary file cleanup
ls -la /tmp/clipshare/
find /tmp -name "*clipshare*" -mtime +1
```

## Download and Export Issues

### Clip Download Problems

**❌ "Clip downloads fail"**

**Processing Requirements:**
```sql
-- Check workspace processing status
SELECT processingStatus, processingProgress FROM workspaces WHERE id='ws-id';

-- Check for failed processing jobs
SELECT * FROM processingJobs WHERE status='error' AND workspaceId='ws-id';
```

**File System Issues:**
```bash
# Check clips directory
ls -la /var/lib/clipshare/clips/

# Check disk space
df -h /var/lib/clipshare/

# Check directory permissions
ls -ld /var/lib/clipshare/clips/
sudo chown -R clipshare:clipshare /var/lib/clipshare/
```

**Video Processing Errors:**
```bash
# Check FFmpeg availability
ffmpeg -version

# Test video processing manually
ffmpeg -i input.mp4 -ss 60 -t 15 -c copy test_clip.mp4

# Check processing logs
grep -i "ffmpeg\|processing" /var/log/clipshare/application.log
```

**❌ "Export generation takes too long"**

**Performance Optimization:**
```bash
# Check concurrent job limits
grep -i "concurrency" .env.production

# Monitor processing jobs
watch "sqlite3 database.db 'SELECT type, status, progressPercent FROM processingJobs;'"

# Check server resources during processing
iostat -x 1
```

### OBS Package Export Issues

**❌ "OBS package generation fails"**

**Dependency Issues:**
```bash
# Check Python availability (for OBS scripts)
python3 --version

# Check required modules
python3 -c "import json, os, zipfile"

# Check file permissions
ls -la /var/lib/clipshare/exports/
```

**Content Issues:**
```sql
-- Check bookmark count
SELECT COUNT(*) FROM bookmarks WHERE workspaceId='ws-id';

-- Check bookmark data integrity
SELECT id, label, startMs, endMs FROM bookmarks WHERE workspaceId='ws-id' AND (startMs IS NULL OR endMs IS NULL);
```

## OBS Integration Problems

### Setup Issues

**❌ "OBS setup script fails"**

**OBS Version Compatibility:**
```bash
# Check OBS Studio version
obs --version
# or check in OBS: Help > About

# Minimum required: 28.0+
```

**Script Execution Issues:**
```bash
# Check script permissions
ls -la setup_obs.sh
chmod +x setup_obs.sh

# Run with verbose output
bash -x setup_obs.sh

# Check Python dependencies for script
python3 -c "import websocket, json, requests"
```

**File Path Issues:**
```bash
# Check OBS package contents
unzip -l workspace_package.zip

# Verify clip file paths
find . -name "*.mp4" | head -5

# Check for path length limits (Windows)
# Max path length: 260 characters
```

### Live Production Issues

**❌ "Hotkeys not working in OBS"**

**OBS Configuration:**
1. **Check hotkey assignments** in OBS Settings > Hotkeys
2. **Verify no conflicts** with system hotkeys
3. **Test hotkeys** outside of streaming
4. **Check source visibility** for hotkey targets

**Scene Collection Issues:**
```json
// Check OBS scene collection file
{
  "scenes": [
    {
      "name": "VTR_Main",
      "sources": [
        {
          "name": "Clip_1",
          "type": "ffmpeg_source",
          "settings": {
            "local_file": "./clips/clip1.mp4"
          }
        }
      ]
    }
  ]
}
```

**❌ "Web interface not accessible"**

**Network Configuration:**
```bash
# Check if web interface port is open
netstat -tlnp | grep :8080

# Test web interface connectivity
curl -I http://localhost:8080

# Check firewall settings
sudo ufw status | grep 8080
```

**Browser Issues:**
1. **Try different browser**
2. **Check JavaScript console** for errors
3. **Verify localhost access** is allowed
4. **Clear browser cache**

## Database Issues

### Corruption and Recovery

**❌ "Database file corrupted"**

**Integrity Check:**
```bash
# Check database integrity
sqlite3 database.db "PRAGMA integrity_check;"

# Quick check
sqlite3 database.db "PRAGMA quick_check;"
```

**Recovery Procedures:**
```bash
# Backup corrupted database
cp database.db database.db.corrupted

# Attempt recovery
sqlite3 database.db.corrupted ".recover" | sqlite3 database.db.recovered

# If recovery fails, restore from backup
cp /var/backups/clipshare/latest_backup.db database.db
```

### Performance Issues

**❌ "Database queries are slow"**

**Optimization:**
```sql
-- Analyze database statistics
ANALYZE;

-- Rebuild indexes
REINDEX;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Optimize cache size
PRAGMA cache_size = 10000;
```

**Query Analysis:**
```sql
-- Check slow queries
EXPLAIN QUERY PLAN SELECT * FROM bookmarks WHERE workspaceId = 'ws-id';

-- Check index usage
.indexes bookmarks
```

## Network and Connectivity

### Firewall and Port Issues

**❌ "Cannot access Clipshare from network"**

**Port Configuration:**
```bash
# Check if application is listening
sudo netstat -tlnp | grep :3000

# Check firewall rules
sudo ufw status verbose

# Test port accessibility
telnet server-ip 3000
nc -zv server-ip 3000
```

**Proxy Configuration:**
```nginx
# Check nginx configuration
nginx -t

# Check proxy upstream
curl -I http://127.0.0.1:3000/api/health

# Check access logs
tail -f /var/log/nginx/access.log
```

### SSL/TLS Issues

**❌ "SSL certificate errors"**

**Certificate Validation:**
```bash
# Check certificate status
openssl x509 -in /etc/letsencrypt/live/domain/fullchain.pem -text -noout

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/domain/fullchain.pem -dates -noout

# Test SSL connection
openssl s_client -connect domain.com:443 -servername domain.com
```

**Certificate Renewal:**
```bash
# Manual renewal
sudo certbot renew --dry-run

# Check auto-renewal
sudo systemctl status certbot.timer
```

## Deployment and Production Issues

### Container Issues

**❌ "Docker container won't start"**

**Container Diagnostics:**
```bash
# Check container status
docker ps -a

# Check container logs
docker logs container-name

# Check resource usage
docker stats container-name

# Inspect container configuration
docker inspect container-name
```

**Common Fixes:**
```bash
# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check volume mounts
docker volume ls
docker volume inspect volume-name
```

### Service Management Issues

**❌ "Application won't start with systemd"**

**Service Diagnostics:**
```bash
# Check service status
sudo systemctl status clipshare

# View service logs
sudo journalctl -u clipshare -f

# Check service configuration
sudo systemctl cat clipshare

# Reload service configuration
sudo systemctl daemon-reload
sudo systemctl restart clipshare
```

**Permission Issues:**
```bash
# Check service user
id clipshare

# Check file permissions
ls -la /opt/clipshare/
sudo chown -R clipshare:clipshare /opt/clipshare/
```

## Error Reference

### Common Error Codes

**AUTHENTICATION_REQUIRED**
- **Cause**: No valid session found
- **Solution**: Sign in again, check session configuration

**PLEX_CONNECTION_ERROR**
- **Cause**: Cannot reach Plex server
- **Solution**: Check server URL, token, network connectivity

**WORKSPACE_NOT_FOUND**
- **Cause**: Workspace ID invalid or deleted
- **Solution**: Verify workspace exists, check permissions

**PROCESSING_FAILED**
- **Cause**: Video processing job failed
- **Solution**: Check source content, retry processing

**RATE_LIMIT_EXCEEDED**
- **Cause**: Too many requests in time window
- **Solution**: Wait and retry, check rate limit configuration

### HTTP Status Codes

**400 Bad Request**
- Invalid request data
- Check request parameters and format

**401 Unauthorized**
- Authentication required
- Sign in or refresh session

**403 Forbidden**
- Insufficient permissions
- Check user role and workspace membership

**404 Not Found**
- Resource doesn't exist
- Verify resource ID and access permissions

**500 Internal Server Error**
- Server-side error
- Check application logs for details

**503 Service Unavailable**
- Service temporarily unavailable
- Check server status and resources

## Debugging Tools

### Browser Developer Tools

**Console Commands:**
```javascript
// Check application state
console.log('Session:', window.sessionData)
console.log('Current workspace:', window.currentWorkspace)

// Test API endpoints
fetch('/api/health').then(r => r.json()).then(console.log)

// Monitor WebSocket
window.ws = new WebSocket('ws://localhost:3000/ws')
window.ws.onmessage = (event) => console.log('WS:', event.data)
```

**Network Tab:**
- Monitor API requests and responses
- Check for failed requests (red entries)
- Verify request/response headers
- Check request timing and performance

### Command Line Tools

**Network Debugging:**
```bash
# Test connectivity
ping -c 5 target-host
traceroute target-host
mtr target-host

# Test ports
nmap -p 3000 target-host
nc -zv target-host 3000

# Monitor network traffic
sudo tcpdump -i any port 3000
```

**Performance Monitoring:**
```bash
# System resources
htop
iotop
nethogs

# Application performance
strace -p $(pgrep -f clipshare)
perf top -p $(pgrep -f clipshare)
```

### Application-Specific Debug

**Enable Debug Mode:**
```bash
# Environment variables
export DEBUG=clipshare:*
export LOG_LEVEL=debug
export NODE_ENV=development

# Start with debugging
npm run dev
```

**Database Debugging:**
```bash
# Enable SQLite query logging
export DEBUG=prisma:query

# Manual database inspection
sqlite3 database.db
.tables
.schema bookmarks
SELECT * FROM users LIMIT 5;
```

**Plex API Debugging:**
```bash
# Test Plex API directly
curl -v "http://plex-server:32400/library/sections?X-Plex-Token=token"

# Check Plex server logs
tail -f /var/lib/plexmediaserver/Library/Application\ Support/Plex\ Media\ Server/Logs/Plex\ Media\ Server.log
```

---

**Need More Help?**

If you can't find a solution here:

1. **Check the [FAQ](./FAQ.md)** for common questions
2. **Review [User Guide](./USER_GUIDE.md)** for usage instructions
3. **Consult [Development Guide](./DEVELOPMENT.md)** for technical details
4. **Create a GitHub issue** with detailed error information
5. **Contact your system administrator** for deployment issues

Remember to include:
- Exact error messages
- Steps to reproduce
- System information
- Log excerpts
- Screenshots when helpful