const AWS = require('aws-sdk');

// Initialize DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight handled' })
        };
    }
    
    try {
        // DynamoDB table name (replace with your actual table name)
        const tableName = process.env.TASKS_TABLE || 'TasksTable';
        
        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const {
            status,           // Filter by status: 'active' or 'inactive'
            userName,         // Filter by userName
            limit = '50',     // Limit number of results
            lastKey          // For pagination
        } = queryParams;
        
        // Build scan parameters
        let scanParams = {
            TableName: tableName,
            Limit: parseInt(limit, 10)
        };
        
        // Add pagination if lastKey is provided
        if (lastKey) {
            try {
                scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
            } catch (error) {
                console.error('Error parsing lastKey:', error);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Invalid pagination key',
                        message: 'lastKey parameter is malformed'
                    })
                };
            }
        }
        
        // Build filter expressions
        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};
        
        if (status && (status === 'active' || status === 'inactive')) {
            filterExpressions.push('#status = :status');
            expressionAttributeNames['#status'] = 'status';
            expressionAttributeValues[':status'] = status;
        }
        
        if (userName) {
            filterExpressions.push('contains(#userName, :userName)');
            expressionAttributeNames['#userName'] = 'userName';
            expressionAttributeValues[':userName'] = userName;
        }
        
        // Add filter expression if any filters are applied
        if (filterExpressions.length > 0) {
            scanParams.FilterExpression = filterExpressions.join(' AND ');
            scanParams.ExpressionAttributeNames = expressionAttributeNames;
            scanParams.ExpressionAttributeValues = expressionAttributeValues;
        }
        
        console.log('Scan parameters:', JSON.stringify(scanParams, null, 2));
        
        // Perform the scan operation
        const result = await dynamodb.scan(scanParams).promise();
        
        console.log(`Retrieved ${result.Items.length} tasks`);
        
        // Sort tasks by createdAt in descending order (newest first)
        const sortedTasks = result.Items.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Prepare pagination info
        let nextKey = null;
        if (result.LastEvaluatedKey) {
            nextKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
        }
        
        // Return successful response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                tasks: sortedTasks,
                count: sortedTasks.length,
                pagination: {
                    nextKey: nextKey,
                    hasMore: !!result.LastEvaluatedKey
                },
                filters: {
                    status: status || null,
                    userName: userName || null
                }
            })
        };
        
    } catch (error) {
        console.error('Error in fetcher function:', error);
        
        // Handle AWS service errors
        if (error.code === 'ResourceNotFoundException') {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Table not found',
                    message: 'The tasks table does not exist'
                })
            };
        }
        
        if (error.code === 'ValidationException') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Validation error',
                    message: error.message
                })
            };
        }
        
        // Handle other AWS errors
        if (error.code) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'AWS Service Error',
                    message: error.message,
                    code: error.code
                })
            };
        }
        
        // Handle general errors
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to fetch tasks'
            })
        };
    }
};