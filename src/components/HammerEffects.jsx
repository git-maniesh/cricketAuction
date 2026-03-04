import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Gavel } from 'lucide-react';

const HammerEffects = ({ show, onComplete, type = 'SOLD' }) => {
    const hammerRef = useRef(null);
    const overlayRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (show) {
            const tl = gsap.timeline({
                onComplete: () => {
                    setTimeout(onComplete, 1000);
                }
            });

            // Initial state: Hammer high and rotated
            gsap.set(hammerRef.current, {
                y: -500,
                rotate: -45,
                scale: 2,
                opacity: 0,
                filter: 'blur(10px)'
            });

            tl.to(overlayRef.current, {
                opacity: 1,
                duration: 0.2,
                ease: "power2.out"
            })
                .to(hammerRef.current, {
                    opacity: 1,
                    y: 0,
                    rotate: 0,
                    scale: 1,
                    filter: 'blur(0px)',
                    duration: 0.4,
                    ease: "back.in(1.7)"
                })
                // Slam impact shake
                .to(hammerRef.current, {
                    y: 20,
                    duration: 0.05,
                    repeat: 1,
                    yoyo: true
                })
                .to('body', {
                    x: 10,
                    duration: 0.05,
                    repeat: 3,
                    yoyo: true,
                    ease: "power2.inOut"
                }, "-=0.1")
                .to(overlayRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    delay: 1,
                    ease: "power2.in"
                });
        }
    }, [show, onComplete]);

    if (!show) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none opacity-0"
        >
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/40 rounded-full blur-[20px] animate-pulse" />

                <div ref={hammerRef} className="relative z-10 flex flex-col items-center">
                    <div className="w-48 h-48 bg-surface-dark border-4 border-primary rounded-[48px] flex items-center justify-center shadow-[0_0_80px_rgba(234,42,51,0.4)]">
                        <Gavel className="w-24 h-24 text-primary" />
                    </div>
                    <div className="mt-8 text-center">
                        <h1 className="text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_30px_rgba(234,42,51,0.8)]">
                            {type === 'SOLD' ? 'SOLD!' : type === 'UNSOLD' ? 'UNSOLD' : type === 'CLOSING' ? 'FINAL CALL' : 'AUCTION OPEN'}
                        </h1>
                        <p className="text-primary font-black uppercase tracking-[0.5em] mt-2 animate-bounce">
                            {type === 'SOLD' ? 'New Legend Acquired' : type === 'UNSOLD' ? 'Moving to Next Asset' : type === 'CLOSING' ? 'Hammer About to Fall!' : 'Let the Bidding Begin'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HammerEffects;
