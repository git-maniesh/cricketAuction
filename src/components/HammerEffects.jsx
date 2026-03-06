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
            className="fixed bottom-10 right-10 z-[300] flex items-center justify-center pointer-events-none opacity-0"
        >
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/40 rounded-full blur-[20px] animate-pulse" />

                <div ref={hammerRef} className="relative z-10 flex flex-row items-center gap-4 bg-surface-dark/90 backdrop-blur-md p-4 pr-8 rounded-3xl border border-primary/50 shadow-[0_0_50px_rgba(234,42,51,0.5)]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/50 border-2 border-primary rounded-2xl flex items-center justify-center shadow-inner">
                        <Gavel className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_15px_rgba(234,42,51,0.8)]">
                            {type === 'SOLD' ? 'SOLD!' : type === 'UNSOLD' ? 'UNSOLD' : type === 'CLOSING' ? 'FINAL CALL' : 'ACTION!'}
                        </h1>
                        <p className="text-primary font-black uppercase tracking-[0.2em] mt-1 text-[8px] sm:text-[10px] animate-pulse">
                            {type === 'SOLD' ? 'Acquired' : type === 'UNSOLD' ? 'Next Asset' : type === 'CLOSING' ? 'Hammer Falling' : 'Open'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HammerEffects;
