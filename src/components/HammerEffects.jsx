import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Gavel, AlertCircle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

const HammerEffects = ({ show, onComplete, type = 'SOLD' }) => {
    const hammerRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        if (show) {
            const tl = gsap.timeline({
                onComplete: () => {
                    setTimeout(onComplete, 800);
                }
            });

            // Initial state: Off-screen or scaled
            gsap.set(hammerRef.current, {
                y: type === 'CLOSING' ? 100 : -200,
                rotate: type === 'CLOSING' ? 0 : -30,
                scale: 0.5,
                opacity: 0,
                filter: 'blur(20px)'
            });

            tl.to(overlayRef.current, {
                opacity: 1,
                duration: 0.2,
            })
            .to(hammerRef.current, {
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                filter: 'blur(0px)',
                duration: 0.5,
                ease: "back.out(1.7)"
            });

            if (type === 'SOLD' || type === 'UNSOLD') {
                tl.to(hammerRef.current, {
                    scale: 1.1,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                })
                .to('body', {
                    x: 5,
                    duration: 0.05,
                    repeat: 5,
                    yoyo: true
                }, "-=0.1");
            }

            tl.to(overlayRef.current, {
                opacity: 0,
                duration: 0.4,
                delay: 1.2,
            });
        }
    }, [show, onComplete, type]);

    if (!show) return null;

    const config = {
        SOLD: { 
            icon: <CheckCircle2 className="w-10 h-10 text-green-500" />, 
            text: "SOLD!", 
            sub: "ASSET ACQUIRED", 
            color: "border-green-500/50 shadow-green-500/20",
            glow: "bg-green-500/20"
        },
        UNSOLD: { 
            icon: <XCircle className="w-10 h-10 text-red-500" />, 
            text: "UNSOLD", 
            sub: "RETURNED TO ROSTER", 
            color: "border-red-500/50 shadow-red-500/20",
            glow: "bg-red-500/20"
        },
        CLOSING: { 
            icon: <AlertCircle className="w-10 h-10 text-yellow-500 animate-pulse" />, 
            text: "CLOSING!", 
            sub: "HAMMER FALLING", 
            color: "border-yellow-500/50 shadow-yellow-500/20",
            glow: "bg-yellow-500/20"
        },
        OPEN: { 
            icon: <Sparkles className="w-10 h-10 text-primary animate-spin" />, 
            text: "ACTION!", 
            sub: "MARKET OPEN", 
            color: "border-primary/50 shadow-primary/20",
            glow: "bg-primary/20"
        }
    }[type] || { 
        icon: <Gavel className="w-10 h-10 text-primary" />, 
        text: "AUCTION", 
        sub: "SYNCHRONIZED", 
        color: "border-primary/50 shadow-primary/20",
        glow: "bg-primary/20"
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px] opacity-0">
            <div ref={hammerRef} className={`relative flex items-center gap-6 bg-black/80 backdrop-blur-2xl px-10 py-6 rounded-[32px] border ${config.color} shadow-2xl`}>
                <div className={`absolute inset-0 ${config.glow} blur-[50px] -z-10 rounded-full`} />
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                    {config.icon}
                </div>
                <div className="flex flex-col">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
                        {config.text}
                    </h1>
                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40 mt-2">
                        {config.sub}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HammerEffects;
