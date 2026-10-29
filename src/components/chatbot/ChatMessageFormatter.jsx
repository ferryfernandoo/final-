// ============================================================
// Deepernova AI ChatBot — Memoized Message Text & Markdown Formatter
// ============================================================
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cleanCodeBlock } from '../../utils/codeHighlight';
import ChartGenerator from '../ChartGenerator';
import {
  AutoRedirectCountdownCard,
  CodeBlockHolder,
  FormulaRenderer
} from './ChatSubComponents';
import {
  detectChartType,
  parseChartDataFromText,
  removeExecutionLogLines,
  removeDownloadStatusLines
} from './chatTextUtils';

export const parseQuizText = (
  text,
  messageId,
  selectedAnswers = {},
  isSubmitted = false,
  setQuizSelections,
  setQuizSubmitted
) => {
  if (!text) return null;

  const cleanLine = (line) =>
    line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

  const normalized = text.replace(/\r/g, '').trim();
  const lines = normalized
    .split(/\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const titleLineIndex = lines.findIndex((line) => /^(?:kuis|quiz)\s*[:,-]?/i.test(line));
  const questionRegex = /^(?:soal\s*)?(\d+)[).:-]?\s*(.+)$/i;
  const optionRegex = /^([A-Za-z])[).:;-]?\s*(.+)$/;

  let title = '';
  let quizLines = lines;
  let answerLines = [];

  if (titleLineIndex !== -1) {
    const titleLine = lines[titleLineIndex];
    title = titleLine.replace(/^(?:kuis|quiz)\s*[:,-]?\s*/i, '').trim();
    const answerStartIndex = lines.findIndex(
      (line, index) =>
        index > titleLineIndex && /^(?:kunci jawaban|jawaban|pembahasan|answer key)/i.test(line)
    );
    quizLines =
      answerStartIndex === -1
        ? lines.slice(titleLineIndex + 1)
        : lines.slice(titleLineIndex + 1, answerStartIndex);
    answerLines = answerStartIndex === -1 ? [] : lines.slice(answerStartIndex);
  } else {
    const questionCount = lines.filter((line) => questionRegex.test(line)).length;
    const optionCount = lines.filter((line) => optionRegex.test(line)).length;
    const answerStartIndex = lines.findIndex((line) => /^(?:kunci jawaban|jawaban|pembahasan|answer key)/i.test(line));
    const hasQuizHeader = titleLineIndex !== -1;
    const hasExplicitAnswerSection = answerStartIndex !== -1;

    if (!hasQuizHeader && !hasExplicitAnswerSection) return null;
    if (questionCount < 2 || optionCount < 1) return null;

    quizLines = answerStartIndex === -1 ? lines : lines.slice(0, answerStartIndex);
    answerLines = answerStartIndex === -1 ? [] : lines.slice(answerStartIndex);
  }

  const questions = [];
  let currentQuestion = null;

  for (const line of quizLines) {
    if (!line) continue;
    const optionMatch = line.match(optionRegex);
    const questionMatch = line.match(questionRegex);

    if (questionMatch && (!optionMatch || questionMatch[1] !== optionMatch[1])) {
      currentQuestion = {
        number: parseInt(questionMatch[1], 10),
        question: questionMatch[2].trim(),
        options: []
      };
      questions.push(currentQuestion);
    } else if (optionMatch && currentQuestion) {
      currentQuestion.options.push({
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim()
      });
    } else if (currentQuestion) {
      currentQuestion.question += ' ' + line;
    }
  }

  if (questions.length === 0) return null;

  const answerKey = [];
  let currentAnswer = null;

  for (const line of answerLines) {
    if (!line) continue;
    const answerMatch = line.match(/^(?:soal\s*)?(\d+)[).:-]?\s*([A-Za-z])/i);
    const explanationMatch = line.match(/^([A-Za-z])[).:;-]?\s*(.+)$/);

    if (answerMatch) {
      currentAnswer = {
        number: parseInt(answerMatch[1], 10),
        answer: answerMatch[2].toUpperCase(),
        explanation: ''
      };
      answerKey.push(currentAnswer);
    } else if (explanationMatch && currentAnswer) {
      currentAnswer.explanation = explanationMatch[2].trim();
    }
  }

  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.number] !== undefined);

  let correctCount = 0;
  if (isSubmitted && answerKey.length > 0) {
    questions.forEach((q) => {
      const correctItem = answerKey.find((a) => a.number === q.number);
      if (correctItem && selectedAnswers[q.number] === correctItem.answer) {
        correctCount++;
      }
    });
  }
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="quiz-card">
      {title ? <div className="quiz-title">📝 {title}</div> : <div className="quiz-title">📝 Kuis</div>}

      {questions.map((question) => {
        const selectedOption = selectedAnswers[question.number];
        const correctItem = answerKey.find((a) => a.number === question.number);
        const correctAnswer = correctItem ? correctItem.answer : null;
        const limitedOptions = question.options.slice(0, 3);

        return (
          <div key={question.number} className="quiz-question-block">
            <div className="quiz-question">
              <span className="quiz-question-number">{question.number}.</span>
              <span>{question.question}</span>
            </div>
            {limitedOptions.length > 0 && (
              <div className="quiz-options">
                {limitedOptions.map((option) => {
                  const isSelected = selectedOption === option.label;
                  let optionClass = 'quiz-option';
                  if (isSelected) optionClass += ' selected';
                  if (isSubmitted && correctAnswer) {
                    if (option.label === correctAnswer) {
                      optionClass += ' correct';
                    } else if (isSelected && option.label !== correctAnswer) {
                      optionClass += ' incorrect';
                    }
                  }
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={optionClass}
                      disabled={isSubmitted}
                      onClick={() => {
                        if (!messageId || isSubmitted) return;
                        setQuizSelections?.((prev) => ({
                          ...prev,
                          [messageId]: {
                            ...prev[messageId],
                            [question.number]: option.label
                          }
                        }));
                      }}
                    >
                      <span className="quiz-option-label">{option.label}.</span>
                      <span className="quiz-option-text">{option.text}</span>
                      {isSubmitted && option.label === correctAnswer && <span className="quiz-option-correct-icon">✅</span>}
                      {isSubmitted && isSelected && option.label !== correctAnswer && <span className="quiz-option-incorrect-icon">❌</span>}
                      {!isSubmitted && isSelected && <span className="quiz-option-selected">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!isSubmitted && allAnswered && answerKey.length > 0 && (
        <button
          type="button"
          className="quiz-submit-btn"
          onClick={() => {
            setQuizSubmitted?.((prev) => ({ ...prev, [messageId]: true }));
          }}
        >
          📊 Lihat Hasil
        </button>
      )}

      {isSubmitted && answerKey.length > 0 && (
        <div className={`quiz-score ${scorePercent >= 70 ? 'good' : scorePercent >= 40 ? 'okay' : 'low'}`}>
          <div className="quiz-score-header">
            <span className="quiz-score-emoji">{scorePercent >= 70 ? '🎉' : scorePercent >= 40 ? '💪' : '📚'}</span>
            <span className="quiz-score-label">Skor Kamu</span>
          </div>
          <div className="quiz-score-value">{correctCount}/{questions.length}</div>
          <div className="quiz-score-percent">{scorePercent}%</div>
          <div className="quiz-score-message">
            {scorePercent >= 70 ? 'Hebat! Kamu menguasai materi ini! 🔥' : scorePercent >= 40 ? 'Lumayan! Terus belajar ya! 💪' : 'Jangan menyerah! Coba pelajari lagi ya! 📚'}
          </div>
        </div>
      )}

      {isSubmitted && answerKey.length > 0 && (
        <div className="quiz-answer-key">
          <div className="quiz-answer-key-title">Kunci Jawaban</div>
          {answerKey.map((item) => (
            <div key={item.number} className="quiz-answer-item">
              <span className="quiz-answer-question">{item.number}.</span>
              <span className="quiz-answer-choice">{item.answer}</span>
              {item.explanation ? <div className="quiz-answer-explanation">{item.explanation}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const formatMessageContent = ({
  text,
  isStreaming = false,
  message = null,
  messageId = null,
  userLanguage = 'id',
  onNavigate,
  handleImageClick,
  handleUpscaleHD,
  hdUpscalingMap = {},
  quizSelectedAnswers = {},
  quizIsSubmitted = false,
  setQuizSelections,
  setQuizSubmitted
}) => {
  if (!text) return text;

  const resolvedMessageId = messageId || message?.id || null;
  const redirectCards = [];
  let tempText = text;

  tempText = tempText.replace(/!\[Generated Image\]\([^)]+\)/g, '');
  tempText = tempText.replace(/\[SEARCH_REQUEST:\s*(.+?)\]/g, '');
  tempText = tempText.replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '');
  tempText = tempText.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*?\]/gi, '');

  tempText = tempText.replace(/\[(?:REQUEST_DOCUMENT|REQUEST_DOCX|EXECUTE_DOCUMENT):\s*(.+?)\]/gi, (match, topic) => {
    redirectCards.push({ target: 'documents', fileType: 'docx', topic: topic.trim() });
    return '';
  });

  tempText = tempText.replace(/\[REQUEST_EXCEL:\s*(.+?)\]/gi, (match, topic) => {
    redirectCards.push({ target: 'documents', fileType: 'excel', topic: topic.trim() });
    return '';
  });

  tempText = tempText.replace(/\[(?:REQUEST_PPT|REQUEST_PPTX):\s*(.+?)\]/gi, (match, topic) => {
    redirectCards.push({ target: 'documents', fileType: 'pptx', topic: topic.trim() });
    return '';
  });

  tempText = tempText.replace(/\[(?:REQUEST_AGENT|REQUEST_CODE|EXECUTE_CODE|OPEN_AGENT):\s*(.+?)\]/gi, (match, task) => {
    redirectCards.push({ target: 'agent', fileType: null, topic: task.trim() });
    return '';
  });

  if (tempText.includes('[NAVIGATE_UNIVERSE]')) {
    redirectCards.push({ target: 'universe', fileType: null, topic: '' });
    tempText = tempText.replace(/\[NAVIGATE_UNIVERSE\]/g, '');
  }

  const imageRequests = [];
  let processedText = tempText.replace(/\[IMAGE_REQUEST:\s*(.+?)\]/g, (match, prompt) => {
    const index = imageRequests.length;
    imageRequests.push(prompt.trim());
    return `__IMAGE_REQUEST_BLOCK_${index}__`;
  });

  const isMarkdownTableBlock = (txt) => {
    if (!txt || typeof txt !== 'string') return false;
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return false;
    const header = lines[0];
    const sep = lines[1];
    if (!header.includes('|')) return false;
    if (!sep.includes('-')) return false;
    if (!/^[\s|:\-]+$/.test(sep)) return false;
    return true;
  };

  const sources = message?.searchSources || null;

  const renderInlineCitationPill = (href, children) => {
    if (!href) {
      return <span className="message-link-fallback">{children}</span>;
    }

    let targetUrl = href;
    let matchedSource = null;
    let domain = '';

    if (href.startsWith('cite:')) {
      const citeNum = parseInt(href.substring(5), 10);
      if (sources && citeNum > 0 && citeNum <= sources.length) {
        matchedSource = sources[citeNum - 1];
        targetUrl = matchedSource.link || '#';
        domain = matchedSource.domain || '';
      }
    }

    if (!domain && targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      try {
        const parsed = new URL(targetUrl);
        domain = parsed.hostname.replace(/^www\./i, '');
      } catch (_e) {
        domain = '';
      }
    }

    if (!matchedSource && domain && sources && Array.isArray(sources)) {
      matchedSource = sources.find(s => {
        if (!s) return false;
        if (s.link && (s.link === targetUrl || targetUrl.startsWith(s.link) || s.link.startsWith(targetUrl))) return true;
        if (s.domain && s.domain.replace(/^www\./i, '').toLowerCase() === domain.toLowerCase()) return true;
        return false;
      });
    }

    if (!domain && !href.startsWith('cite:')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="message-link">
          {children}
        </a>
      );
    }

    const rawChildren = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
    const cleanChildren = String(rawChildren || '').trim();

    const isGeneric = !cleanChildren ||
      /^\[?sumber\s*\d*\]?$/i.test(cleanChildren) ||
      /^\[?\d+\]?$/.test(cleanChildren) ||
      cleanChildren.startsWith('http://') ||
      cleanChildren.startsWith('https://') ||
      cleanChildren.length > 25;

    let displayName = domain || 'Web';
    if (!isGeneric) {
      displayName = cleanChildren;
    } else if (matchedSource && matchedSource.domain) {
      displayName = matchedSource.domain.replace(/^www\./i, '');
    }

    const tooltipTitle = (matchedSource && matchedSource.title)
      ? `${matchedSource.title} • ${targetUrl}`
      : (cleanChildren && cleanChildren !== displayName ? `${cleanChildren} • ${targetUrl}` : targetUrl);

    const faviconDomain = domain || (matchedSource && matchedSource.domain ? matchedSource.domain.replace(/^www\./i, '') : '');
    const faviconUrl = faviconDomain ? `https://www.google.com/s2/favicons?sz=32&domain=${faviconDomain}` : '';

    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-citation-pill"
        title={tooltipTitle}
        onClick={(e) => e.stopPropagation()}
      >
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt=""
            className="inline-citation-favicon"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.inline-citation-fallback-icon');
              if (fallback) fallback.style.display = 'inline-block';
            }}
          />
        )}
        <svg
          className="inline-citation-fallback-icon"
          style={{ display: faviconUrl ? 'none' : 'inline-block' }}
          viewBox="0 0 24 24"
          width="12"
          height="12"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span className="inline-citation-text">{displayName}</span>
        <svg
          className="inline-citation-arrow"
          viewBox="0 0 24 24"
          width="9"
          height="9"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17"></path>
        </svg>
      </a>
    );
  };

  const renderCellContent = (cellText) => {
    if (!cellText) return '';

    const formulaRegex = /\\\(\s*([\s\S]*?)\s*\\\)|(?<!\$)(?<![`])\$(?!\$)([^$\n]+?)\$(?!\$)/g;

    if (formulaRegex.test(cellText)) {
      formulaRegex.lastIndex = 0;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = formulaRegex.exec(cellText)) !== null) {
        if (match.index > lastIndex) {
          const textPart = cellText.substring(lastIndex, match.index);
          parts.push(<span key={lastIndex}>{renderCellContent(textPart)}</span>);
        }
        const formula = match[1] || match[2];
        parts.push(<FormulaRenderer key={match.index} formula={formula.trim()} isBlock={false} />);
        lastIndex = formulaRegex.lastIndex;
      }
      if (lastIndex < cellText.length) {
        const textPart = cellText.substring(lastIndex);
        parts.push(<span key={lastIndex}>{renderCellContent(textPart)}</span>);
      }
      return <>{parts}</>;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => renderInlineCitationPill(href, children),
          code: ({ children }) => (
            <code className="inline-code">{children}</code>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="inline-markdown-image"
              onClick={() => handleImageClick?.(src, alt || 'Image')}
              style={{ cursor: 'pointer' }}
              title={userLanguage === 'id' ? 'Klik untuk memperbesar' : 'Click to enlarge'}
            />
          ),
          p: ({ children }) => <>{children}</>,
        }}
      >
        {cellText}
      </ReactMarkdown>
    );
  };

  const renderTableFromMarkdown = (tableText, key) => {
    const lines = tableText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;
    const headerLine = lines[0].replace(/^\||\|$/g, '');
    const headers = headerLine.split('|').map(h => h.trim());
    const dataLines = lines.slice(2);
    const rows = dataLines.map(line => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

    return (
      <div key={key} className="table-container">
        <table className="markdown-table">
          <thead>
            <tr>
              {headers.map((h, i) => <th key={i}>{renderCellContent(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {headers.map((_, ci) => <td key={ci}>{renderCellContent(r[ci] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  processedText = processedText.replace(/<\/?reasoning>/gi, '');
  processedText = processedText
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ');
  processedText = removeExecutionLogLines(processedText);

  if (isStreaming) {
    processedText = processedText.replace(/\[IMAGE_REQUEST:\s*.*?\]?/g, '');
  }

  let downloadUrl = null;
  let fileName = null;
  const downloadMatch = processedText.match(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):(.+):([^:]+):?([^\]]*)\]/);
  if (downloadMatch) {
    downloadUrl = downloadMatch[1];
    fileName = downloadMatch[2];
    processedText = processedText.replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[^\]]*\]\n*/g, '');
    processedText = processedText.replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]\n*/g, '');
    processedText = removeDownloadStatusLines(processedText);
  }

  const quizNode = parseQuizText(
    processedText,
    resolvedMessageId,
    quizSelectedAnswers,
    quizIsSubmitted,
    setQuizSelections,
    setQuizSubmitted
  );
  if (quizNode) return quizNode;

  const chartBlocks = [];

  processedText = processedText.replace(/\*\*(PIE CHART|BAR CHART|LINE CHART|RADAR|INFOGRAFIS)(.*?)(\n\n|(?=\n[A-Z*#]))/gi, (match, chartType, content) => {
    const chartIndex = chartBlocks.length;
    const dataStr = content.trim();
    const data = parseChartDataFromText(dataStr);

    if (data && data.length > 0) {
      const typeMap = {
        'PIE CHART': 'pie',
        'BAR CHART': 'bar',
        'LINE CHART': 'line',
        'RADAR': 'radar',
        'INFOGRAFIS': 'infographic'
      };

      chartBlocks.push({
        type: typeMap[chartType] || 'pie',
        data: data,
        title: chartType.toLowerCase().replace(' chart', '')
      });

      return `__CHART_BLOCK_${chartIndex}__\n\n`;
    }
    return match;
  });

  if (chartBlocks.length === 0 && (text.toLowerCase().includes('pie') || text.toLowerCase().includes('grafik') || text.toLowerCase().includes('statistik'))) {
    const chartType = detectChartType(text);
    if (chartType) {
      const data = parseChartDataFromText(text);
      if (data && data.length > 2) {
        chartBlocks.push({
          type: chartType,
          data: data,
          title: 'Statistik'
        });
        processedText = `__CHART_BLOCK_${chartBlocks.length - 1}__\n\n${processedText}`;
      }
    }
  }

  const tableBlocks = [];
  const isSeparatorLine = (str) => {
    const trimmed = String(str || '').trim();
    if (trimmed.length === 0) return false;
    if (!/^[\s|:\-]+$/.test(trimmed)) return false;
    if (!trimmed.includes('-')) return false;
    return true;
  };

  const tableLines = processedText.split('\n');
  let inTable = false;
  let inCodeBlock = false;
  let currentTableLines = [];
  const newLines = [];

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inTable) {
        const tableIndex = tableBlocks.length;
        tableBlocks.push(currentTableLines.join('\n'));
        newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
        inTable = false;
        currentTableLines = [];
      }
      newLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      newLines.push(line);
      continue;
    }

    const isTableLine = line.includes('|');
    if (isTableLine) {
      if (!inTable) {
        const nextLine = tableLines[i + 1];
        if (nextLine && isSeparatorLine(nextLine)) {
          inTable = true;
          currentTableLines = [line];
        } else {
          newLines.push(line);
        }
      } else {
        currentTableLines.push(line);
      }
    } else {
      if (inTable) {
        const tableIndex = tableBlocks.length;
        tableBlocks.push(currentTableLines.join('\n'));
        newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
        inTable = false;
        currentTableLines = [];
      }
      newLines.push(line);
    }
  }
  if (inTable) {
    const tableIndex = tableBlocks.length;
    tableBlocks.push(currentTableLines.join('\n'));
    newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
  }
  processedText = newLines.join('\n');

  const formulaBlocks = [];

  processedText = processedText.replace(/\\\[\s*([\s\S]*?)\s*\\\]|\$\$\s*([\s\S]*?)\s*\$\$/g, (match, latexBlock, dollarBlock) => {
    const formula = latexBlock || dollarBlock;
    const index = formulaBlocks.length;
    formulaBlocks.push({ type: 'block', formula: formula.trim() });
    return `__FORMULA_BLOCK_${index}__`;
  });

  processedText = processedText.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (match, latexInline) => {
    const formula = latexInline;
    const index = formulaBlocks.length;
    formulaBlocks.push({ type: 'inline', formula: formula.trim() });
    return `__FORMULA_BLOCK_${index}__`;
  });

  processedText = processedText.replace(/(?<!\$)(?<![`])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match, dollarInline) => {
    const formula = dollarInline.trim();
    if (!formula || formula.length < 2 || /^\d+$/.test(formula)) {
      return match;
    }
    const index = formulaBlocks.length;
    formulaBlocks.push({ type: 'inline', formula: formula });
    return `__FORMULA_BLOCK_${index}__`;
  });

  const codeBlocks = [];

  const normalizeMalformedFencedCode = (input) => {
    const pattern = /```([^\s`]+)(?:[ \t]+)?([\s\S]*?)```/gi;
    return input.replace(pattern, (match, lang, rest) => {
      const normalizedContent = rest.replace(/^[\s\r\n]+/, '');
      return `\`\`\`${lang}\n${normalizedContent}\`\`\``;
    });
  };

  processedText = normalizeMalformedFencedCode(processedText);

  processedText = processedText.replace(/```([^\s`]*)\s*\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ type: 'fenced', lang: lang || 'text', code: code.trim() });
    return `__CODE_BLOCK_${index}__`;
  });

  processedText = processedText.replace(/```([^\s`]*)\s*\n?([\s\S]*)$/gm, (match, lang, content) => {
    if (match.includes('__CODE_BLOCK_')) return match;
    const index = codeBlocks.length;

    let codeContent = content.startsWith('\n') ? content.substring(1) : content;
    if (codeContent.endsWith('\n```')) {
      codeContent = codeContent.slice(0, -4);
    } else if (codeContent.endsWith('\n``')) {
      codeContent = codeContent.slice(0, -3);
    } else if (codeContent.endsWith('\n`')) {
      codeContent = codeContent.slice(0, -2);
    } else if (codeContent.endsWith('```')) {
      codeContent = codeContent.slice(0, -3);
    } else if (codeContent.endsWith('``')) {
      codeContent = codeContent.slice(0, -2);
    } else if (codeContent.endsWith('`')) {
      codeContent = codeContent.slice(0, -1);
    }

    codeBlocks.push({
      type: 'fenced',
      lang: lang || 'text',
      code: codeContent.trim(),
      incomplete: true
    });
    return `__CODE_BLOCK_${index}__`;
  });

  processedText = processedText.replace(/`([^`\n]+?)`/g, (match, code) => {
    if (code.trim() === '' || /^```/.test(code)) return match;

    const index = codeBlocks.length;
    codeBlocks.push({ type: 'inline', code: code });
    return `__CODE_BLOCK_${index}__`;
  });

  let processedTextWithProtection = processedText;
  const placeholderMap = new Map();
  let placeholderCounter = 0;

  processedTextWithProtection = processedTextWithProtection.replace(/(__CODE_BLOCK_\d+__|__CHART_BLOCK_\d+__|__FORMULA_BLOCK_\d+__|__TABLE_BLOCK_\d+__|__IMAGE_REQUEST_BLOCK_\d+__)/g, (match) => {
    const safeMarker = `<<PLACEHOLDER_${placeholderCounter}>>`;
    placeholderMap.set(safeMarker, match);
    placeholderCounter++;
    return safeMarker;
  });

  let cleanedText = processedTextWithProtection
    .replace(/\n-{3,}\n/g, '\n\n---\n\n')
    .replace(/\n_{3,}\n/g, '\n\n---\n\n')
    .replace(/\n\*{3,}\n/g, '\n\n---\n\n')
    .trim();

  for (const [marker, original] of placeholderMap.entries()) {
    cleanedText = cleanedText.replace(marker, original);
  }

  cleanedText = cleanedText
    .replace(/\[STEP:\s*[^\]]+\]/gi, '')
    .replace(/\n-{3,}\n/g, '\n\n---\n\n')
    .replace(/\n_{3,}\n/g, '\n\n---\n\n')
    .replace(/\n\*{3,}\n/g, '\n\n---\n\n');

  const result = [];
  const parts = cleanedText.split(/(__CODE_BLOCK_\d+__|__CHART_BLOCK_\d+__|__FORMULA_BLOCK_\d+__|__TABLE_BLOCK_\d+__|__IMAGE_REQUEST_BLOCK_\d+__)/g);

  const renderMarkdownSegment = (markdownText, key) => {
    const cleanedNormalized = String(markdownText || '')
      .replace(/\[STEP:\s*[^\]]+\]/gi, '')
      .replace(/(\d+)\.(\S)/g, '$1. $2')
      .replace(/--\*\*/g, '')
      .replace(/\*\*--/g, '')
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (/^[-*_]{3,}$/.test(trimmed)) {
          return '---';
        }
        return line
          .replace(/--+/g, '-')
          .replace(/(?<=\S\s*)[-–—]+(?=\s*$)/g, '');
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/([^\n#])\n(#{1,6}\s+)/g, '$1\n\n$2')
      .replace(/([^\n])\n(\*\*(?:\d+[\.\)]|[A-Z][\.\)]|•|-|\*|[A-Za-z0-9\s]+:)[^*]+\*\*)/g, '$1\n\n$2');

    let preprocessedText = cleanedNormalized;
    if (sources && sources.length > 0) {
      preprocessedText = preprocessedText.replace(/\[Sumber\s*(\d+)\](?!\s*\()/gi, (match, num) => {
        const idx = parseInt(num, 10);
        if (idx > 0 && idx <= sources.length) {
          return `[${num}](cite:${num})`;
        }
        return match;
      });

      preprocessedText = preprocessedText.replace(/(?<!\[)\[(\d+)\](?!\s*\()(?!\])/g, (match, num) => {
        const idx = parseInt(num, 10);
        if (idx > 0 && idx <= sources.length) {
          return `[${num}](cite:${num})`;
        }
        return match;
      });
    }

    return (
      <div key={key} className="message-paragraph">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="ai-heading-1">{children}</h1>,
            h2: ({ children }) => <h2 className="ai-heading-2">{children}</h2>,
            h3: ({ children }) => <h3 className="ai-heading-3">{children}</h3>,
            h4: ({ children }) => <h4 className="ai-heading-4">{children}</h4>,
            p: ({ children }) => <p className="ai-paragraph">{children}</p>,
            strong: ({ children }) => {
              const txt = typeof children === 'string'
                ? children
                : (Array.isArray(children) && typeof children[0] === 'string' ? children[0] : '');
              const isPointTitle = /^(\d+[\.\)]|[A-Z][\.\)]|•|-|\*)\s+|.+:$/.test(String(txt).trim());
              return <strong className={`ai-strong ${isPointTitle ? 'ai-point-title' : ''}`}>{children}</strong>;
            },
            blockquote: ({ children }) => <blockquote className="ai-blockquote">{children}</blockquote>,
            hr: () => <hr className="ai-divider" />,
            a: ({ href, children }) => renderInlineCitationPill(href, children),
            code: ({ inline, className, children }) => {
              const match = /language-(\w+)/.exec(className || '');
              const rawCode = String(children || '').replace(/\n$/, '');
              if (!inline && (match || rawCode.includes('\n'))) {
                const lang = match ? match[1] : 'plaintext';
                return (
                  <CodeBlockHolder
                    code={cleanCodeBlock(rawCode, lang)}
                    language={lang}
                  />
                );
              }
              return <code className="inline-code">{children}</code>;
            },
            li: ({ children }) => <li className="message-list-item">{children}</li>,
            ul: ({ children }) => <ul className="message-list">{children}</ul>,
            ol: ({ children }) => <ol className="message-list">{children}</ol>,
            table: ({ children }) => <div className="table-container"><table className="markdown-table">{children}</table></div>,
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt}
                className="inline-markdown-image"
                onClick={() => handleImageClick?.(src, alt || 'Image')}
                style={{ cursor: 'pointer' }}
                title={userLanguage === 'id' ? 'Klik untuk memperbesar' : 'Click to enlarge'}
              />
            ),
          }}
        >
          {preprocessedText}
        </ReactMarkdown>
      </div>
    );
  };

  for (const part of parts) {
    const codeMatch = part.match(/__CODE_BLOCK_(\d+)__/);
    const chartMatch = part.match(/__CHART_BLOCK_(\d+)__/);
    const formulaMatch = part.match(/__FORMULA_BLOCK_(\d+)__/);
    const tableMatch = part.match(/__TABLE_BLOCK_(\d+)__/);
    const imageRequestMatch = part.match(/__IMAGE_REQUEST_BLOCK_(\d+)__/);

    if (formulaMatch) {
      const block = formulaBlocks[parseInt(formulaMatch[1], 10)];
      const formulaId = `formula-${formulaMatch[1]}`;

      result.push(
        <FormulaRenderer
          key={formulaId}
          formula={block.formula}
          isBlock={block.type === 'block'}
        />
      );
    } else if (tableMatch) {
      const tableIndex = parseInt(tableMatch[1], 10);
      const tableText = tableBlocks[tableIndex];
      const tableNode = renderTableFromMarkdown(tableText, `table-block-${tableIndex}`);
      if (tableNode) {
        result.push(tableNode);
      }
    } else if (codeMatch) {
      const block = codeBlocks[parseInt(codeMatch[1], 10)];
      if (block.type === 'fenced') {
        if (isMarkdownTableBlock(block.code)) {
          const tableNode = renderTableFromMarkdown(block.code, `table-code-${codeMatch[1]}`);
          if (tableNode) {
            result.push(tableNode);
            continue;
          }
        }

        const normalizeCodeLang = (lang) => {
          const l = String(lang || '').trim().toLowerCase();
          if (['javascript', 'js', 'jsx'].includes(l)) return 'javascript';
          if (['typescript', 'ts', 'tsx'].includes(l)) return 'typescript';
          if (['python', 'py'].includes(l)) return 'python';
          if (!l) return 'plaintext';
          return l.replace(/[^a-z0-9_-]/gi, '-');
        };
        const language = normalizeCodeLang(block.lang);
        const cleanedCode = cleanCodeBlock(block.code, language === 'plaintext' ? 'plaintext' : language);
        const codeBlockId = `code-${codeMatch[1]}`;
        const isIncomplete = block.incomplete === true;

        result.push(
          <CodeBlockHolder
            key={codeBlockId}
            code={cleanedCode}
            language={language}
            isIncomplete={isIncomplete}
            isStreaming={isStreaming}
            codeBlockId={codeBlockId}
          />
        );
      } else if (block.type === 'inline') {
        result.push(
          <code key={`inline-${codeMatch[1]}`} className="inline-code">
            {block.code}
          </code>
        );
      }
    } else if (chartMatch) {
      const chartData = chartBlocks[parseInt(chartMatch[1], 10)];
      if (chartData) {
        result.push(
          <ChartGenerator
            key={`chart-${chartMatch[1]}`}
            data={chartData.data}
            type={chartData.type}
            title={chartData.title}
          />
        );
      }
    } else if (imageRequestMatch) {
      const imageIndex = parseInt(imageRequestMatch[1], 10);
      const imageIdKey = `inline-image-${resolvedMessageId || 'x'}-${imageIndex}`;

      if (message) {
        const textImgMatch = message.text && (message.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/i) || message.text.match(/\[IMAGE_URL:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/i));
        const extractedUrlFromText = textImgMatch ? textImgMatch[1] : null;

        const specificUrl = message.imageUrls && message.imageUrls[imageIndex];
        const specificError = message.imageErrors && message.imageErrors[imageIndex];

        const imageUrl = specificUrl || (imageIndex === 0 ? (message.imageUrl || extractedUrlFromText) : null) || extractedUrlFromText;
        const imageError = specificError || (imageIndex === 0 ? message.imageError : null);

        if (imageUrl) {
          result.push(
            <div key={imageIdKey} className="message-image-container inline-image-block" style={{ margin: '15px 0', position: 'relative' }}>
              <img
                src={imageUrl}
                alt="Generated Image"
                className="message-image"
                onClick={() => handleImageClick?.(imageUrl, 'Generated Image', message.imageId)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                title={userLanguage === 'id' ? 'Klik untuk membesar' : 'Click to enlarge'}
              />
              <button
                type="button"
                className={`hd-upscale-btn ${hdUpscalingMap[imageUrl] ? 'loading' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleUpscaleHD?.(imageUrl, message.id); }}
                disabled={!!hdUpscalingMap[imageUrl]}
                title={userLanguage === 'id' ? 'Tingkatkan kualitas ke HD' : 'Upscale to HD'}
              >
                {hdUpscalingMap[imageUrl] ? (
                  <><i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> HD...</>
                ) : (
                  <><span className="hd-icon">HD</span></>
                )}
              </button>
            </div>
          );
        } else if (imageError) {
          result.push(
            <div key={imageIdKey} className="inline-image-error" style={{ color: '#ef4444', padding: '10px', border: '1px solid #fca5a5', borderRadius: '6px', margin: '10px 0', backgroundColor: '#fef2f2' }}>
              ⚠️ {imageError}
            </div>
          );
        } else {
          result.push(
            <div key={imageIdKey} className="image-thinking-state inline-image-loading" style={{ margin: '15px 0' }}>
              <div className="image-loading-dots-container">
                <div className={`image-loading-dots ${message?.imageGenPhase === 'responding' || message?.imageGenPhase === 'generating' ? 'speed-1x' : 'speed-2x'}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c' }}>
                  {userLanguage === 'id' ? 'Sedang menyusun dan merakit pixel gambar...' : 'Assembling and rendering image pixels...'}
                </span>
              </div>
            </div>
          );
        }
      } else {
        result.push(
          <div key={imageIdKey} className="image-thinking-state inline-image-loading" style={{ margin: '15px 0' }}>
            <div className="image-loading-dots-container">
              <div className="image-loading-dots speed-2x">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c' }}>
                {userLanguage === 'id' ? 'Sedang menyusun dan merakit pixel gambar...' : 'Assembling and rendering image pixels...'}
              </span>
            </div>
          </div>
        );
      }
    } else if (part.trim()) {
      const cleanPart = part
        .replace(/<<PLACEHOLDER_\d+>>/g, '')
        .replace(/__FORMULA_BLOCK_\d+__/g, '')
        .replace(/__CODE_BLOCK_\d+__/g, '')
        .replace(/__CHART_BLOCK_\d+__/g, '')
        .replace(/__IMAGE_REQUEST_BLOCK_\d+__/g, '')
        .trim();

      if (cleanPart) {
        const paragraphs = cleanPart.split(/\n\n+/);
        paragraphs.forEach((para, idx) => {
          if (!para.trim()) return;
          if (isMarkdownTableBlock(para)) {
            const tableNode = renderTableFromMarkdown(para.trim(), `table-${result.length}-${idx}`);
            if (tableNode) {
              result.push(tableNode);
              return;
            }
          }
          result.push(renderMarkdownSegment(para.trim(), `markdown-${result.length}-${idx}`));
        });
      }
    }
  }

  if (downloadUrl && fileName) {
    result.push(
      <div key="download-button" className="file-download-container" style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '18px' }}>📥</span>
        <a
          href={downloadUrl}
          download={fileName}
          className="download-file-button"
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'inline-block',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#2563eb'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = '#3b82f6'; }}
        >
          📩 Download: {fileName}
        </a>
      </div>
    );
  }

  if (redirectCards.length > 0) {
    redirectCards.forEach((card, idx) => {
      result.push(
        <AutoRedirectCountdownCard
          key={`auto-redirect-${idx}-${resolvedMessageId || 'm'}`}
          target={card.target}
          fileType={card.fileType}
          topic={card.topic}
          onNavigate={onNavigate}
          userLanguage={userLanguage}
        />
      );
    });
  }

  if (isStreaming) {
    result.push(
      <span key="streaming-blur-cursor" className="streaming-blur-cursor" aria-hidden="true">
        <span className="streaming-blur-glow" />
      </span>
    );
  }

  return <>{result}</>;
};

export const FormattedMessageBody = React.memo(({
  text,
  isStreaming = false,
  message = null,
  userLanguage = 'id',
  onNavigate,
  handleImageClick,
  handleUpscaleHD,
  hdUpscalingMap,
  quizSelectedAnswers,
  quizIsSubmitted,
  setQuizSelections,
  setQuizSubmitted
}) => {
  return useMemo(
    () =>
      formatMessageContent({
        text,
        isStreaming,
        message,
        messageId: message?.id,
        userLanguage,
        onNavigate,
        handleImageClick,
        handleUpscaleHD,
        hdUpscalingMap,
        quizSelectedAnswers,
        quizIsSubmitted,
        setQuizSelections,
        setQuizSubmitted
      }),
    [
      text,
      isStreaming,
      message?.id,
      message?.imageUrl,
      message?.imageUrls,
      message?.imageError,
      message?.imageErrors,
      message?.imageGenPhase,
      message?.searchSources,
      userLanguage,
      onNavigate,
      handleImageClick,
      handleUpscaleHD,
      hdUpscalingMap,
      quizSelectedAnswers,
      quizIsSubmitted,
      setQuizSelections,
      setQuizSubmitted
    ]
  );
});

