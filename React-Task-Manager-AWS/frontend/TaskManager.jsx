import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, RefreshCw, User, CheckCircle, XCircle } from 'lucide-react';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ userName: '', task: '' });
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');

  // Mock API endpoints - replace with your actual API Gateway URLs
  const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com/prod';

  // Fetch tasks from API
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration - replace with actual API call
      const mockTasks = [
        { id: '1', userName: 'John Doe', task: 'Complete project documentation', status: 'active', createdAt: '2025-01-20T10:00:00Z' },
        { id: '2', userName: 'Jane Smith', task: 'Review code changes', status: 'inactive', createdAt: '2025-01-20T11:00:00Z' },
        { id: '3', userName: 'Mike Johnson', task: 'Deploy to production', status: 'active', createdAt: '2025-01-20T12:00:00Z' }
      ];
      
      setTimeout(() => {
        setTasks(mockTasks);
        setLoading(false);
      }, 1000);
      
      // Actual API call would be:
      // const response = await fetch(`${API_BASE_URL}/tasks`);
      // const data = await response.json();
      // setTasks(data.tasks || []);
    } catch (err) {
      setError('Failed to fetch tasks');
      setLoading(false);
    }
  };

  // Submit new task
  const submitTask = async (e) => {
    e.preventDefault();
    if (!formData.userName.trim() || !formData.task.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Mock submission - replace with actual API call
      const newTask = {
        id: Date.now().toString(),
        userName: formData.userName,
        task: formData.task,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      setTasks(prev => [...prev, newTask]);
      setFormData({ userName: '', task: '' });
      setError('');
      
      // Actual API call would be:
      // const response = await fetch(`${API_BASE_URL}/tasks`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // await response.json();
      // fetchTasks();
    } catch (err) {
      setError('Failed to submit task');
    }
    setLoading(false);
  };

  // Toggle task status
  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      // Mock status update - replace with actual API call
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      // Actual API call would be:
      // await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
    } catch (err) {
      setError('Failed to update task status');
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      // Mock deletion - replace with actual API call
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Actual API call would be:
      // await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      //   method: 'DELETE'
      // });
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <User className="text-white" size={24} />
              </div>
              Task Manager
            </h1>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">×</button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} />
                Add New Task
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({...formData, userName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter user name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Description
                  </label>
                  <textarea
                    value={formData.task}
                    onChange={(e) => setFormData({...formData, task: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows="4"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? 'Submitting...' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Tasks ({tasks.length})</h2>
              
              {loading && tasks.length === 0 ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="animate-spin text-blue-500" size={32} />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <User size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No tasks found. Add your first task!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-800">{task.userName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              task.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {task.status === 'active' ? (
                                <CheckCircle size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {task.status}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">{task.task}</p>
                          <p className="text-sm text-gray-400">
                            Created: {formatDate(task.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleTaskStatus(task.id, task.status)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              task.status === 'active'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {task.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
              <div className="text-gray-600">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'active').length}
              </div>
              <div className="text-gray-600">Active Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {tasks.filter(t => t.status === 'inactive').length}
              </div>
              <div className="text-gray-600">Inactive Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;