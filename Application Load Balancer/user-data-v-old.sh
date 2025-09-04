#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user-data script at $(date)"

yum update -y
yum install -y nginx awscli

# Create directory with nginx user ownership from start
mkdir -p /var/www/html
chown nginx:nginx /var/www/html

# Download React app
echo "Downloading React app from S3..."
cd /tmp
aws s3 cp s3://react-app-deployment-1756658236-ubuntu/react-app-build.tar.gz . --region us-east-1

# Extract React app into nginx root, removing any top-level folder
echo "Extracting React app to /var/www/html..."
tar -xzf react-app-build.tar.gz -C /var/www/html --strip-components=1
chown -R nginx:nginx /var/www/html
chmod -R 755 /var/www/html

# Optional: Fix SELinux context if enabled
if command -v getenforce &>/dev/null && [ "$(getenforce)" != "Disabled" ]; then
    echo "SELinux detected, applying proper context..."
    chcon -Rt httpd_sys_content_t /var/www/html
fi

# Verify extraction
echo "Verifying React app files:"
ls -la /var/www/html/
test -f /var/www/html/index.html && echo "index.html found" || echo "index.html MISSING"

# Simple nginx config using default document root
cat > /etc/nginx/conf.d/default.conf << 'NGINX_CONF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

# Test and start nginx
nginx -t && systemctl start nginx && systemctl enable nginx

# Install stress tool for testing auto scaling
yum install -y stress

# Setup CloudWatch monitoring
yum install -y amazon-cloudwatch-agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_CONFIG'
{
    "metrics": {
        "namespace": "ReactApp/EC2",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    }
}
CW_CONFIG

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Final verification
echo "Final check - files in /var/www/html:"
ls -la /var/www/html/
echo "User-data completed at $(date)"
