import React, { useState, useEffect } from 'react';
import './TaskManager.css';

// Replace this with your actual API Gateway URL after deployment
const API_BASE_URL = 'https://ue8rg8rtsk.execute-api.us-east-1.amazonaws.com/dev';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [userName, setUserName] = useState('');
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.tasks || []);
      setError('');
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Create new task
  const createTask = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !task.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName.trim(),
          task: task.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      setUserName('');
      setTask('');
      setError('');
      fetchTasks(); // Refresh the task list
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update task');
      
      fetchTasks(); // Refresh the task list
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');
      
      fetchTasks(); // Refresh the task list
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'inactive');

  return (
    <div className="task-manager">
      <div className="container">
        <header className="header">
          <h1>Task Manager</h1>
          <p>Organize your tasks efficiently</p>
        </header>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="close-error">×</button>
          </div>
        )}

        <form onSubmit={createTask} className="task-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter task description"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Add Task'}
          </button>
        </form>

        <div className="tasks-container">
          <div className="tasks-section">
            <h2>Active Tasks ({activeTasks.length})</h2>
            {loading && tasks.length === 0 ? (
              <div className="loading">Loading tasks...</div>
            ) : activeTasks.length === 0 ? (
              <p className="no-tasks">No active tasks</p>
            ) : (
              <div className="tasks-list">
[O                {activeTasks.map(taskItem => (
                  <div key={taskItem.id} className="task-card active">
                    <div className="task-content">
                      <h3>{taskItem.task}</h3>
                      <p>By: {taskItem.userName}</p>
                      <p className="task-date">
                        Created: {new Date(taskItem.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => updateTaskStatus(taskItem.id, 'inactive')}
                        className="complete-btn"
                      >
                        Complete
                      </button>
                      <button 
                        onClick={() => deleteTask(taskItem.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tasks-section">
            <h2>Completed Tasks ({completedTasks.length})</h2>
            {completedTasks.length === 0 ? (
              <p className="no-tasks">No completed tasks</p>
            ) : (
              <div className="tasks-list">
                {completedTasks.map(taskItem => (
                  <div key={taskItem.id} className="task-card completed">
                    <div className="task-content">
                      <h3>{taskItem.task}</h3>
                      <p>By: {taskItem.userName}</p>
                      <p className="task-date">
                        Completed: {new Date(taskItem.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => updateTaskStatus(taskItem.id, 'active')}
                        className="reopen-btn"
                      >
                        Reopen
                      </button>
                      <button 
                        onClick={() => deleteTask(taskItem.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
