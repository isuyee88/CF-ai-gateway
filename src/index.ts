interface Env {
  API_KEYS: KVNamespace;
  AI: Ai;
}

type TaskType = 'code' | 'text' | 'image';

const modelMap: Record<TaskType, string> = {
  code: '@cf/mistral/mistral-7b-instruct-v0.1',
  text: '@cf/meta/llama-3.1-8b-instruct',
  image: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
};

async function validateApiKey(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }

  const apiKey = authHeader.replace('Bearer ', '');
  console.log('Validating API key:', apiKey);

  try {
    const storedKey = await env.API_KEYS.get(apiKey);
    console.log('KV lookup result:', storedKey);
    return storedKey !== null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

async function runAIModel(env: Env, model: string, prompt: string): Promise<any> {
  console.log('Running AI model:', model);
  console.log('Prompt:', prompt);

  try {
    const result = await env.AI.run(model as any, {
      prompt: prompt,
      max_tokens: 1024
    });

    console.log('AI result:', JSON.stringify(result).substring(0, 200));
    return result;
  } catch (error) {
    console.error('Error running AI model:', error);
    throw error;
  }
}

function convertToOpenAIFormat(response: any): any {
  const content = response.response || response.result?.response || JSON.stringify(response);
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
          content: content
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

async function handleChatCompletions(request: Request, env: Env): Promise<Response> {
  try {
    const isValid = await validateApiKey(request, env);
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
    const taskTypeFromBody = requestBody.metadata?.task_type || requestBody.task_type;
    if (taskTypeFromBody === 'code' || taskTypeFromBody === 'text' || taskTypeFromBody === 'image') {
      taskType = taskTypeFromBody;
    }

    const model = modelMap[taskType];
    console.log('Task type:', taskType, 'Model:', model);

    const messages = requestBody.messages || [];
    const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');

    const aiResponse = await runAIModel(env, model, prompt);
    console.log('AI response received');

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

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'POST' && path === '/v1/chat/completions') {
    return handleChatCompletions(request, env);
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
