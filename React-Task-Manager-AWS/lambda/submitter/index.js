const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
        // Parse request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid JSON in request body',
                    message: parseError.message
                })
            };
        }
        
        // Validate required fields
        const { userName, task } = requestBody;
        
        if (!userName || !task) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    message: 'userName and task are required'
                })
            };
        }
        
        // Validate field lengths
        if (userName.length > 100) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Validation error',
                    message: 'userName must be less than 100 characters'
                })
            };
        }
        
        if (task.length > 500) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Validation error',
                    message: 'task must be less than 500 characters'
                })
            };
        }
        
        // Create task item
        const taskItem = {
            id: uuidv4(),
            userName: userName.trim(),
            task: task.trim(),
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // DynamoDB table name (replace with your actual table name)
        const tableName = process.env.TASKS_TABLE || 'TasksTable';
        
        // Insert item into DynamoDB
        const putParams = {
            TableName: tableName,
            Item: taskItem,
            // Prevent overwriting if item with same id already exists
            ConditionExpression: 'attribute_not_exists(id)'
        };
        
        await dynamodb.put(putParams).promise();
        
        console.log('Task created successfully:', taskItem);
        
        // Return success response
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Task created successfully',
                task: taskItem
            })
        };
        
    } catch (error) {
        console.error('Error in submitter function:', error);
        
        // Handle DynamoDB conditional check failed error
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Conflict',
                    message: 'Task with this ID already exists'
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
                message: 'Failed to create task'
            })
        };
    }
};