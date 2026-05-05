import React, { useState, useRef, useEffect } from 'react';
import { chatApi, ChatProperty } from '../api/chat';
import { formatPrice } from '../utils/format';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  properties?: ChatProperty[];
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Chào bạn! Mình là trợ lý AI thông minh của hệ thống. Bạn muốn tìm nhà như thế nào? (Ví dụ: "Tôi muốn tìm nhà 3 phòng ngủ ở Richmond giá dưới 1 triệu đô")',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(userMessage.text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.reply,
        properties: response.properties,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Xin lỗi, hệ thống AI đang gặp sự cố hoặc chưa cấu hình API Key. Bạn vui lòng kiểm tra lại backend nhé!',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="text-2xl mr-2">🤖</span>
            Trợ lý ảo AI
          </h2>
          <p className="text-blue-100 text-sm mt-1">Tìm kiếm bất động sản bằng ngôn ngữ tự nhiên</p>
        </div>

        {/* Chat area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`px-4 py-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Display property cards if any */}
              {msg.properties && msg.properties.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-[300px]">
                  {msg.properties.map((p) => (
                    <Link
                      to={`/properties/${p.id}`}
                      key={p.id}
                      className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <img src={p.image_url} alt={p.title} className="w-full h-24 object-cover" />
                      <div className="p-3">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{p.title}</h4>
                        <p className="text-blue-600 font-bold text-sm mt-1">{formatPrice(p.price)}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-2 gap-2">
                          <span className="flex items-center">🛏️ {p.rooms}</span>
                          <span className="flex items-center">🛁 {p.bathrooms}</span>
                          <span className="flex items-center">📍 {p.suburb}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="self-start max-w-[80%] flex items-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu tìm nhà của bạn..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
