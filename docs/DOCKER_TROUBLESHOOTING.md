# Docker Container Exit Troubleshooting Guide

## Common Causes of Container Exits During FFmpeg Operations

### 1. Memory Issues
**Symptoms:** Container exits during video processing with OOM (Out of Memory) errors
**Solutions:**
- Increased memory limits in docker-compose.yml (4GB limit, 1GB reservation)
- Added NODE_OPTIONS=--max-old-space-size=4096 for Node.js memory management
- Enhanced error handling to detect memory-related failures

### 2. Process Signal Handling
**Symptoms:** Container stops unexpectedly during long-running operations
**Solutions:**
- Added proper signal handling in startup script (`set -e`)
- Enhanced ffmpeg process spawning with better error handling
- Added process monitoring and cleanup on container shutdown

### 3. Resource Constraints
**Symptoms:** Container killed by Docker daemon due to resource limits
**Solutions:**
- Configured memory limits and reservations
- Added timeout handling for long-running processes
- Implemented retry logic for failed operations

### 4. FFmpeg Process Management
**Symptoms:** FFmpeg processes hang or exit unexpectedly
**Solutions:**
- Enhanced process spawning with proper stdio handling
- Added comprehensive error logging and stderr/stdout capture
- Implemented timeout mechanisms (30min for conversion, 10min for clips, 5min for thumbnails)
- Added retry logic with exponential backoff

## Diagnostic Commands

### Check Container Status
```bash
# Check if container is running
docker ps -a | grep clipshare

# Check container logs
docker logs clipshare-web --tail 100

# Check container resource usage
docker stats clipshare-web --no-stream
```

### Monitor FFmpeg Processes
```bash
# Check active processes inside container
docker exec clipshare-web ps aux | grep ffmpeg

# Monitor process activity
docker exec clipshare-web top -p $(pgrep ffmpeg)
```

### Health Check
```bash
# Check application health
curl -f http://localhost:3000/api/health

# Check Docker health status
docker inspect clipshare-web | grep -A 10 Health
```

### Memory Analysis
```bash
# Check memory usage
docker exec clipshare-web free -h

# Check Node.js memory usage
docker exec clipshare-web node -e "console.log(process.memoryUsage())"
```

## Configuration Changes Made

### Docker Compose Updates
- Added memory limits: 4GB limit, 1GB reservation
- Added NODE_OPTIONS for increased Node.js memory
- Updated health check to use `/api/health` endpoint
- Added curl to Dockerfile for health checks

### Process Management Improvements
- Enhanced error handling in all ffmpeg operations
- Added timeout mechanisms for all long-running processes
- Implemented retry logic with configurable attempts
- Added comprehensive logging for debugging

### Health Monitoring
- Created ProcessMonitor class for tracking active processes
- Added health check API endpoint
- Implemented graceful shutdown handling
- Added process statistics and monitoring

## Prevention Strategies

### 1. Resource Monitoring
- Monitor container memory usage during operations
- Set appropriate memory limits based on video file sizes
- Use health checks to detect issues early

### 2. Process Management
- Implement proper cleanup of ffmpeg processes
- Use timeouts to prevent hanging operations
- Add retry logic for transient failures

### 3. Error Handling
- Capture and log all ffmpeg output
- Implement graceful error recovery
- Provide detailed error messages for debugging

### 4. Container Configuration
- Use appropriate restart policies
- Configure proper resource limits
- Implement health checks for early detection

## Testing the Fixes

### 1. Test Video Processing
```bash
# Start container with new configuration
docker-compose up -d

# Monitor logs during processing
docker logs -f clipshare-web

# Check health endpoint
curl http://localhost:3000/api/health
```

### 2. Test Memory Handling
```bash
# Process a large video file
# Monitor memory usage
docker stats clipshare-web

# Check for OOM errors
docker logs clipshare-web | grep -i "killed\|oom\|memory"
```

### 3. Test Process Cleanup
```bash
# Start a processing job
# Stop the container gracefully
docker-compose stop

# Check that processes are cleaned up
docker exec clipshare-web ps aux | grep ffmpeg
```

## Emergency Recovery

### If Container Keeps Exiting
1. Check logs for specific error messages
2. Increase memory limits if needed
3. Check host system resources
4. Verify Docker daemon configuration

### If FFmpeg Processes Hang
1. Check for stuck processes: `docker exec clipshare-web ps aux | grep ffmpeg`
2. Kill stuck processes: `docker exec clipshare-web pkill ffmpeg`
3. Restart container: `docker-compose restart`

### If Memory Issues Persist
1. Increase memory limits in docker-compose.yml
2. Reduce video quality settings
3. Process smaller video files
4. Add swap space to host system

## Monitoring and Alerting

### Set up monitoring for:
- Container memory usage
- FFmpeg process count
- Processing job failures
- Health check failures

### Recommended alerts:
- Container restarts > 3 in 1 hour
- Memory usage > 80% of limit
- FFmpeg processes > 5 active
- Health check failures > 2 consecutive

This comprehensive approach should resolve most Docker container exit issues during ffmpeg operations.
