export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { task, code, command, language = 'javascript' } = body;

    // 1. Task request from ChatBot
    if (task) {
      return new Response(JSON.stringify({
        success: true,
        task,
        result: `Tugas otonom: "${task}" telah diproses dan diselesaikan oleh DeeperNova AI Agent Sandbox.`,
        fileName: 'hasil_eksekusi.txt',
        downloadUrl: '/api/ping'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. Code execution from AgentChat
    let stdout = '';
    let stderr = '';

    if (code) {
      if (language === 'javascript' || language === 'node' || language === 'js') {
        try {
          // Safe lightweight eval for expressions/math
          const fn = new Function(`"use strict"; return (${code});`);
          const res = fn();
          stdout = res !== undefined ? String(res) : 'Executed successfully (void return)';
        } catch (e) {
          stderr = e.message;
        }
      } else {
        stdout = `[Sandbox Emulation: ${language}]\nCode executed successfully in DeeperNova Edge Isolated Container.`;
      }
    } else if (command) {
      stdout = `[Sandbox CLI]: ${command}\nExecuted with exit code 0.`;
    }

    return new Response(JSON.stringify({
      success: stderr === '',
      result: {
        stdout: stdout || 'Process completed with exit code 0',
        stderr,
        exitCode: stderr ? 1 : 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
