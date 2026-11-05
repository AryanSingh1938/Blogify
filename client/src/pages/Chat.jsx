import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket, getSocket } from "../services/socket";

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

const Chat = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mobileChatOpen, setMobileChatOpen] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [usersResponse, chatsResponse] = await Promise.all([
                api.get("/users"),
                api.get("/chats")
            ]);

            setUsers(usersResponse.data.users);
            setConversations(chatsResponse.data.conversations);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load your conversations"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const currentSocket = getSocket();

        setSocket(currentSocket);

        const handleOnlineUsers = (userIds) => {
            setOnlineUsers(new Set(userIds));
        };

        const handleOnline = ({ userId }) => {
            setOnlineUsers((previous) => {
                const next = new Set(previous);
                next.add(userId);
                return next;
            });
        };

        const handleOffline = ({ userId }) => {
            setOnlineUsers((previous) => {
                const next = new Set(previous);
                next.delete(userId);
                return next;
            });
        };

        currentSocket.on("online_users", handleOnlineUsers);
        currentSocket.on("user_online", handleOnline);
        currentSocket.on("user_offline", handleOffline);
        currentSocket.connect();

        return () => {
            currentSocket.off("online_users", handleOnlineUsers);
            currentSocket.off("user_online", handleOnline);
            currentSocket.off("user_offline", handleOffline);
            disconnectSocket();
        };
    }, []);

    const handleSelectUser = async (person) => {
        setError("");

        try {
            const response = await api.post("/chats", {
                userId: person._id
            });

            const conversation = response.data.conversation;

            setConversations((previous) => [
                conversation,
                ...previous.filter(
                    (chat) => chat._id !== conversation._id
                )
            ]);

            setSelectedChat(conversation);
            setMobileChatOpen(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to open this conversation"
            );
        }
    };

    const handleSelectChat = (conversation) => {
        setSelectedChat(conversation);
        setMobileChatOpen(true);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate("/login", { replace: true });
        }
    };

    return (
        <main className="chat-app">
            <div
                className={`chat-layout ${
                    mobileChatOpen ? "mobile-chat-open" : ""
                }`}
            >
                <Sidebar
                    user={user}
                    users={users}
                    conversations={conversations}
                    selectedChat={selectedChat}
                    onlineUsers={onlineUsers}
                    onSelectUser={handleSelectUser}
                    onSelectChat={handleSelectChat}
                    onLogout={handleLogout}
                />

                <section className="chat-main">
                    {error && (
                        <div className="global-error">
                            <span>{error}</span>
                            <button onClick={() => setError("")}>Dismiss</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="page-loader">
                            Loading your conversations...
                        </div>
                    ) : (
                        <ChatWindow
                            conversation={selectedChat}
                            user={user}
                            socket={socket}
                            onlineUsers={onlineUsers}
                            onBack={() => setMobileChatOpen(false)}
                        />
                    )}
                </section>
            </div>
        </main>
    );
};

export default Chat;