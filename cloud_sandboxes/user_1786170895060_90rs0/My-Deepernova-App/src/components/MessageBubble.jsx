import React from 'react';

export default function MessageBubble({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isUser && (
        <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm mr-2 self-end">
          🤖
        </div>
      )}
      <div
        className={`
          max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-slate-700 text-slate-100 rounded-bl-md'}
        `}
      >
        {message.text}
        <div className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
          {message.time}
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center text-sm ml-2 self-end">
          😊
        </div>
      )}
    </div>
  );
}