'use client';

import React, { useState } from 'react';

export default function ChatComponent() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle sending the message
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setUserMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch the chat response');
      }

      const data = await response.json();
      const assistantMessage = data?.choices[0]?.message?.content || 'Sorry, I didn’t get that.';

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      setError('Error occurred while fetching response.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="w-full max-w-2xl p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="flex flex-col space-y-4 text-white">
          <div className="flex flex-col space-y-2 overflow-y-auto max-h-[60vh] p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role} p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 self-end' : 'bg-gray-700 self-start'}`}>
                <p className="text-sm">
                  <strong>{msg.role === 'user' ? 'You' : 'Assistant'}: </strong>
                  {msg.content}
                </p>
              </div>
            ))}
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <div className="flex flex-col space-y-2">
            <textarea
              className="p-4 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Ask something..."
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg disabled:bg-gray-600"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
