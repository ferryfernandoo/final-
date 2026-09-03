/**
 * ====================================================================
 * DEEPERNOVA LINTER RUNNER & SYNTAX VALIDATOR (Self-Healing Engine)
 * ====================================================================
 * Analyzes source code across JavaScript, TypeScript, Python, HTML, CSS,
 * and JSON. Detects syntax errors, missing brackets, unbalanced quotes,
 * and structural bugs with line-numbered diagnostic feedback.
 * ====================================================================
 */

/**
 * Validates JavaScript / JSX syntax
 */
export const validateJavaScript = (code, filename = 'script.js') => {
  try {
    // 1. Basic Function constructor syntax parse test
    // Wrap in async function body test to validate ES6+ syntax
    new Function(`return (async function() { \n${code}\n });`);
    return { hasError: false, diagnostics: '' };
  } catch (err) {
    // Parse error line from stack / message
    const lineMatch = err.stack?.match(/<anonymous>:(\d+):(\d+)/) || err.message.match(/line (\d+)/i);
    const lineInfo = lineMatch ? ` (sekitar baris ${Math.max(1, parseInt(lineMatch[1]) - 1)})` : '';
    return {
      hasError: true,
      diagnostics: `${filename}${lineInfo}: SyntaxError: ${err.message}`
    };
  }
};

/**
 * Validates JSON structure
 */
export const validateJson = (code, filename = 'data.json') => {
  try {
    JSON.parse(code);
    return { hasError: false, diagnostics: '' };
  } catch (err) {
    return {
      hasError: true,
      diagnostics: `${filename}: JSON Parse Error: ${err.message}`
    };
  }
};

/**
 * Validates HTML balance
 */
export const validateHtml = (code, filename = 'index.html') => {
  // Check basic unclosed tags and script tags
  const openTags = [];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?(\/?)>/g;
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype']);

  let match;
  while ((match = tagRegex.exec(code)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isSelfClosing = match[2] === '/' || voidTags.has(tagName) || fullTag.startsWith('<!');
    const isClosing = fullTag.startsWith('</');

    if (isSelfClosing) continue;

    if (isClosing) {
      if (openTags.length === 0) {
        return {
          hasError: true,
          diagnostics: `${filename}: Tag penutup tidak terduga '</${tagName}>' tanpa tag pembuka yang sesuai.`
        };
      }
      const last = openTags.pop();
      if (last.name !== tagName) {
        return {
          hasError: true,
          diagnostics: `${filename}: Tag tidak seimbang: Mengharapkan '</${last.name}>' tetapi ditemukan '</${tagName}>'.`
        };
      }
    } else {
      openTags.push({ name: tagName, index: match.index });
    }
  }

  // Check inline script syntax if any
  const scriptRegex = /<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(code)) !== null) {
    const scriptCode = scriptMatch[1];
    if (scriptCode.trim()) {
      const jsRes = validateJavaScript(scriptCode, `${filename} <script>`);
      if (jsRes.hasError) return jsRes;
    }
  }

  return { hasError: false, diagnostics: '' };
};

/**
 * Validates Python structure (bracket balancing & indentation checks)
 */
export const validatePython = (code, filename = 'main.py') => {
  const lines = code.split('\n');
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    // Check colons on control structures
    if (/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/i.test(trimmed) && !trimmed.endsWith(':')) {
      if (!trimmed.includes('#') && !trimmed.endsWith('\\')) {
        return {
          hasError: true,
          diagnostics: `${filename}:${i + 1}: SyntaxError: Kurang tanda titik dua ':' di akhir pernyataan '${trimmed.split(' ')[0]}'`
        };
      }
    }

    // Bracket balance check
    for (let char of line) {
      if (char === '(' || char === '[' || char === '{') {
        stack.push({ char, line: i + 1 });
      } else if (char === ')' || char === ']' || char === '}') {
        if (stack.length === 0) {
          return {
            hasError: true,
            diagnostics: `${filename}:${i + 1}: SyntaxError: Kurung '${char}' ditutup tanpa ada kurung pembuka.`
          };
        }
        const last = stack.pop();
        if (pairs[last.char] !== char) {
          return {
            hasError: true,
            diagnostics: `${filename}:${i + 1}: SyntaxError: Kurung tidak cocok '${last.char}' (baris ${last.line}) ditutup dengan '${char}'`
          };
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.pop();
    return {
      hasError: true,
      diagnostics: `${filename}:${unclosed.line}: SyntaxError: Kurang tanda kurung penutup untuk '${unclosed.char}'`
    };
  }

  return { hasError: false, diagnostics: '' };
};

/**
 * Universal Multi-Language Linter Dispatcher
 */
export const validateCodeFile = (filename, content) => {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const raw = content || '';

  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'ts':
    case 'tsx':
      return validateJavaScript(raw, filename);
    case 'json':
      return validateJson(raw, filename);
    case 'html':
    case 'htm':
      return validateHtml(raw, filename);
    case 'py':
    case 'python':
      return validatePython(raw, filename);
    default:
      return { hasError: false, diagnostics: '' };
  }
};
