import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BsFillChatDotsFill } from 'react-icons/bs'; 
import { IoClose, IoChevronDown, IoChevronUp, IoExpand } from 'react-icons/io5'; 
import { AnimatePresence } from 'framer-motion'; 
import {
  MinimizedChatbot,
  MessageWrapper,
  ChatContainer,
  Header,
  ButtonContainer,
  ControlButton,
  TypingStatus,
  MessageList,
  MessageContent,
  InputBar,
  UserInput,
  SendButton
} from '../assets/styling/chatbot/chatbot.style';

const Chatbot = () => {
  const [chatSize, setChatSize] = useState('small');
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageListRef = useRef(null);


  const scrollToBottom = () => {
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  const handleResize = () => {
    if (chatSize === 'small') {
      setChatSize('medium');
    } else if (chatSize === 'medium') {
      setChatSize('small');
    }
  };
  const handleMaximize = () => {
    if (chatSize === 'small' || chatSize === 'medium') {
      setChatSize('maximized');
    } else {
      setChatSize('medium');
    }
  };
  const sendMessage = async (content, role) => {
    setMessages((messages) => [...messages, { content, role }]);
  };
  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };


const apiUrl = 'https://wiki.ninj.ai/api/chat';

const chatWithAI = useCallback(async (messages) => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error communicating with server:', error);
    return 'Фатальная ошибка - Никакие токены не были списаны';
  }
}, []);
  

const handleSubmit = useCallback(
  async (e) => {
    e.preventDefault();

    if (userInput.trim() === '') return;

    sendMessage(userInput, 'user');
    setUserInput('');
    setIsTyping(true);

    const response = await chatWithAI([
      ...messages,
      { role: 'user', content: userInput },
    ]);

    setIsTyping(false);

    // Check if the response is an error message
    if (response.message) {
      // Handle the error message
      sendMessage(response.message, 'assistant');
    } else {
      // If it's not an error message, set it as the assistant's message
      sendMessage(response, 'assistant');
    }
  },
  [userInput, messages, chatWithAI]
);

  const Message = ({ message }) => (
    <MessageWrapper user={message.role === 'user'}>
      <MessageContent user={message.role === 'user'}>{message.content}</MessageContent>
    </MessageWrapper>
  );
  return (
    <AnimatePresence>
      {isMinimized ? (
        <MinimizedChatbot
          key="minimized"
          onClick={handleMinimize}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <BsFillChatDotsFill size={30} />
        </MinimizedChatbot>
      ) : (
        <ChatContainer
          key="opened"
          size={chatSize}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Header>
            <ButtonContainer>
              <ControlButton onClick={handleMinimize} red>
                <IoClose size={14} />
              </ControlButton>
              <ControlButton onClick={handleResize} yellow>
                {chatSize === 'maximized' ? (
                  <IoChevronUp size={14} />
                ) : (
                  <IoChevronDown size={14} />
                )}
              </ControlButton>
              <ControlButton onClick={handleMaximize} green>
                <IoExpand size={14} />
              </ControlButton>
            </ButtonContainer>
            <TypingStatus>
              {isTyping ? 'Бот печатает...' : ''}
            </TypingStatus>
          </Header>
          <MessageList ref={messageListRef}>
            {/* Map over the messages state variable and render a Message component for each one */}
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
          </MessageList>
          {/* Render the InputBar component with the appropriate size and onSubmit handler */}
          <InputBar size={chatSize} onSubmit={handleSubmit}>
            <UserInput
              type="text"
              value={userInput}
              onChange={handleUserInput}
              placeholder="Введите свой текст здесь..."
            />
            <SendButton type="submit">чат</SendButton>
          </InputBar>
        </ChatContainer>
      )}
    </AnimatePresence>
  );
};

export default Chatbot;