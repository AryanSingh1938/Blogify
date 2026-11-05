import { useEffect, useRef } from "react";
import {
    CheckCheck,
    MessageCircle,
    Mic,
    Sparkles,
    Zap,
    Users,
    ShieldCheck
} from "lucide-react";

const AuthBackgroundAnimation = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);

        // Network nodes representing active chat participants & connections
        const nodeCount = Math.min(38, Math.max(18, Math.floor((width * height) / 35000)));
        const colors = ["#7388ff", "#8c9cff", "#46d5a0", "#38bdf8", "#a78bfa"];

        const nodes = Array.from({ length: nodeCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.55,
            vy: (Math.random() - 0.5) * 0.55,
            radius: Math.random() * 2.2 + 1.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.03 + Math.random() * 0.02
        }));

        // Packets (messages) moving along connections
        const packets = [];
        const maxPackets = 14;

        let mouse = { x: -1000, y: -1000 };
        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);

        const spawnPacket = (from, to, color) => {
            if (packets.length >= maxPackets) return;
            packets.push({
                x1: from.x,
                y1: from.y,
                x2: to.x,
                y2: to.y,
                progress: 0,
                speed: 0.008 + Math.random() * 0.012,
                color: color || "#8c9cff",
                size: Math.random() * 2 + 1.8
            });
        };

        let lastSpawn = 0;

        const render = (time) => {
            ctx.clearRect(0, 0, width, height);

            // Update & draw nodes
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                node.x += node.vx;
                node.y += node.vy;

                // Bounce softly off borders
                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;

                // Subtle cursor avoidance / attraction
                const dxMouse = mouse.x - node.x;
                const dyMouse = mouse.y - node.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                if (distMouse < 140 && distMouse > 0) {
                    const force = (140 - distMouse) / 140;
                    node.x -= (dxMouse / distMouse) * force * 0.8;
                    node.y -= (dyMouse / distMouse) * force * 0.8;
                }

                node.pulse += node.pulseSpeed;
                const currentRadius = node.radius + Math.sin(node.pulse) * 0.8;

                // Glow ring
                ctx.beginPath();
                ctx.arc(node.x, node.y, currentRadius * 2.8, 0, Math.PI * 2);
                ctx.fillStyle = node.color + "18";
                ctx.fill();

                // Core node
                ctx.beginPath();
                ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.shadowColor = node.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Draw connections
                for (let j = i + 1; j < nodes.length; j++) {
                    const other = nodes[j];
                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 170;

                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.22;
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(130, 150, 255, ${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Occasionally spawn a chat packet
                        if (time - lastSpawn > 260 && Math.random() < 0.015) {
                            spawnPacket(node, other, node.color);
                            lastSpawn = time;
                        }
                    }
                }
            }

            // Update & draw message packets (representing real-time data packets)
            for (let p = packets.length - 1; p >= 0; p--) {
                const pkt = packets[p];
                pkt.progress += pkt.speed;

                if (pkt.progress >= 1) {
                    packets.splice(p, 1);
                    continue;
                }

                const px = pkt.x1 + (pkt.x2 - pkt.x1) * pkt.progress;
                const py = pkt.y1 + (pkt.y2 - pkt.y1) * pkt.progress;

                ctx.beginPath();
                ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
                ctx.fillStyle = pkt.color;
                ctx.shadowColor = pkt.color;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div className="auth-anim-container" aria-hidden="true">
            {/* Ambient Background Gradient Auroras */}
            <div className="auth-aurora auth-aurora-1" />
            <div className="auth-aurora auth-aurora-2" />
            <div className="auth-aurora auth-aurora-3" />

            {/* Subtle Chat Grid Overlay */}
            <div className="auth-mesh-grid" />

            {/* Interactive Canvas Graph */}
            <canvas ref={canvasRef} className="auth-anim-canvas" />

            {/* Floating Live Chat Conversation Bubbles */}
            <div className="auth-floating-elements">
                {/* Bubble 1: Incoming message (Top Left) */}
                <div className="auth-float-bubble bubble-top-left float-slow">
                    <div className="bubble-avatar avatar-emerald">
                        <span>SL</span>
                        <span className="bubble-status-dot online" />
                    </div>
                    <div className="bubble-body">
                        <div className="bubble-header">
                            <span className="bubble-sender">Sarah Lin</span>
                            <span className="bubble-time">Just now</span>
                        </div>
                        <p className="bubble-msg">
                            Hey! Did you test the new real-time chat? It feels instant! 🚀
                        </p>
                        <div className="bubble-reactions">
                            <span className="reaction-chip">🔥 4</span>
                            <span className="reaction-chip">❤️ 2</span>
                        </div>
                    </div>
                </div>

                {/* Bubble 2: Audio message (Top Right) */}
                <div className="auth-float-bubble bubble-top-right float-reverse">
                    <div className="bubble-avatar avatar-indigo">
                        <span>DK</span>
                        <span className="bubble-status-dot online" />
                    </div>
                    <div className="bubble-body">
                        <div className="bubble-header">
                            <span className="bubble-sender">David Kim</span>
                            <span className="bubble-time">1m ago</span>
                        </div>
                        <div className="bubble-audio-pill">
                            <Mic size={14} className="audio-icon" />
                            <div className="bubble-audio-wave">
                                <span className="bar bar-1" />
                                <span className="bar bar-2" />
                                <span className="bar bar-3" />
                                <span className="bar bar-4" />
                                <span className="bar bar-5" />
                                <span className="bar bar-6" />
                            </div>
                            <span className="audio-duration">0:18</span>
                        </div>
                        <div className="bubble-receipt">
                            <CheckCheck size={14} className="check-read" />
                            <span>Delivered</span>
                        </div>
                    </div>
                </div>

                {/* Bubble 3: Active Typing Indicator (Bottom Left) */}
                <div className="auth-float-bubble bubble-bottom-left float-medium">
                    <div className="bubble-avatar avatar-purple">
                        <span>EM</span>
                        <span className="bubble-status-dot typing-pulse" />
                    </div>
                    <div className="bubble-body">
                        <div className="bubble-header">
                            <span className="bubble-sender">Elena Rostova</span>
                            <span className="bubble-status-label">typing</span>
                        </div>
                        <div className="typing-indicator-pill">
                            <span className="dot dot-1" />
                            <span className="dot dot-2" />
                            <span className="dot dot-3" />
                        </div>
                    </div>
                </div>

                {/* Bubble 4: Sent Message with Read Receipt (Bottom Right) */}
                <div className="auth-float-bubble bubble-bottom-right float-slow-alt">
                    <div className="bubble-avatar avatar-cyan">
                        <span>AR</span>
                        <span className="bubble-status-dot online" />
                    </div>
                    <div className="bubble-body">
                        <div className="bubble-header">
                            <span className="bubble-sender">Alex Rivera</span>
                            <span className="bubble-time">2m ago</span>
                        </div>
                        <p className="bubble-msg">
                            Connecting with everyone in seconds. Love this interface! ✨
                        </p>
                        <div className="bubble-receipt">
                            <CheckCheck size={14} className="check-read" />
                            <span>Read</span>
                        </div>
                    </div>
                </div>

                {/* Live Floating Status Pills */}
                <div className="auth-status-pill pill-top float-fast">
                    <span className="status-live-beacon" />
                    <Zap size={13} className="pill-icon accent" />
                    <span>WebSocket Connected</span>
                    <span className="latency-badge">18ms</span>
                </div>

                <div className="auth-status-pill pill-bottom float-gentle">
                    <Users size={13} className="pill-icon green" />
                    <span>2,840 Active Members</span>
                </div>

                <div className="auth-status-pill pill-side-right float-reverse-slow">
                    <ShieldCheck size={13} className="pill-icon purple" />
                    <span>End-to-End Encrypted</span>
                </div>

                {/* Drifting Floating Chat Reaction Badges */}
                <div className="auth-float-emoji emoji-1 float-drift-1">
                    <MessageCircle size={16} />
                </div>
                <div className="auth-float-emoji emoji-2 float-drift-2">
                    <Sparkles size={16} />
                </div>
                <div className="auth-float-emoji emoji-3 float-drift-3">
                    💬
                </div>
                <div className="auth-float-emoji emoji-4 float-drift-4">
                    ⚡
                </div>
                <div className="auth-float-emoji emoji-5 float-drift-5">
                    💙
                </div>
            </div>
        </div>
    );
};

export default AuthBackgroundAnimation;

