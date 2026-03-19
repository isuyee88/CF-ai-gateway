import { Router, type IRequest } from 'itty-router';

// 定义任务类型
type TaskType = 'code' | 'text' | 'image';

// 定义模型映射
const modelMap: Record<TaskType, string> = {
  code: 'code-generation-model',
  text: 'text-generation-model',
  image: 'image-generation-model'
};

// 创建路由器
const router = Router();

// 验证 API key
async function validateApiKey(request: IRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const apiKey = authHeader.replace('Bearer ', '');
  
  // 从 KV 存储中验证 API key
  try {
    const storedKey = await API_KEYS.get(apiKey);
    return storedKey !== null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}



// 转发请求到 AI 网关
async function forwardToAIGateway(model: string, requestBody: any): Promise<any> {
  const aiGatewayUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run`;
  
  try {
    const response = await fetch(aiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`
      },
      body: JSON.stringify({
        model,
        inputs: requestBody
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI Gateway request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error forwarding to AI Gateway:', error);
    throw error;
  }
}

// 转换响应为 OpenAI 格式
function convertToOpenAIFormat(response: any): any {
  // 转换逻辑
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'cloudflare-works',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response.result || ''
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

// 处理 chat completions 请求
router.post('/v1/chat/completions', async (request: IRequest) => {
  try {
    // 验证 API key
    const isValid = await validateApiKey(request);
    if (!isValid) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid authentication',
          type: 'invalid_request_error',
          code: 'invalid_api_key'
        }
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 解析请求体
    const requestBody = await request.json() as any;
    
    // 识别任务类型
    let taskType: TaskType = 'text';
    try {
      // 从自定义元数据中获取任务类型
      const taskTypeFromBody = requestBody.metadata?.task_type || requestBody.task_type;
      if (taskTypeFromBody === 'code' || taskTypeFromBody === 'text' || taskTypeFromBody === 'image') {
        taskType = taskTypeFromBody;
      }
    } catch (error) {
      console.error('Error parsing task type:', error);
    }
    
    // 选择模型
    const model = modelMap[taskType];
    
    // 转发到 AI 网关
    const aiResponse = await forwardToAIGateway(model, requestBody);
    
    // 转换响应格式
    const openaiResponse = convertToOpenAIFormat(aiResponse);
    
    return new Response(JSON.stringify(openaiResponse), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({
      error: {
        message: 'An error occurred while processing your request',
        type: 'server_error',
        code: 'internal_error'
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

// 404 处理
router.all('*', () => {
  return new Response('Not Found', {
    status: 404
  });
});

// 导出 Worker
export default {
  fetch: router.handle
};
