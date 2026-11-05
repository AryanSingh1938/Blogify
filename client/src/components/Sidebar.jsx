import { useMemo, useState } from "react";
import {
    LogOut,
    MessageCircle,
    Search,
    Users,
    Circle
} from "lucide-react";

const getOtherParticipant = (conversation, currentUserId) =>
    conversation.participants?.find(
        (participant) => participant._id !== currentUserId
    );

const getInitials = (name = "?") =>
    name.slice(0, 2).toUpperCase();

const Sidebar = ({
    user,
    users,
    conversations,
    selectedChat,
    onlineUsers,
    onSelectUser,
    onSelectChat,
    onLogout
}) => {
    const [search, setSearch] = useState("");

    const filteredUsers = useMemo(
        () =>
            users.filter((person) =>
                person.username.toLowerCase().includes(search.toLowerCase())
            ),
        [users, search]
    );

    const filteredChats = useMemo(
        () =>
            conversations.filter((chat) => {
                const person = getOtherParticipant(chat, user._id);
                return person?.username
                    .toLowerCase()
                    .includes(search.toLowerCase());
            }),
        [conversations, user._id, search]
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="brand-icon">
                    <MessageCircle size={22} />
                </span>
                <span>Connectly</span>
                <span className="brand-dot" />
            </div>

            <div className="profile-card">
                <div className="avatar avatar-profile">
                    {getInitials(user.username)}
                    <span className="online-indicator" />
                </div>

                <div className="profile-details">
                    <strong>{user.username}</strong>
                    <span>My account</span>
                </div>

                <button
                    className="icon-button logout-button"
                    onClick={onLogout}
                    title="Log out"
                    aria-label="Log out"
                >
                    <LogOut size={18} />
                </button>
            </div>

            <div className="sidebar-search">
                <Search size={17} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people..."
                    aria-label="Search people"
                />
            </div>

            <div className="sidebar-section">
                <div className="section-heading">
                    <span>CONVERSATIONS</span>
                    <span className="count-pill">{filteredChats.length}</span>
                </div>

                <div className="sidebar-list">
                    {filteredChats.map((chat) => {
                        const person = getOtherParticipant(chat, user._id);
                        if (!person) return null;

                        const active = selectedChat?._id === chat._id;
                        const isOnline = onlineUsers.has(person._id);

                        return (
                            <button
                                key={chat._id}
                                className={`person-row ${active ? "active" : ""}`}
                                onClick={() => onSelectChat(chat)}
                            >
                                <div className="avatar">
                                    {getInitials(person.username)}
                                    {isOnline && <span className="online-indicator" />}
                                </div>

                                <div className="person-details">
                                    <strong>{person.username}</strong>
                                    <span>{isOnline ? "Online" : "Offline"}</span>
                                </div>

                                {active && <span className="active-marker" />}
                            </button>
                        );
                    })}

                    {filteredChats.length === 0 && (
                        <p className="sidebar-empty">
                            No conversations yet. Start one below.
                        </p>
                    )}
                </div>
            </div>

            <div className="sidebar-section people-section">
                <div className="section-heading">
                    <span><Users size={14} /> PEOPLE</span>
                    <span className="count-pill">{filteredUsers.length}</span>
                </div>

                <div className="sidebar-list">
                    {filteredUsers.map((person) => {
                        const isOnline = onlineUsers.has(person._id);

                        return (
                            <button
                                key={person._id}
                                className="person-row"
                                onClick={() => onSelectUser(person)}
                            >
                                <div className="avatar">
                                    {getInitials(person.username)}
                                    {isOnline && <span className="online-indicator" />}
                                </div>

                                <div className="person-details">
                                    <strong>{person.username}</strong>
                                    <span>
                                        {isOnline ? (
                                            <>
                                                <Circle
                                                    size={7}
                                                    fill="currentColor"
                                                    className="online-text-icon"
                                                />
                                                Online
                                            </>
                                        ) : (
                                            "Start a conversation"
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}

                    {filteredUsers.length === 0 && (
                        <p className="sidebar-empty">
                            No other users found.
                        </p>
                    )}
                </div>
            </div>

            <div className="sidebar-bottom">
                <span className="connection-dot" />
                <span>Your space to connect</span>
                <span className="version-label">V1.0</span>
            </div>
        </aside>
    );
};

export default Sidebar;