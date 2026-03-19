type TaskType = 'code' | 'text' | 'image';

const modelMap: Record<TaskType, string> = {
  code: '@cf/mistral/mistral-7b-instruct-v0.1',
  text: '@cf/meta/llama-3-8b-instruct',
  image: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
};

async function validateApiKey(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const apiKey = authHeader.replace('Bearer ', '');

  try {
    const storedKey = await API_KEYS.get(apiKey);
    return storedKey !== null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

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

function convertToOpenAIFormat(response: any): any {
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

async function handleChatCompletions(request: Request): Promise<Response> {
  try {
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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await request.json() as any;

    let taskType: TaskType = 'text';
    try {
      const taskTypeFromBody = requestBody.metadata?.task_type || requestBody.task_type;
      if (taskTypeFromBody === 'code' || taskTypeFromBody === 'text' || taskTypeFromBody === 'image') {
        taskType = taskTypeFromBody;
      }
    } catch (error) {
      console.error('Error parsing task type:', error);
    }

    const model = modelMap[taskType];
    const aiResponse = await forwardToAIGateway(model, requestBody);
    const openaiResponse = convertToOpenAIFormat(aiResponse);

    return new Response(JSON.stringify(openaiResponse), {
      headers: { 'Content-Type': 'application/json' }
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
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'POST' && path === '/v1/chat/completions') {
    return handleChatCompletions(request);
  }

  return new Response(JSON.stringify({
    error: {
      message: 'Not found',
      type: 'invalid_request_error',
      code: 'not_found'
    }
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  fetch: handleRequest
};
