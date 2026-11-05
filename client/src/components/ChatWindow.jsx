import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle,
    Send,
    Smile
} from "lucide-react";

import api from "../services/api";

const getOtherParticipant = (conversation, currentUserId) =>
    conversation.participants?.find(
        (person) => person._id !== currentUserId
    );

const getInitials = (name = "?") =>
    name.slice(0, 2).toUpperCase();

const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

const ChatWindow = ({
    conversation,
    user,
    socket,
    onlineUsers,
    onBack
}) => {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState("");
    const [typingState, setTypingState] = useState({
        conversationId: null,
        users: []
    });

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const conversationId = conversation?._id;

    const person = conversation
        ? getOtherParticipant(conversation, user._id)
        : null;

    useEffect(() => {
        if (!conversationId || !socket) return;

        let cancelled = false;
        setMessages([]);
        setLoading(true);
        setJoined(false);
        setError("");

        const handleNewMessage = (message) => {
            const messageChatId = String(
                message.conversation?._id || message.conversation
            );

            if (messageChatId !== conversationId) return;

            setMessages((previous) => {
                if (previous.some((item) => item._id === message._id)) {
                    return previous;
                }

                return [...previous, message];
            });

            const senderId = String(message.sender?._id || message.sender);
            if (senderId !== String(user._id)) {
                socket.emit("message_delivered", {
                    messageId: message._id,
                    chatId: conversationId
                });
            }
        };

        socket.on("new_message", handleNewMessage);

        socket.emit("join_chat", conversationId, (result) => {
            if (cancelled) return;

            if (result?.success) {
                setJoined(true);
            } else {
                setError(result?.message || "Unable to join conversation");
            }
        });

        const loadMessages = async () => {
            try {
                const response = await api.get(
                    `/chats/${conversationId}/messages`
                );

                if (!cancelled) {
                    setMessages(response.data.messages);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load messages"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadMessages();

        return () => {
            cancelled = true;
            socket.off("new_message", handleNewMessage);
        };
    }, [conversationId, socket, user._id]);

    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdated = ({ messageId, status } = {}) => {
            setMessages((previous) =>
                previous.map((message) =>
                    String(message._id) === String(messageId)
                        ? { ...message, status }
                        : message
                )
            );
        };

        socket.on("message_status_updated", handleStatusUpdated);

        return () => {
            socket.off("message_status_updated", handleStatusUpdated);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("message_read", {
            chatId: conversationId
        });
    }, [socket, conversationId]);

    useEffect(() => {
        if (!conversationId || !socket) return;

        const handleUserTyping = ({ userId, chatId } = {}) => {
            if (
                String(userId) === String(user._id) ||
                chatId !== conversationId
            ) {
                return;
            }

            setTypingState((previous) => {
                const users =
                    previous.conversationId === conversationId
                        ? previous.users
                        : [];

                return {
                    conversationId,
                    users: users.includes(userId) ? users : [...users, userId]
                };
            });
        };

        const handleUserStopTyping = ({ userId, chatId } = {}) => {
            if (chatId !== conversationId) return;

            setTypingState((previous) => ({
                conversationId,
                users:
                    previous.conversationId === conversationId
                        ? previous.users.filter((id) => id !== userId)
                        : []
            }));
        };

        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);

        return () => {
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
        };
    }, [conversationId, socket, user._id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const stopTyping = () => {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;

        if (!isTypingRef.current) return;

        isTypingRef.current = false;
        if (socket?.connected && conversationId) {
            socket.emit("stop_typing", { chatId: conversationId });
        }
    };

    useEffect(
        () => () => {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;

            if (isTypingRef.current && socket?.connected && conversationId) {
                socket.emit("stop_typing", { chatId: conversationId });
            }

            isTypingRef.current = false;
        },
        [conversationId, socket]
    );

    const handleTyping = (value) => {
        setText(value);

        if (!conversationId || !socket?.connected || !joined) return;

        clearTimeout(typingTimeoutRef.current);

        if (!value.trim()) {
            stopTyping();
            return;
        }

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit("typing", { chatId: conversationId });
        }

        typingTimeoutRef.current = setTimeout(stopTyping, 1000);
    };

    const handleSend = (event) => {
        event.preventDefault();

        const messageText = text.trim();

        if (!messageText || !joined || !socket?.connected) return;

        stopTyping();
        setError("");

        socket.emit(
            "send_message",
            {
                chatId: conversationId,
                text: messageText
            },
            (result) => {
                if (!result?.success) {
                    setError(result?.message || "Message could not be sent");
                }
            }
        );

        setText("");
        inputRef.current?.focus();
    };

    if (!conversation || !person) {
        return (
            <main className="empty-chat">
                <div className="empty-chat-art">
                    <MessageCircle size={44} />
                </div>
                <span className="eyebrow">YOUR CONVERSATIONS</span>
                <h1>A little hello goes a long way.</h1>
                <p>
                    Choose someone from the sidebar to start your first
                    conversation.
                </p>
                <div className="empty-chat-note">
                    <span className="connection-dot" />
                    Private conversations, in real time.
                </div>
            </main>
        );
    }

    const isOnline = onlineUsers.has(person._id);
    const typingUsers =
        typingState.conversationId === conversationId
            ? typingState.users
            : [];
    const isOtherUserTyping = typingUsers.length > 0;

    return (
        <main className="chat-window">
            <header className="chat-header">
                <button
                    className="icon-button mobile-back"
                    onClick={onBack}
                    aria-label="Back to conversations"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="avatar avatar-large">
                    {getInitials(person.username)}
                    {isOnline && <span className="online-indicator" />}
                </div>

                <div className="chat-header-info">
                    <h2>{person.username}</h2>
                    <span className={isOnline ? "status-online" : ""}>
                        <span className="status-dot" />
                        {isOtherUserTyping
                            ? "Typing..."
                            : isOnline
                                ? "Online now"
                                : "Offline"}
                    </span>
                </div>

                <div className="chat-header-label">
                    <span className="secure-dot" />
                    Private chat
                </div>
            </header>

            <div className="messages-area">
                <div className="conversation-intro">
                    <div className="avatar avatar-intro">
                        {getInitials(person.username)}
                    </div>
                    <h3>{person.username}</h3>
                    <p>
                        This is the beginning of your conversation.
                    </p>
                </div>

                {loading ? (
                    <div className="messages-loading">
                        Loading messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="first-message">
                        <Smile size={18} />
                        <span>Say hello and break the ice!</span>
                    </div>
                ) : (
                    <div className="message-list">
                        {messages.map((message, index) => {
                            const senderId = String(
                                message.sender?._id || message.sender
                            );

                            const isMine = senderId === String(user._id);

                            const previous = messages[index - 1];
                            const sameSender =
                                previous &&
                                String(
                                    previous.sender?._id || previous.sender
                                ) === senderId;

                            return (
                                <div
                                    key={message._id}
                                    className={`message-row ${
                                        isMine ? "message-mine" : "message-theirs"
                                    }`}
                                >
                                    {!isMine && !sameSender && (
                                        <div className="message-avatar">
                                            {getInitials(person.username)}
                                        </div>
                                    )}

                                    {!isMine && sameSender && (
                                        <div className="message-avatar-placeholder" />
                                    )}

                                    <div className="message-content">
                                        {!isMine && !sameSender && (
                                            <span className="message-sender">
                                                {message.sender?.username ||
                                                    person.username}
                                            </span>
                                        )}

                                        <div className="message-bubble">
                                            {message.text}
                                        </div>

                                        <div className="message-meta">
                                            <span>{formatTime(message.createdAt)}</span>
                                            {isMine && (
                                                <span
                                                    className={`message-status ${message.status || "sent"}`}
                                                >
                                                    {message.status === "read" ||
                                                    message.status === "delivered"
                                                        ? "✓✓"
                                                        : "✓"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}

                {isOtherUserTyping && (
                    <div className="typing-indicator-pill" aria-live="polite">
                        <span className="dot dot-1" />
                        <span className="dot dot-2" />
                        <span className="dot dot-3" />
                        <span>{person.username} is typing</span>
                    </div>
                )}
            </div>

            <div className="composer-wrapper">
                {error && <p className="inline-error">{error}</p>}

                <form className="message-composer" onSubmit={handleSend}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={(event) => handleTyping(event.target.value)}
                        placeholder={`Message ${person.username}...`}
                        maxLength={5000}
                        aria-label="Write a message"
                        disabled={!joined || loading}
                    />

                    <span className="composer-hint">Enter to send</span>

                    <button
                        className="send-button"
                        type="submit"
                        disabled={!text.trim() || !joined || loading}
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </form>

                <p className="composer-caption">
                    <span className="connection-dot" />
                    Your conversations are saved automatically.
                </p>
            </div>
        </main>
    );
};

export default ChatWindow;