import React, { useState, useEffect } from 'react';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const sessionId = "spur_test_session_2"; // please enter a new seesion id here for testing as I didnt create a login or signin

  useEffect(() => {
    fetch(`http://localhost:3000/chat/history/${sessionId}`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error(err));
  }, []);

  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput(''); 
    setIsTyping(true);

    setMessages(prev => [...prev, { sender: 'user', text: userText }]);

    try {
      const response = await fetch('http://localhost:3000/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userText }),
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h3>Chat Window</h3>
      
<div style={{ border: '1px solid #999', height: '400px', overflowY: 'scroll', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
    {messages.length === 0 && !isTyping && (
        <div
        style={{
            textAlign: 'center',
            color: '#6b7280',
            marginTop: '170px'
        }}
        >
        Start a conversation with the AI
        </div>
    )}
  {messages.map((msg, index) => (
    <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '10px 0' }}>
      <span style={{ 
        background: msg.sender === 'user' ? '#3b82f6' : '#e5e7eb', 
        color: msg.sender === 'user' ? '#ffffff' : '#1f2937', 
        fontWeight: '500',
        padding: '8px 12px', 
        borderRadius: '8px', 
        display: 'inline-block',
        maxWidth: '75%',
        textAlign: 'left' 
      }}>
        {msg.text}
      </span>
    </div>
  ))}
  {isTyping && <p style={{ color: '#6b7280', fontStyle: 'italic' }}>AI is typing...</p>}
</div>
      <form onSubmit={handleSend}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          disabled={isTyping} 
          style={{ width: '80%', padding: '8px' }}
        />
        <button type="submit" disabled={isTyping} style={{ width: '18%', padding: '8px', marginLeft: '2%' }}>
          Send
        </button>
      </form>
    </div>
  );
}