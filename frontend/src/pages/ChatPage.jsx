import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, RefreshCw } from '../components/Icons';
import { useParams } from 'react-router-dom';

const ChatPage = () => {
  const { partnerId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState(null);
  const [botTyping, setBotTyping] = useState(false);
  const { profile } = useAuth();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping]);

  const fetchConversation = async () => {
    try {
      const res = await api.get(`/api/chat/conversation/${partnerId}`);
      setMessages(res.data.messages || []);
      setPartner(res.data.partner);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
      alert(err.response?.data?.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [partnerId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const res = await api.post(`/api/chat/message/${partnerId}`, { content: messageText });

      // Add user's message immediately
      const userMessage = res.data.message;
      setMessages(prev => [...prev, userMessage]);

      // Handle bot response with typing simulation
      if (res.data.bot_response) {
        setBotTyping(true);
        setTimeout(() => {
          const botMessage = {
            id: Date.now(),
            sender_id: partner?.id,
            receiver_id: profile?.id,
            content: res.data.bot_response.content,
            is_bot: true,
            created_at: new Date().toISOString(),
            is_read: true
          };
          setMessages(prev => [...prev, botMessage]);
          setBotTyping(false);
        }, res.data.bot_response.delay);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewMessage = (e) => {
    setNewMessage(e.target.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Chat Header */}
        <div className="card mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {partner?.photo_url ? (
              <img src={partner.photo_url} alt={partner.full_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold">
                {partner?.full_name?.[0] || '?'}
              </div>
            )}
            <div>
              <h2 className="font-bold text-text flex items-center gap-2">
                {partner?.full_name || 'Partner'}
                {partner?.is_bot && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    AI Companion
                  </span>
                )}
              </h2>
              <p className="text-sm text-text-secondary">
                {partner?.is_bot ? 'Always online' : 'Active now'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchConversation}
            className="p-2 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-border h-[500px] overflow-y-auto p-4 mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Say hello to start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === profile?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-gradient-to-r from-primary to-primary-700 text-white chat-bubble-sent'
                        : 'bg-gray-100 text-gray-800 chat-bubble-received'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className="flex justify-end mt-1">
                        <span className={`text-xs opacity-70 ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {botTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 chat-bubble-received px-4 py-2.5 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleNewMessage}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>

        {/* AI Companion Notice */}
        {partner?.is_bot && (
          <div className="mt-3 text-center text-xs text-text-secondary">
            You're chatting with an AI companion. Responses are automated and based on your profile.
            Real human profiles will be introduced as our community grows.
          </div>
        )}
      </div>
    </div>
  );
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffHrs = (now - date) / (1000 * 60 * 60);

  if (diffHrs < 1) {
    const mins = Math.floor((now - date) / (1000 * 60));
    return `${mins}m ago`;
  } else if (diffHrs < 24) {
    return `${Math.floor(diffHrs)}h ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export default ChatPage;
