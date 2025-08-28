// Replace your lambda/admin/index.js with this code

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'PUT,DELETE,OPTIONS'
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
        // Extract task ID from path parameters
        const taskId = event.pathParameters?.id;
        if (!taskId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing task ID',
                    message: 'Task ID is required in the URL path'
                })
            };
        }
        
        // DynamoDB table name
        const tableName = process.env.TASKS_TABLE || 'TasksTable';
        
        // Handle different HTTP methods
        if (event.httpMethod === 'PUT') {
            return await updateTaskStatus(tableName, taskId, event.body, corsHeaders);
        } else if (event.httpMethod === 'DELETE') {
            return await deleteTask(tableName, taskId, corsHeaders);
        } else {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Method not allowed',
                    message: 'Only PUT and DELETE methods are supported'
                })
            };
        }
        
    } catch (error) {
        console.error('Error in admin function:', error);
        
        // Handle general errors
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to process request'
            })
        };
    }
};

// Function to update task status
async function updateTaskStatus(tableName, taskId, requestBody, corsHeaders) {
    try {
        // Parse request body
        let body;
        try {
            body = JSON.parse(requestBody);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid JSON',
                    message: 'Request body must be valid JSON'
                })
            };
        }
        
        const { status } = body;
        
        // Validate status value
        if (!status || (status !== 'active' && status !== 'inactive')) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid status',
                    message: 'Status must be either "active" or "inactive"'
                })
            };
        }
        
        // First, check if the task exists
        const getCommand = new GetCommand({
            TableName: tableName,
            Key: { id: taskId }
        });
        
        const existingItem = await dynamodb.send(getCommand);
        
        if (!existingItem.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Task not found',
                    message: `Task with ID ${taskId} does not exist`
                })
            };
        }
        
        // Update the task status
        const updateCommand = new UpdateCommand({
            TableName: tableName,
            Key: { id: taskId },
            UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        });
        
        const result = await dynamodb.send(updateCommand);
        
        console.log(`Task ${taskId} status updated to ${status}`);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Task status updated successfully',
                task: result.Attributes
            })
        };
        
    } catch (error) {
        console.error('Error updating task status:', error);
        
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
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to update task status'
            })
        };
    }
}

// Function to delete a task
async function deleteTask(tableName, taskId, corsHeaders) {
    try {
        // First, check if the task exists
        const getCommand = new GetCommand({
            TableName: tableName,
            Key: { id: taskId }
        });
        
        const existingItem = await dynamodb.send(getCommand);
        
        if (!existingItem.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Task not found',
                    message: `Task with ID ${taskId} does not exist`
                })
            };
        }
        
        // Delete the task
        const deleteCommand = new DeleteCommand({
            TableName: tableName,
            Key: { id: taskId },
            ReturnValues: 'ALL_OLD'
        });
        
        const result = await dynamodb.send(deleteCommand);
        
        console.log(`Task ${taskId} deleted successfully`);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Task deleted successfully',
                deletedTask: result.Attributes
            })
        };
        
    } catch (error) {
        console.error('Error deleting task:', error);
        
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
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to delete task'
            })
        };
    }
}