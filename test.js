// 测试脚本
const axios = require('axios');

// 测试 chat completions 端点
async function testChatCompletions() {
  try {
    const response = await axios.post('http://localhost:8787/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      metadata: {
        task_type: 'text'
      }
    }, {
      headers: {
        'Authorization': 'Bearer test-api-key',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test 1 - Text completion response:', response.data);
  } catch (error) {
    console.error('Test 1 - Error:', error.response?.data || error.message);
  }
}

// 测试代码生成任务类型
async function testCodeCompletion() {
  try {
    const response = await axios.post('http://localhost:8787/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Write a function to calculate the factorial of a number' }
      ],
      metadata: {
        task_type: 'code'
      }
    }, {
      headers: {
        'Authorization': 'Bearer test-api-key',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test 2 - Code completion response:', response.data);
  } catch (error) {
    console.error('Test 2 - Error:', error.response?.data || error.message);
  }
}

// 测试图像生成任务类型
async function testImageGeneration() {
  try {
    const response = await axios.post('http://localhost:8787/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Generate an image of a cat' }
      ],
      metadata: {
        task_type: 'image'
      }
    }, {
      headers: {
        'Authorization': 'Bearer test-api-key',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test 3 - Image generation response:', response.data);
  } catch (error) {
    console.error('Test 3 - Error:', error.response?.data || error.message);
  }
}

// 测试认证失败情况
async function testAuthFailure() {
  try {
    const response = await axios.post('http://localhost:8787/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test 4 - Auth failure response:', response.data);
  } catch (error) {
    console.error('Test 4 - Expected error:', error.response?.data || error.message);
  }
}

// 运行所有测试
async function runTests() {
  console.log('Running tests...');
  await testChatCompletions();
  await testCodeCompletion();
  await testImageGeneration();
  await testAuthFailure();
  console.log('Tests completed.');
}

runTests();
