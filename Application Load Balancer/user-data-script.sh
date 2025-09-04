#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user-data script at $(date)"

# Update system
yum update -y
yum install -y nginx awscli

# Remove default nginx config that might conflict
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/nginx.conf.default

# Create directory with proper ownership
mkdir -p /var/www/html
chown nginx:nginx /var/www/html

# Download React app with correct S3 path
echo "Downloading React app from S3..."
cd /tmp

# Try the nested path first, then fallback to root level
aws s3 cp s3://react-app-deployment-1756658236-ubuntu/react-app-deployment-1756658236-ubuntu/react-app-build.tar.gz . --region us-east-1 || \
aws s3 cp s3://react-app-deployment-1756658236-ubuntu/react-app-build.tar.gz . --region us-east-1

# Verify download
if [ ! -f "react-app-build.tar.gz" ]; then
    echo "ERROR: Could not download react-app-build.tar.gz from S3"
    aws s3 ls s3://react-app-deployment-1756658236-ubuntu/ --recursive
    exit 1
fi

echo "Successfully downloaded react-app-build.tar.gz"

# Extract React app to nginx document root
echo "Extracting React app to /var/www/html..."
tar -xzf react-app-build.tar.gz -C /var/www/html/

# Set proper permissions
chown -R nginx:nginx /var/www/html
find /var/www/html -type d -exec chmod 755 {} \;
find /var/www/html -type f -exec chmod 644 {} \;

# Get instance metadata (fetch once and store in variables)
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)

# Create a static JSON file with instance info (this will work reliably)
cat > /var/www/html/instance-info.json << EOF
{
  "instance_id": "$INSTANCE_ID",
  "availability_zone": "$AZ",
  "timestamp": "$(date -Iseconds)",
  "status": "healthy",
  "server": "nginx"
}
EOF

# Create a simple text file for easy testing
echo "Instance: $INSTANCE_ID | AZ: $AZ | Time: $(date)" > /var/www/html/server-info.txt

# Verify extraction and list contents
echo "Verifying React app files after extraction:"
ls -la /var/www/html/
echo "Checking for index.html:"
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ index.html found"
    echo "File size: $(stat -c%s /var/www/html/index.html) bytes"
    echo "Permissions: $(stat -c%a /var/www/html/index.html)"
else
    echo "❌ index.html MISSING"
    echo "Available files:"
    find /var/www/html -name "*.html" -type f
fi

# Create nginx configuration with WORKING load balancer endpoints
cat > /etc/nginx/conf.d/react-app.conf << EOF
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    # Add instance identification headers to ALL responses
    add_header X-Instance-ID "$INSTANCE_ID" always;
    add_header X-AZ "$AZ" always;
    add_header X-Server "nginx-\$server_addr" always;

    # Main location for React app
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy from $INSTANCE_ID\n";
        add_header Content-Type text/plain;
    }

    # Static instance info (JSON file approach - more reliable)
    location /api/instance {
        access_log off;
        try_files /instance-info.json =404;
        add_header Content-Type application/json;
    }

    # Simple text endpoint for easy testing
    location /server-info {
        access_log off;
        try_files /server-info.txt =404;
        add_header Content-Type text/plain;
    }

    # Handle static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error page handling
    error_page 404 /index.html;
}
EOF

# Remove default nginx server block that might conflict
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default

# Ensure main nginx.conf is clean
cat > /etc/nginx/nginx.conf << 'NGINX_MAIN'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 4096;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Load modular configuration files
    include /etc/nginx/conf.d/*.conf;
}
NGINX_MAIN

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration test passed"
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    echo "✅ Nginx started successfully"

    # Test local endpoints
    echo "Testing local endpoints:"
    echo "Health check: $(curl -s http://localhost/health)"
    echo "Server info: $(curl -s http://localhost/server-info)"
    echo "API instance: $(curl -s http://localhost/api/instance)"

else
    echo "❌ Nginx configuration test failed"
    nginx -t
fi

# Final verification
echo "=== FINAL VERIFICATION ==="
echo "Nginx status: $(systemctl is-active nginx)"
echo "Files in /var/www/html:"
ls -la /var/www/html/
echo "Testing local nginx response:"
curl -s -o /dev/null -w "Local HTTP Status: %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "Local Health Check: %{http_code}\n" http://localhost/health

# Install stress tool for testing auto scaling
yum install -y stress

echo "User-data script completed successfully at $(date)"
echo "Instance $INSTANCE_ID is ready to serve traffic!"
