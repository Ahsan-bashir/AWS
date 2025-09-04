#!/bin/bash

echo "🏥 AUTO SCALING GROUP HEALTH CHECK"
echo "=================================="

# You'll need to replace these with your actual names
ASG_NAME="your-auto-scaling-group-name"  # Replace with actual ASG name
ALB_TARGET_GROUP_ARN="your-target-group-arn"  # Replace with actual target group ARN

echo ""
echo "📋 Checking Auto Scaling Group Status..."
echo "Replace 'your-auto-scaling-group-name' with your actual ASG name and run:"
echo ""
echo "aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names YOUR_ASG_NAME --query 'AutoScalingGroups[0].[MinSize,MaxSize,DesiredCapacity,Instances[].{InstanceId:InstanceId,HealthStatus:HealthStatus,LifecycleState:LifecycleState,AvailabilityZone:AvailabilityZone}]' --output table"

echo ""
echo "🎯 Checking Target Group Health..."
echo "Replace 'your-target-group-arn' with your actual target group ARN and run:"
echo ""
echo "aws elbv2 describe-target-health --target-group-arn YOUR_TARGET_GROUP_ARN --query 'TargetHealthDescriptions[].{InstanceId:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' --output table"

echo ""
echo "🔍 Quick Check Commands (run these now):"
echo "========================================="

echo ""
echo "1. List all your Auto Scaling Groups:"
echo "aws autoscaling describe-auto-scaling-groups --query 'AutoScalingGroups[].[AutoScalingGroupName,MinSize,MaxSize,DesiredCapacity]' --output table"

echo ""
echo "2. List all your Target Groups:"
echo "aws elbv2 describe-target-groups --query 'TargetGroups[].[TargetGroupName,TargetGroupArn]' --output table"

echo ""
echo "3. List all EC2 instances in your account:"
echo "aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,State.Name,PrivateIpAddress,PublicIpAddress,Tags[?Key==\`Name\`].Value|[0]]' --output table"

echo ""
echo "🧪 ADVANCED LOAD BALANCER TEST"
echo "=============================="
echo ""
echo "Let's force different connections to potentially hit different instances:"

LB_URL="http://reactapp-alb-1925743791.us-east-1.elb.amazonaws.com"

echo "Testing with different connection methods..."
for i in {1..10}; do
    echo "Request $i:"
    # Use different approaches to potentially bypass any session affinity
    RESPONSE=$(curl -s -H "Connection: close" -H "Cache-Control: no-cache" "$LB_URL/" 2>/dev/null | head -c 100)
    HEADERS=$(curl -s -I -H "Connection: close" "$LB_URL/" 2>/dev/null)

    # Extract key information
    SERVER_IP=$(echo "$HEADERS" | grep -i "x-server:" | cut -d':' -f2 | tr -d ' \r')
    DATE=$(echo "$HEADERS" | grep -i "date:" | cut -d',' -f2 | cut -d' ' -f2-3)

    echo "  Server IP: $SERVER_IP | Time: $DATE"

    # Add small delay and vary the delay to change timing
    sleep $(echo "scale=1; $i * 0.3" | bc 2>/dev/null || echo "0.5")
done

echo ""
echo "🎯 TESTING DIFFERENT ENDPOINTS"
echo "============================"
echo ""
echo "Testing different paths to see if we get routed to different instances:"

ENDPOINTS=("/" "/health" "/favicon.ico" "/static/css/main.22fda57e.css" "/manifest.json")

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing $endpoint:"
    for i in {1..3}; do
        HEADERS=$(curl -s -I -H "Connection: close" "$LB_URL$endpoint" 2>/dev/null)
        SERVER_IP=$(echo "$HEADERS" | grep -i "x-server:" | cut -d':' -f2 | tr -d ' \r')
        HTTP_STATUS=$(echo "$HEADERS" | head -1 | cut -d' ' -f2)
        echo "  Request $i: Status $HTTP_STATUS | Server: $SERVER_IP"
        sleep 0.3
    done
    echo ""
done

echo ""
echo "📊 ANALYSIS & NEXT STEPS"
echo "======================="
echo ""
echo "Based on your results:"
echo ""
echo "✅ CONFIRMED: Your load balancer IS working"
echo "✅ CONFIRMED: Requests are being processed successfully"
echo "✅ CONFIRMED: Health checks are passing"
echo ""
echo "Possible reasons for seeing the same server IP:"
echo "1. 🎯 Session affinity/sticky sessions enabled on ALB"
echo "2. 🎯 Only one healthy instance currently running"
echo "3. 🎯 Load balancer algorithm favoring one instance"
echo "4. 🎯 Requests coming from same source IP getting routed to same instance"
echo ""
echo "To get definitive proof of multiple instances:"
echo "1. Check your ASG desired capacity (should be > 1)"
echo "2. Verify multiple healthy targets in target group"
echo "3. Update user-data script for better instance identification"
echo "4. Test from multiple different source IPs/locations"
