#!/bin/bash
# cleanup-resources.sh - Comprehensive cleanup for Free Tier management

echo "🧹 Starting complete resource cleanup..."

# Step 1: Delete Auto Scaling Group
echo "🗑️ Deleting Auto Scaling Group..."
aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name ReactApp-ASG \
    --min-size 0 \
    --desired-capacity 0 \
    --region us-east-1

sleep 180  # Wait for instances to terminate

aws autoscaling delete-auto-scaling-group \
    --auto-scaling-group-name ReactApp-ASG \
    --force-delete \
    --region us-east-1

# Step 2: Delete CloudWatch Resources
echo "🗑️ Deleting CloudWatch alarms and dashboard..."
aws cloudwatch delete-alarms \
    --alarm-names ReactApp-HighCPU ReactApp-LowCPU ReactApp-HighErrorRate \
    --region us-east-1

aws cloudwatch delete-dashboards \
    --dashboard-names ReactApp-Production-Dashboard \
    --region us-east-1

# Step 3: Delete Load Balancer Resources
echo "🗑️ Deleting Load Balancer..."
sleep 180  # Wait before deleting ALB

aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region us-east-1
sleep 120

aws elbv2 delete-target-group --target-group-arn $TG_ARN --region us-east-1

# Step 4: Delete Launch Template
aws ec2 delete-launch-template \
    --launch-template-name ReactAppTemplate \
    --region us-east-1

# Step 5: Delete Security Groups
sleep 120  # Wait for all resources to detach
aws ec2 delete-security-group --group-id $EC2_SG_ID --region us-east-1
aws ec2 delete-security-group --group-id $ALB_SG_ID --region us-east-1

# Step 6: Delete IAM Resources
aws iam remove-role-from-instance-profile \
    --instance-profile-name ReactAppEC2Profile \
    --role-name ReactAppEC2Role

aws iam delete-instance-profile \
    --instance-profile-name ReactAppEC2Profile

aws iam detach-role-policy \
    --role-name ReactAppEC2Role \
    --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

aws iam detach-role-policy \
    --role-name ReactAppEC2Role \
    --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/ReactAppS3DeploymentPolicy

aws iam delete-policy \
    --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/ReactAppS3DeploymentPolicy

aws iam delete-role --role-name ReactAppEC2Role

# Step 7: Delete S3 Resources
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3 rb s3://$BUCKET_NAME

echo "✅ Cleanup completed! All resources deleted."
echo "💰 Your AWS account is back to baseline Free Tier usage."