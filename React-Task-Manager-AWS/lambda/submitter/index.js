// Replace your lambda/submitter/index.js with this code

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Event body type:', typeof event.body);
    console.log('Event body value:', event.body);
    console.log('Event isBase64Encoded:', event.isBase64Encoded);
    
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
        
        // Check if body exists
        if (!event.body) {
            console.error('No request body found');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing request body',
                    message: 'Request body is required'
                })
            };
        }
        
        try {
            // Handle base64 encoded body (if coming from API Gateway)
            const bodyString = event.isBase64Encoded ? 
                Buffer.from(event.body, 'base64').toString('utf-8') : 
                event.body;
            
            requestBody = JSON.parse(bodyString);
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            console.error('Raw body:', event.body);
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
            id: randomUUID(),
            userName: userName.trim(),
            task: task.trim(),
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // DynamoDB table name
        const tableName = process.env.TASKS_TABLE || 'TasksTable';
        
        // Insert item into DynamoDB
        const command = new PutCommand({
            TableName: tableName,
            Item: taskItem,
            ConditionExpression: 'attribute_not_exists(id)'
        });
        
        await dynamodb.send(command);
        
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
        if (error.name === 'ConditionalCheckFailedException') {
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
        if (error.name) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'AWS Service Error',
                    message: error.message,
                    code: error.name
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